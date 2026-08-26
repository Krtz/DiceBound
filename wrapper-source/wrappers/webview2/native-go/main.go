//go:build windows

package main

import (
    "archive/zip"
    "bytes"
    "context"
    "crypto/sha256"
    _ "embed"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "io"
    "net"
    "net/http"
    "net/url"
    "os"
    "os/exec"
    "path/filepath"
    "runtime"
    "sort"
    "strconv"
    "strings"
    "sync"
    "syscall"
    "time"
    "unsafe"
)

// payload.zip is generated from dist/browser by tools/build_launcher.py.
// The wrapper never patches files after the build: it serves this exact payload.
//go:embed payload.zip
var payload []byte

// tools/build_launcher.py stages the official Microsoft x64 WebView2Loader.dll
// here when the signed SDK artifact is available to the build environment.
// An empty staged file keeps local/offline compatibility builds possible.
//go:embed webview2loader.dll.bin
var packagedWebView2Loader []byte

const (
    appTitle       = "Dicebound: Beta v0.6.4.6"
    className      = "DiceboundNativeWebView2Window"
    mutexName      = `Local\Dicebound_Beta_Native_Single_Instance`
    runtimeGUID    = `{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}`

    wmDestroy      = 0x0002
    wmSize         = 0x0005
    wmClose        = 0x0010
    wmExitSizeMove = 0x0232
    wmDpiChanged   = 0x02E0

    wsOverlappedWindow = 0x00CF0000
    wsVisible          = 0x10000000
    cwUseDefault       = 0x80000000
    swShow             = 5
    swRestore          = 9
    swMaximize         = 3
    errorAlreadyExists = 183
    loadWithAlteredSearchPath = 0x00000008
    coinitApartmentThreaded   = 0x2
    rrfRtRegSz                = 0x00000002
)

type point struct{ X, Y int32 }
type rect struct{ Left, Top, Right, Bottom int32 }
type msg struct {
    Hwnd uintptr
    Message uint32
    _pad uint32
    WParam uintptr
    LParam uintptr
    Time uint32
    Pt point
    LPrivate uint32
}
type wndClassEx struct {
    CbSize uint32
    Style uint32
    LpfnWndProc uintptr
    CbClsExtra int32
    CbWndExtra int32
    HInstance uintptr
    HIcon uintptr
    HCursor uintptr
    HbrBackground uintptr
    LpszMenuName *uint16
    LpszClassName *uint16
    HIconSm uintptr
}
type windowPlacement struct {
    Length uint32
    Flags uint32
    ShowCmd uint32
    PtMinPosition point
    PtMaxPosition point
    RcNormalPosition rect
}
type savedWindowState struct {
    X int `json:"x"`
    Y int `json:"y"`
    Width int `json:"width"`
    Height int `json:"height"`
    Maximized bool `json:"maximized"`
}

type callbackVTable struct{ QueryInterface, AddRef, Release, Invoke uintptr }
type callbackObject struct{ VTable *callbackVTable }

var (
    user32 = syscall.NewLazyDLL("user32.dll")
    kernel32 = syscall.NewLazyDLL("kernel32.dll")
    advapi32 = syscall.NewLazyDLL("advapi32.dll")
    ole32 = syscall.NewLazyDLL("ole32.dll")
    gdi32 = syscall.NewLazyDLL("gdi32.dll")

    procRegisterClassExW = user32.NewProc("RegisterClassExW")
    procCreateWindowExW = user32.NewProc("CreateWindowExW")
    procDefWindowProcW = user32.NewProc("DefWindowProcW")
    procDestroyWindow = user32.NewProc("DestroyWindow")
    procGetMessageW = user32.NewProc("GetMessageW")
    procTranslateMessage = user32.NewProc("TranslateMessage")
    procDispatchMessageW = user32.NewProc("DispatchMessageW")
    procPostQuitMessage = user32.NewProc("PostQuitMessage")
    procPostMessageW = user32.NewProc("PostMessageW")
    procShowWindow = user32.NewProc("ShowWindow")
    procUpdateWindow = user32.NewProc("UpdateWindow")
    procSetForegroundWindow = user32.NewProc("SetForegroundWindow")
    procFindWindowW = user32.NewProc("FindWindowW")
    procGetClientRect = user32.NewProc("GetClientRect")
    procGetWindowPlacement = user32.NewProc("GetWindowPlacement")
    procLoadCursorW = user32.NewProc("LoadCursorW")
    procLoadIconW = user32.NewProc("LoadIconW")
    procMessageBoxW = user32.NewProc("MessageBoxW")

    procGetModuleHandleW = kernel32.NewProc("GetModuleHandleW")
    procCreateMutexW = kernel32.NewProc("CreateMutexW")
    procCloseHandle = kernel32.NewProc("CloseHandle")
    procLoadLibraryExW = kernel32.NewProc("LoadLibraryExW")
    procGetProcAddress = kernel32.NewProc("GetProcAddress")

    procRegGetValueW = advapi32.NewProc("RegGetValueW")
    procCoInitializeEx = ole32.NewProc("CoInitializeEx")
    procCoUninitialize = ole32.NewProc("CoUninitialize")
    procCreateSolidBrush = gdi32.NewProc("CreateSolidBrush")
)

