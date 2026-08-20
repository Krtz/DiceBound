#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,os,shutil,subprocess,sys,zipfile
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'tools'))
from dicebound_version import windows_file_version
ROOT=Path(__file__).resolve().parents[1]
CFG=json.loads((ROOT/'config/project.json').read_text(encoding='utf-8'))
DIST=ROOT/CFG['browserOutput']
RELEASE=ROOT/CFG.get('releaseOutput','release')
LAUNCHER=ROOT/'launcher'/'windows'
NATIVE=ROOT/'wrappers'/'webview2'/'native-go'
ICON=ROOT/'assets'/'ui'/'icon'/'dicebound-launcher.ico'
OFFICIAL_LOADER=ROOT/'vendor'/'webview2'/'x64'/'WebView2Loader.dll'
STAGED_LOADER=NATIVE/'webview2loader.dll.bin'

def sha256(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def make_payload(path):
    if path.exists(): path.unlink()
    with zipfile.ZipFile(path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for src in sorted(p for p in DIST.rglob('*') if p.is_file()):
            rel=src.relative_to(DIST).as_posix()
            zi=zipfile.ZipInfo(rel,date_time=(1980,1,1,0,0,0));zi.compress_type=zipfile.ZIP_DEFLATED;zi.create_system=3;zi.external_attr=(0o644&0xffff)<<16
            z.writestr(zi,src.read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)

def version4(v): return windows_file_version(v)

def verify_metadata(exe):
    b=Path(exe).read_bytes()
    needles=['Dicebound','FileVersion',version4(CFG['version']),'ProductVersion',f"{CFG.get('channel','Beta')} {CFG['version']}"]
    missing=[]
    for text in needles:
        if text.encode('utf-16le') not in b: missing.append(text)
    if missing: raise SystemExit('Launcher VERSIONINFO verification failed: '+', '.join(missing))
    if b'.rsrc\x00\x00\x00' not in b: raise SystemExit('Launcher resource section missing')

if not DIST.exists() or not (DIST/'index.html').exists(): raise SystemExit('Build dist/browser before building the launcher.')
if not shutil.which('go'): raise SystemExit('Launcher build requires Go.')
RELEASE.mkdir(parents=True,exist_ok=True)
slug=str(CFG['version']).replace('.','_')
out=RELEASE/f"Dicebound_{CFG.get('channel','Beta').replace(' ','_')}_{slug}.exe"
raw=RELEASE/f".{out.stem}.raw.exe"
payload=NATIVE/'payload.zip'
make_payload(payload)
# Preferred production path: stage Microsoft's signed x64 WebView2Loader.dll
# from the official Microsoft.Web.WebView2 SDK. The build also accepts an
# explicit WEBVIEW2_LOADER_DLL for CI/local packaging. If unavailable, stage
# an empty embed target and the wrapper uses its isolated compatibility fallback.
loader_override=os.environ.get('WEBVIEW2_LOADER_DLL','').strip()
loader_source=Path(loader_override) if loader_override else OFFICIAL_LOADER
if loader_source.exists() and loader_source.is_file():
    shutil.copy2(loader_source,STAGED_LOADER)
    loader_mode='official-loader-embedded'
else:
    STAGED_LOADER.write_bytes(b'')
    loader_mode='compatibility-fallback'
env=os.environ.copy();env.update({'GOOS':'windows','GOARCH':'amd64','GO111MODULE':'off'})
try:
    subprocess.run(['go','build','-buildvcs=false','-trimpath','-o',str(raw),'-ldflags=-H=windowsgui -s -w -buildid=','main.go'],cwd=NATIVE,env=env,check=True)
    product=f"{CFG.get('channel','Beta')} {CFG['version']}"
    subprocess.run([sys.executable,str(LAUNCHER/'embed_icon.py'),str(raw),str(ICON),str(out),'--file-version',version4(CFG['version']),'--product-version',product,'--original-filename',out.name],cwd=ROOT,check=True)
    verify_metadata(out)
    data=out.read_bytes()
    for marker in [b'dicebound-native-webview2',b'Dicebound.save.json',b'CreateCoreWebView2EnvironmentWithOptions',b'compatibility-fallback']:
        if marker not in data: raise SystemExit(f'Native WebView2 wrapper marker missing: {marker!r}')
finally:
    if raw.exists(): raw.unlink()
    if payload.exists(): payload.unlink()
    if STAGED_LOADER.exists(): STAGED_LOADER.unlink()
print(json.dumps({'exe':out.name,'sha256':sha256(out),'bytes':out.stat().st_size,'fileVersion':version4(CFG['version']),'productVersion':f"{CFG.get('channel','Beta')} {CFG['version']}",'webView2LoaderMode':loader_mode,'webView2LoaderSource':str(loader_source) if loader_mode=='official-loader-embedded' else None},indent=2))