var (
    hwnd uintptr
    controller uintptr
    coreWebView uintptr
    windowFile string
    logPath string
    appServer *http.Server
    serverBase string
    initURL string
    initFailure string
    nativeLogMu sync.Mutex
    frontendReady = make(chan bool,1)
    repairAttempted bool
    runtimeCacheDir string
    dataRoot string
)

func utf16(s string) *uint16 { p, _ := syscall.UTF16PtrFromString(s); return p }

func logf(format string, args ...any) {
    if logPath == "" { return }
    nativeLogMu.Lock(); defer nativeLogMu.Unlock()
    _ = os.MkdirAll(filepath.Dir(logPath), 0755)
    f, err := os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644); if err != nil { return }
    defer f.Close()
    _, _ = fmt.Fprintf(f, "%s  %s\n", time.Now().Format("2006-01-02 15:04:05.000"), fmt.Sprintf(format,args...))
}

func messageBox(title, text string) {
    procMessageBoxW.Call(0, uintptr(unsafe.Pointer(utf16(text))), uintptr(unsafe.Pointer(utf16(title))), 0x10)
}
func fatal(err error) { logf("FATAL: %v",err); messageBox(appTitle, err.Error()+"\n\nNative wrapper log:\n"+logPath); os.Exit(1) }

func payloadHash() string { h:=sha256.Sum256(payload); return hex.EncodeToString(h[:]) }
func extractPayload(dest string) error {
    if err:=os.MkdirAll(dest,0755);err!=nil{return err}
    zr,err:=zip.NewReader(bytes.NewReader(payload),int64(len(payload)));if err!=nil{return err}
    for _,f:=range zr.File{
        clean:=filepath.Clean(filepath.FromSlash(f.Name));if clean=="."||filepath.IsAbs(clean)||strings.HasPrefix(clean,"..") {continue}
        out:=filepath.Join(dest,clean);rel,err:=filepath.Rel(dest,out);if err!=nil||strings.HasPrefix(rel,"..") {continue}
        if f.FileInfo().IsDir(){if err:=os.MkdirAll(out,0755);err!=nil{return err};continue}
        if err:=os.MkdirAll(filepath.Dir(out),0755);err!=nil{return err}
        src,err:=f.Open();if err!=nil{return err};dst,err:=os.OpenFile(out,os.O_CREATE|os.O_TRUNC|os.O_WRONLY,0644);if err!=nil{src.Close();return err}
        _,copyErr:=io.Copy(dst,src);closeErr:=dst.Close();src.Close();if copyErr!=nil{return copyErr};if closeErr!=nil{return closeErr}
    }
    return nil
}
func preparePayload(gameDir string) error {
    hash:=payloadHash();marker:=filepath.Join(gameDir,".payload-sha256")
    if b,err:=os.ReadFile(marker);err==nil&&strings.TrimSpace(string(b))==hash{if st,err:=os.Stat(filepath.Join(gameDir,"index.html"));err==nil&&!st.IsDir(){return nil}}
    tmp:=gameDir+".new";old:=gameDir+".old";_ = os.RemoveAll(tmp);_ = os.RemoveAll(old)
    if err:=extractPayload(tmp);err!=nil{return err};if _,err:=os.Stat(filepath.Join(tmp,"index.html"));err!=nil{return fmt.Errorf("embedded browser payload is missing index.html: %w",err)}
    if err:=os.WriteFile(filepath.Join(tmp,".payload-sha256"),[]byte(hash+"\n"),0644);err!=nil{return err}
    if _,err:=os.Stat(gameDir);err==nil{if err:=os.Rename(gameDir,old);err!=nil{return err}}
    if err:=os.Rename(tmp,gameDir);err!=nil{_ = os.Rename(old,gameDir);return err};_ = os.RemoveAll(old);return nil
}

func createSingleInstance() (uintptr,bool,error){
    h,_,e:=procCreateMutexW.Call(0,0,uintptr(unsafe.Pointer(utf16(mutexName))));if h==0{return 0,false,e}
    return h,e==syscall.Errno(errorAlreadyExists),nil
}
func focusExisting(){c:=utf16(className);w,_,_:=procFindWindowW.Call(uintptr(unsafe.Pointer(c)),0);if w!=0{procShowWindow.Call(w,swRestore);procSetForegroundWindow.Call(w)}}

func appDataDir() string { if p:=os.Getenv("LOCALAPPDATA");p!=""{return filepath.Join(p,"Dicebound")};if p,err:=os.UserCacheDir();err==nil{return filepath.Join(p,"Dicebound")};return filepath.Join(os.TempDir(),"Dicebound") }
func loadWindowState(path string)(savedWindowState,bool){var s savedWindowState;b,err:=os.ReadFile(path);if err!=nil||json.Unmarshal(b,&s)!=nil{return s,false};if s.Width<760||s.Height<520||s.Width>10000||s.Height>10000{return s,false};return s,true}
func saveWindowPlacement(){
    if hwnd==0||windowFile==""{return};wp:=windowPlacement{Length:uint32(unsafe.Sizeof(windowPlacement{}))};ok,_,_:=procGetWindowPlacement.Call(hwnd,uintptr(unsafe.Pointer(&wp)));if ok==0{return}
    r:=wp.RcNormalPosition;s:=savedWindowState{X:int(r.Left),Y:int(r.Top),Width:int(r.Right-r.Left),Height:int(r.Bottom-r.Top),Maximized:wp.ShowCmd==swMaximize};if s.Width<760||s.Height<520{return}
    _=os.MkdirAll(filepath.Dir(windowFile),0755);b,_:=json.MarshalIndent(s,"","  ");_ = os.WriteFile(windowFile,append(b,'\n'),0644)
}

func safeKeyFile(saveDir,key string) string {
    switch key {
    case "dicebound.save.primary": return filepath.Join(saveDir,"Dicebound.save.json")
    case "dicebound.save.backup": return filepath.Join(saveDir,"Dicebound.save.backup.1.json")
    case "dicebound.save.backup.2": return filepath.Join(saveDir,"Dicebound.save.backup.2.json")
    case "dicebound.save.backup.3": return filepath.Join(saveDir,"Dicebound.save.backup.3.json")
    case "dicebound.save.backup.4": return filepath.Join(saveDir,"Dicebound.save.backup.4.json")
    case "dicebound.save.backup.5": return filepath.Join(saveDir,"Dicebound.save.backup.5.json")
    case "dicebound.run.primary": return filepath.Join(saveDir,"Dicebound.run.json")
    case "dicebound.run.backup": return filepath.Join(saveDir,"Dicebound.run.backup.1.json")
    case "dicebound.run.backup.2": return filepath.Join(saveDir,"Dicebound.run.backup.2.json")
    case "dicebound.run.backup.3": return filepath.Join(saveDir,"Dicebound.run.backup.3.json")
    }
    var b strings.Builder;for _,r:=range key{if r>='a'&&r<='z'||r>='A'&&r<='Z'||r>='0'&&r<='9'||r=='.'||r=='-'||r=='_'{b.WriteRune(r)}else{b.WriteByte('_')}}
    return filepath.Join(saveDir,"storage",b.String()+".txt")
}
func allStorageKeys(saveDir string) []string {
    known:=[]string{"dicebound.save.primary","dicebound.save.backup","dicebound.save.backup.2","dicebound.save.backup.3","dicebound.save.backup.4","dicebound.save.backup.5","dicebound.run.primary","dicebound.run.backup","dicebound.run.backup.2","dicebound.run.backup.3"};out:=[]string{}
    for _,k:=range known{if st,err:=os.Stat(safeKeyFile(saveDir,k));err==nil&&!st.IsDir(){out=append(out,k)}};sort.Strings(out);return out
}
func writeAtomic(path string,data []byte) error { if err:=os.MkdirAll(filepath.Dir(path),0755);err!=nil{return err};tmp:=path+".tmp";if err:=os.WriteFile(tmp,data,0644);err!=nil{return err};return os.Rename(tmp,path) }
func openFolder(path string) error { if err:=os.MkdirAll(path,0755);err!=nil{return err};return exec.Command("explorer.exe",path).Start() }

func requestRuntimeRepair(reason string){
    logf("Runtime repair requested: %s (alreadyAttempted=%v)",reason,repairAttempted)
    if repairAttempted { messageBox("Dicebound runtime repair", "Automatic repair was already attempted once. Your saves are preserved in %LOCALAPPDATA%\\Dicebound\\saves.\n\nSee log:\n"+logPath); return }
    _ = os.RemoveAll(runtimeCacheDir)
    exe,err:=os.Executable();if err!=nil{logf("repair executable lookup failed: %v",err);return}
    cmdLine:=fmt.Sprintf(`timeout /t 2 /nobreak >nul & start "" "%s" --repair-attempted`, strings.ReplaceAll(exe,`"`,`""`))
    if err:=exec.Command("cmd.exe","/C",cmdLine).Start();err!=nil{logf("repair relaunch failed: %v",err);return}
    logf("Runtime cache removed and delayed relaunch scheduled; saves were not touched.")
    go func(){time.Sleep(250*time.Millisecond);if hwnd!=0{procPostMessageW.Call(hwnd,wmClose,0,0)}}()
}
func watchFrontendReady(){
    select{
    case <-frontendReady: logf("Frontend ready handshake received for Beta 0.6.4.6.")
    case <-time.After(12*time.Second): requestRuntimeRepair("frontend did not initialize within 12 seconds")
    }
}

func startServer(gameDir,saveDir string)(string,error){
    mux:=http.NewServeMux()
    mux.HandleFunc("/__dicebound/health",func(w http.ResponseWriter,r *http.Request){w.Header().Set("Content-Type","text/plain");_,_=io.WriteString(w,"dicebound-native-webview2")})
    mux.HandleFunc("/__dicebound/storage/get",func(w http.ResponseWriter,r *http.Request){key:=r.URL.Query().Get("key");b,err:=os.ReadFile(safeKeyFile(saveDir,key));if os.IsNotExist(err){http.NotFound(w,r);return};if err!=nil{http.Error(w,err.Error(),500);return};w.Header().Set("Content-Type","text/plain; charset=utf-8");_,_=w.Write(b)})
    mux.HandleFunc("/__dicebound/storage/set",func(w http.ResponseWriter,r *http.Request){if r.Method!="POST"{http.Error(w,"POST required",405);return};key:=r.URL.Query().Get("key");b,err:=io.ReadAll(io.LimitReader(r.Body,64<<20));if err!=nil||key==""{http.Error(w,"bad storage request",400);return};if err:=writeAtomic(safeKeyFile(saveDir,key),b);err!=nil{http.Error(w,err.Error(),500);return};_,_=io.WriteString(w,"ok")})
    mux.HandleFunc("/__dicebound/storage/remove",func(w http.ResponseWriter,r *http.Request){if r.Method!="POST"{http.Error(w,"POST required",405);return};_ = os.Remove(safeKeyFile(saveDir,r.URL.Query().Get("key")));_,_=io.WriteString(w,"ok")})
    mux.HandleFunc("/__dicebound/storage/keys",func(w http.ResponseWriter,r *http.Request){w.Header().Set("Content-Type","application/json");_ = json.NewEncoder(w).Encode(allStorageKeys(saveDir))})
    mux.HandleFunc("/__dicebound/platform/open-save-folder",func(w http.ResponseWriter,r *http.Request){if err:=openFolder(saveDir);err!=nil{http.Error(w,err.Error(),500);return};_,_=io.WriteString(w,"ok")})
    mux.HandleFunc("/__dicebound/platform/open-app-data-folder",func(w http.ResponseWriter,r *http.Request){if err:=openFolder(dataRoot);err!=nil{http.Error(w,err.Error(),500);return};_,_=io.WriteString(w,"ok")})
    mux.HandleFunc("/__dicebound/platform/ready",func(w http.ResponseWriter,r *http.Request){b,_:=io.ReadAll(io.LimitReader(r.Body,32<<10));logf("Frontend ready payload: %s",strings.TrimSpace(string(b)));select{case frontendReady<-true:default:};_,_=io.WriteString(w,"ok")})
    mux.HandleFunc("/__dicebound/platform/repair-runtime",func(w http.ResponseWriter,r *http.Request){_,_=io.WriteString(w,"ok");go requestRuntimeRepair("manual repair requested from Options")})
    mux.HandleFunc("/__dicebound/platform/quit",func(w http.ResponseWriter,r *http.Request){_,_=io.WriteString(w,"ok");if hwnd!=0{procPostMessageW.Call(hwnd,wmClose,0,0)}})
    mux.HandleFunc("/__dicebound/platform/open-external",func(w http.ResponseWriter,r *http.Request){b,_:=io.ReadAll(io.LimitReader(r.Body,4096));u:=strings.TrimSpace(string(b));parsed,err:=url.Parse(u);if err!=nil||(parsed.Scheme!="http"&&parsed.Scheme!="https"){http.Error(w,"only http/https URLs allowed",400);return};if err:=exec.Command("rundll32.exe","url.dll,FileProtocolHandler",u).Start();err!=nil{http.Error(w,err.Error(),500);return};_,_=io.WriteString(w,"ok")})
    mux.HandleFunc("/__dicebound/platform/log",func(w http.ResponseWriter,r *http.Request){b,_:=io.ReadAll(io.LimitReader(r.Body,64<<10));logf("WEB: %s",strings.TrimSpace(string(b)));_,_=io.WriteString(w,"ok")})
    mux.Handle("/",http.FileServer(http.Dir(gameDir)))
    ln,err:=net.Listen("tcp","127.0.0.1:0");if err!=nil{return "",err};appServer=&http.Server{Handler:mux,ReadHeaderTimeout:5*time.Second};go func(){if err:=appServer.Serve(ln);err!=nil&&err!=http.ErrServerClosed{logf("HTTP server: %v",err)}}();return "http://"+ln.Addr().String(),nil
}

func regString(root uintptr,sub,value string)(string,error){
    sp,vp:=utf16(sub),utf16(value);var typ uint32;var size uint32
    rc,_,_:=procRegGetValueW.Call(root,uintptr(unsafe.Pointer(sp)),uintptr(unsafe.Pointer(vp)),rrfRtRegSz,uintptr(unsafe.Pointer(&typ)),0,uintptr(unsafe.Pointer(&size)));if rc!=0{return "",syscall.Errno(rc)}
    buf:=make([]uint16,(size+1)/2);rc,_,_ = procRegGetValueW.Call(root,uintptr(unsafe.Pointer(sp)),uintptr(unsafe.Pointer(vp)),rrfRtRegSz,uintptr(unsafe.Pointer(&typ)),uintptr(unsafe.Pointer(&buf[0])),uintptr(unsafe.Pointer(&size)));if rc!=0{return "",syscall.Errno(rc)}
    return syscall.UTF16ToString(buf),nil
}
func runtimeDLLPath()(string,error){
    roots:=[]uintptr{0x80000002,0x80000001};keys:=[]string{`SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\ClientState\`+runtimeGUID,`SOFTWARE\Microsoft\EdgeUpdate\ClientState\`+runtimeGUID}
    for _,root:=range roots{for _,k:=range keys{if p,err:=regString(root,k,"EBWebView");err==nil&&p!=""{dll:=filepath.Join(p,"EBWebView","x64","EmbeddedBrowserWebView.dll");if _,err:=os.Stat(dll);err==nil{return dll,nil}}}}
    clientKeys:=[]string{`SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\`+runtimeGUID,`SOFTWARE\Microsoft\EdgeUpdate\Clients\`+runtimeGUID}
    for _,root:=range roots{for _,k:=range clientKeys{loc,e1:=regString(root,k,"location");ver,e2:=regString(root,k,"pv");if e1==nil&&e2==nil&&loc!=""&&ver!=""{dll:=filepath.Join(loc,ver,"EBWebView","x64","EmbeddedBrowserWebView.dll");if _,err:=os.Stat(dll);err==nil{return dll,nil}}}}
    bases:=[]string{filepath.Join(os.Getenv("ProgramFiles(x86)"),"Microsoft","EdgeWebView","Application"),filepath.Join(os.Getenv("ProgramFiles"),"Microsoft","EdgeWebView","Application")}
    for _,base:=range bases{ents,err:=os.ReadDir(base);if err!=nil{continue};names:=[]string{};for _,e:=range ents{if e.IsDir(){names=append(names,e.Name())}};sort.Sort(sort.Reverse(sort.StringSlice(names)));for _,n:=range names{dll:=filepath.Join(base,n,"EBWebView","x64","EmbeddedBrowserWebView.dll");if _,err:=os.Stat(dll);err==nil{return dll,nil}}}
    return "",fmt.Errorf("Microsoft Edge WebView2 Runtime was not found. Install the Evergreen WebView2 Runtime and launch Dicebound again")
}

func comMethod(obj uintptr,index int) uintptr { if obj==0{return 0};vt:=*(*uintptr)(unsafe.Pointer(obj));return *(*uintptr)(unsafe.Pointer(vt+uintptr(index)*unsafe.Sizeof(uintptr(0)))) }
func comCall(obj uintptr,index int,args ...uintptr)(uintptr,uintptr,syscall.Errno){fn:=comMethod(obj,index);if fn==0{return ^uintptr(0),0,syscall.EINVAL};all:=make([]uintptr,0,len(args)+1);all=append(all,obj);all=append(all,args...);return syscall.SyscallN(fn,all...)}
func hresultFailed(v uintptr) bool { return int32(v)<0 }
func updateWebViewBounds(){if controller==0||hwnd==0{return};var r rect;ok,_,_:=procGetClientRect.Call(hwnd,uintptr(unsafe.Pointer(&r)));if ok==0{return};_,_,_ = comCall(controller,6,uintptr(unsafe.Pointer(&r)))}

func qi(this,riid,out uintptr) uintptr { if out!=0{*(*uintptr)(unsafe.Pointer(out))=this};return 0 }
func addRef(this uintptr) uintptr { return 1 }
func release(this uintptr) uintptr { return 1 }
func envInvoke(this,hr,environment uintptr) uintptr {
    if hresultFailed(hr)||environment==0{initFailure=fmt.Sprintf("WebView2 environment creation failed: 0x%08X",uint32(hr));logf(initFailure);return hr}
    // ICoreWebView2Environment::CreateCoreWebView2Controller is vtable slot 3.
    r,_,_:=comCall(environment,3,hwnd,uintptr(unsafe.Pointer(&controllerCallback)));if hresultFailed(r){initFailure=fmt.Sprintf("WebView2 controller creation failed: 0x%08X",uint32(r));logf(initFailure)};return 0
}
func controllerInvoke(this,hr,created uintptr) uintptr {
    if hresultFailed(hr)||created==0{initFailure=fmt.Sprintf("WebView2 controller callback failed: 0x%08X",uint32(hr));logf(initFailure);return hr}
    controller=created;_,_,_=comCall(controller,1) // AddRef because the wrapper owns this controller.
    updateWebViewBounds()
    var wv uintptr;r,_,_:=comCall(controller,25,uintptr(unsafe.Pointer(&wv)));if hresultFailed(r)||wv==0{initFailure="WebView2 get_CoreWebView2 failed";logf(initFailure);return r};coreWebView=wv
    // Disable the browser-style right-click menu while retaining DevTools shortcuts.
    var settings uintptr;if rr,_,_:=comCall(coreWebView,3,uintptr(unsafe.Pointer(&settings)));!hresultFailed(rr)&&settings!=0{_,_,_=comCall(settings,14,0);_,_,_=comCall(settings,2)}
    nav:=utf16(initURL);r,_,_=comCall(coreWebView,5,uintptr(unsafe.Pointer(nav)));if hresultFailed(r){initFailure=fmt.Sprintf("WebView2 Navigate failed: 0x%08X",uint32(r));logf(initFailure)}else{logf("Native WebView2 navigated to %s",initURL)}
    return r
}

var envVTable=callbackVTable{QueryInterface:syscall.NewCallback(qi),AddRef:syscall.NewCallback(addRef),Release:syscall.NewCallback(release),Invoke:syscall.NewCallback(envInvoke)}
var controllerVTable=callbackVTable{QueryInterface:syscall.NewCallback(qi),AddRef:syscall.NewCallback(addRef),Release:syscall.NewCallback(release),Invoke:syscall.NewCallback(controllerInvoke)}
var environmentCallback=callbackObject{VTable:&envVTable}
var controllerCallback=callbackObject{VTable:&controllerVTable}

func windowProc(h uintptr,m uint32,w,l uintptr) uintptr {
    switch m{
    case wmSize: updateWebViewBounds();return 0
    case wmExitSizeMove: saveWindowPlacement();updateWebViewBounds();return 0
    case wmDpiChanged: updateWebViewBounds()
    case wmClose:
        saveWindowPlacement();if controller!=0{_,_,_=comCall(controller,24);_,_,_=comCall(controller,2);controller=0};procDestroyWindow.Call(h);return 0
    case wmDestroy: procPostQuitMessage.Call(0);return 0
    }
    r,_,_:=procDefWindowProcW.Call(h,uintptr(m),w,l);return r
}
var windowProcPtr=syscall.NewCallback(windowProc)

func createNativeWindow(state savedWindowState,hasState bool)(uintptr,error){
    hinst,_,_:=procGetModuleHandleW.Call(0);cursor,_,_:=procLoadCursorW.Call(0,32512);icon,_,_:=procLoadIconW.Call(hinst,1);brush,_,_:=procCreateSolidBrush.Call(0x000000)
    cn:=utf16(className);wc:=wndClassEx{CbSize:uint32(unsafe.Sizeof(wndClassEx{})),LpfnWndProc:windowProcPtr,HInstance:hinst,HIcon:icon,HCursor:cursor,HbrBackground:brush,LpszClassName:cn,HIconSm:icon}
    atom,_,e:=procRegisterClassExW.Call(uintptr(unsafe.Pointer(&wc)));if atom==0{return 0,fmt.Errorf("RegisterClassExW failed: %v",e)}
    x,y,w,h:=int32(100),int32(70),int32(1280),int32(820);if hasState{x=int32(state.X);y=int32(state.Y);w=int32(state.Width);h=int32(state.Height)}
    out,_,e:=procCreateWindowExW.Call(0,uintptr(unsafe.Pointer(cn)),uintptr(unsafe.Pointer(utf16(appTitle))),wsOverlappedWindow|wsVisible,uintptr(x),uintptr(y),uintptr(w),uintptr(h),0,0,hinst,0);if out==0{return 0,fmt.Errorf("CreateWindowExW failed: %v",e)}
    if hasState&&state.Maximized{procShowWindow.Call(out,swMaximize)}else{procShowWindow.Call(out,swShow)};procUpdateWindow.Call(out);return out,nil
}

func loadProcFromDLL(dllPath, procName string)(uintptr,error){
    h,_,e:=procLoadLibraryExW.Call(uintptr(unsafe.Pointer(utf16(dllPath))),0,loadWithAlteredSearchPath)
    if h==0{return 0,fmt.Errorf("could not load %s: %v",dllPath,e)}
    name:=append([]byte(procName),0)
    proc,_,_:=procGetProcAddress.Call(h,uintptr(unsafe.Pointer(&name[0])))
    if proc==0{return 0,fmt.Errorf("%s does not export %s",dllPath,procName)}
    return proc,nil
}

func stagedOfficialLoaderPath(dataDir string)(string,bool,error){
    // Explicit override is useful for local SDK testing and CI.
    if p:=strings.TrimSpace(os.Getenv("DICEBOUND_WEBVIEW2_LOADER"));p!=""{
        if st,err:=os.Stat(p);err==nil&&!st.IsDir(){return p,true,nil}
    }
    // Allow Microsoft's architecture-matched SDK loader beside the EXE.
    if exe,err:=os.Executable();err==nil{
        p:=filepath.Join(filepath.Dir(exe),"WebView2Loader.dll")
        if st,err:=os.Stat(p);err==nil&&!st.IsDir(){return p,true,nil}
    }
    // Preferred release path: tools/build_launcher.py embeds the signed x64
    // WebView2Loader.dll from Microsoft.Web.WebView2 into the Dicebound EXE.
    if len(packagedWebView2Loader)>=1024&&bytes.HasPrefix(packagedWebView2Loader,[]byte{'M','Z'}){
        dir:=filepath.Join(dataDir,"wrapper")
        if err:=os.MkdirAll(dir,0755);err!=nil{return "",false,err}
        p:=filepath.Join(dir,"WebView2Loader.dll")
        want:=sha256.Sum256(packagedWebView2Loader)
        currentOK:=false
        if existing,err:=os.ReadFile(p);err==nil{got:=sha256.Sum256(existing);currentOK=got==want}
        if !currentOK{if err:=writeAtomic(p,packagedWebView2Loader);err!=nil{return "",false,err}}
        return p,true,nil
    }
    return "",false,nil
}

func bootstrapWithPublicLoader(loaderPath,userDataDir string) error {
    proc,err:=loadProcFromDLL(loaderPath,"CreateCoreWebView2EnvironmentWithOptions")
    if err!=nil{return err}
    _=os.MkdirAll(userDataDir,0755);udf:=utf16(userDataDir)
    hr,_,_:=syscall.SyscallN(proc,0,uintptr(unsafe.Pointer(udf)),0,uintptr(unsafe.Pointer(&environmentCallback)))
    if hresultFailed(hr){return fmt.Errorf("CreateCoreWebView2EnvironmentWithOptions failed: 0x%08X",uint32(hr))}
    logf("WebView2 bootstrap mode=official-loader path=%s",loaderPath)
    return nil
}

func bootstrapWithCompatibilityFallback(userDataDir string) error {
    // Compatibility-only path for offline developer builds where the signed
    // Microsoft SDK loader could not be staged. Keep this isolated here so it
    // can disappear completely once every release environment vendors the SDK.
    dllPath,err:=runtimeDLLPath();if err!=nil{return err};logf("WebView2 bootstrap mode=compatibility-fallback runtime=%s",dllPath)
    proc,err:=loadProcFromDLL(dllPath,"CreateWebViewEnvironmentWithOptionsInternal")
    if err!=nil{return err}
    _=os.MkdirAll(userDataDir,0755);udf:=utf16(userDataDir)
    hr,_,_:=syscall.SyscallN(proc,1,0,uintptr(unsafe.Pointer(udf)),0,uintptr(unsafe.Pointer(&environmentCallback)))
    if hresultFailed(hr){return fmt.Errorf("WebView2 compatibility bootstrap failed: 0x%08X",uint32(hr))}
    return nil
}

func initWebView2(dataDir,userDataDir string) error {
    if loader,ok,err:=stagedOfficialLoaderPath(dataDir);err!=nil{return err}else if ok{
        if err:=bootstrapWithPublicLoader(loader,userDataDir);err==nil{return nil}else{logf("Official WebView2Loader failed, using compatibility fallback: %v",err)}
    }else{
        logf("Official WebView2Loader was not staged in this build; using isolated compatibility fallback")
    }
    return bootstrapWithCompatibilityFallback(userDataDir)
}

func main(){
    runtime.LockOSThread();defer runtime.UnlockOSThread()
    dataDir:=appDataDir();dataRoot=dataDir;for _,a:=range os.Args[1:]{if a=="--repair-attempted"{repairAttempted=true}};logPath=filepath.Join(dataDir,"logs","native-wrapper.log");windowFile=filepath.Join(dataDir,"wrapper","window.json");saveDir:=filepath.Join(dataDir,"saves");runtimeCacheDir=filepath.Join(dataDir,"runtime-cache");buildKey:=payloadHash()[:16];gameDir:=filepath.Join(runtimeCacheDir,"payloads",buildKey);userDataDir:=filepath.Join(runtimeCacheDir,"webview2",buildKey);_ = os.MkdirAll(saveDir,0755);_ = os.MkdirAll(runtimeCacheDir,0755)
    logf("Starting Dicebound Beta 0.6.4.6 native WebView2 wrapper. payload=%s repairAttempted=%v",buildKey,repairAttempted);logf("data=%s saves=%s runtime-cache=%s game=%s webview2=%s",dataDir,saveDir,runtimeCacheDir,gameDir,userDataDir)
    if len(os.Args)>1&&(os.Args[1]=="--open-save-folder"||os.Args[1]=="--open-app-data"||os.Args[1]=="--open-data-folder"){target:=saveDir;if os.Args[1]!="--open-save-folder"{target=dataDir};if err:=openFolder(target);err!=nil{fatal(err)};return}
    mutex,already,err:=createSingleInstance();if err!=nil{fatal(err)};defer procCloseHandle.Call(mutex);if already{focusExisting();return}
    if err:=preparePayload(gameDir);err!=nil{fatal(fmt.Errorf("could not prepare exact dist/browser payload: %w",err))}
    base,err:=startServer(gameDir,saveDir);if err!=nil{fatal(fmt.Errorf("could not start local Dicebound host: %w",err))};serverBase=base;initURL=base+"/index.html?diceboundNative=1&v=0.6.4.6&build="+buildKey;logf("Serving exact browser payload at %s",base)
    if hr,_,_:=procCoInitializeEx.Call(0,coinitApartmentThreaded);hresultFailed(hr)&&uint32(hr)!=0x80010106{fatal(fmt.Errorf("CoInitializeEx failed: 0x%08X",uint32(hr)))}else{defer procCoUninitialize.Call()}
    state,ok:=loadWindowState(windowFile);var e error;hwnd,e=createNativeWindow(state,ok);if e!=nil{fatal(e)};if ok{logf("Restoring native window %dx%d at %d,%d maximized=%v",state.Width,state.Height,state.X,state.Y,state.Maximized)}
    if err:=initWebView2(runtimeCacheDir,userDataDir);err!=nil{fatal(err)}
    go watchFrontendReady()
    var m msg;for{r,_,_:=procGetMessageW.Call(uintptr(unsafe.Pointer(&m)),0,0,0);if int32(r)<=0{break};procTranslateMessage.Call(uintptr(unsafe.Pointer(&m)));procDispatchMessageW.Call(uintptr(unsafe.Pointer(&m)));if initFailure!=""{messageBox("Dicebound WebView2",initFailure);initFailure=""}}
    saveWindowPlacement();if appServer!=nil{ctx,cancel:=context.WithTimeout(context.Background(),time.Second);_ = appServer.Shutdown(ctx);cancel()};logf("Dicebound native window closed.")
}

// Keep strconv linked in deterministic Windows builds; it is also convenient
// when inspecting the binary during wrapper regression checks.
var _ = strconv.IntSize
