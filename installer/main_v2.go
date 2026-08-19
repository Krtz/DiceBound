//go:build windows

package main

import (
	"crypto/sha256"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

const manifestURL = "https://raw.githubusercontent.com/Krtz/DiceBound/main/distribution/latest.json"
const launcherName = "DiceBoundLauncher.exe"

//go:embed assets/dicebound-launcher-splash.jpg
var splash []byte

//go:embed hints.json
var hints []byte

//go:embed ui_splash.ps1
var splashPS []byte

//go:embed ui_config.ps1
var configPS []byte

type Manifest struct {
	Format                                       int `json:"format"`
	Name, Version, Channel, BuildID, URL, SHA256 string
	Bytes                                        int64  `json:"bytes"`
	Executable                                   string `json:"executable"`
}
type Config struct {
	Format     int    `json:"format"`
	InstallDir string `json:"installDir"`
	Desktop    bool   `json:"desktopShortcut"`
	StartMenu  bool   `json:"startMenuShortcut"`
}
type HintFile struct {
	Hints []string `json:"hints"`
}
type Splash struct {
	dir, status, version, done string
	cmd                        *exec.Cmd
}

var client = &http.Client{Timeout: 30 * time.Second}

func main() {
	s, _ := startSplash()
	if s != nil {
		defer s.close()
		s.set("Preparing the road...", "")
	}
	localRoot := strings.TrimSpace(os.Getenv("LOCALAPPDATA"))
	if localRoot == "" {
		must(s, errors.New("LOCALAPPDATA is not set"))
	}
	cfgPath := filepath.Join(localRoot, "DiceBoundLauncher", "launcher-config.json")
	_ = os.MkdirAll(filepath.Dir(cfgPath), 0755)
	cfg, err := readConfig(cfgPath)
	if err != nil || cfg.InstallDir == "" || hasArg("--configure") {
		d := filepath.Join(localRoot, "DiceBound")
		if cfg.InstallDir != "" {
			d = cfg.InstallDir
		}
		cfg, err = configure(d, cfg)
		if errors.Is(err, errCancel) {
			return
		}
		must(s, err)
		must(s, writeJSON(cfgPath, cfg))
	}
	cfg.InstallDir = filepath.Clean(cfg.InstallDir)
	must(s, os.MkdirAll(cfg.InstallDir, 0755))
	must(s, installSelf(cfg.InstallDir))
	statePath := filepath.Join(cfg.InstallDir, "installed.json")
	local, _ := readManifest(statePath)
	game := filepath.Join(cfg.InstallDir, "DiceBound.exe")
	exists := fileExists(game)
	if s != nil {
		s.set("Checking for updates...", label(local, exists))
	}
	remote, err := fetchManifest()
	if err != nil {
		if exists {
			if s != nil {
				s.set("GitHub is unavailable — starting the installed version.", label(local, true))
				time.Sleep(800 * time.Millisecond)
				s.close()
			}
			launch(game)
			return
		}
		must(s, fmt.Errorf("GitHub is unavailable and DiceBound is not installed yet: %w", err))
	}
	if remote.Executable == "" {
		remote.Executable = "DiceBound.exe"
	}
	game = filepath.Join(cfg.InstallDir, remote.Executable)
	exists = fileExists(game)
	need := !exists || local.BuildID != remote.BuildID || !strings.EqualFold(local.SHA256, remote.SHA256)
	if !need && remote.Bytes > 0 {
		st, e := os.Stat(game)
		need = e != nil || st.Size() != remote.Bytes
	}
	if need {
		verb := "Installing"
		if exists {
			verb = "Updating"
		}
		if s != nil {
			s.set(fmt.Sprintf("%s DiceBound %s %s...", verb, remote.Channel, remote.Version), "Available: "+remote.Channel+" "+remote.Version+" · "+short(remote.BuildID))
		}
		err = download(remote, game, func(p int) {
			if s != nil {
				s.set(fmt.Sprintf("%s DiceBound %s %s... %d%%", verb, remote.Channel, remote.Version, p), "")
			}
		})
		if err != nil {
			if exists && fileExists(game) {
				warn("DiceBound update", "Update failed safely. The previous installed version will be started.\n\n"+err.Error())
				if s != nil {
					s.set("Update failed safely — starting the previous working version.", label(local, true))
					time.Sleep(700 * time.Millisecond)
					s.close()
				}
				launch(game)
				return
			}
			must(s, err)
		}
		must(s, writeJSON(statePath, remote))
		local = remote
	}
	if s != nil {
		s.set("DiceBound is up to date.", label(local, true))
	}
	if err := shortcuts(cfg, game); err != nil {
		warn("DiceBound shortcuts", err.Error())
	}
	if s != nil {
		s.set("Launching DiceBound...", label(local, true))
		time.Sleep(500 * time.Millisecond)
		s.close()
	}
	launch(game)
}

var errCancel = errors.New("cancelled")

func hasArg(x string) bool {
	for _, a := range os.Args[1:] {
		if strings.EqualFold(a, x) {
			return true
		}
	}
	return false
}
func readConfig(p string) (Config, error) {
	var c Config
	b, e := os.ReadFile(p)
	if e == nil {
		e = json.Unmarshal(b, &c)
	}
	if e == nil && c.Format != 1 {
		e = errors.New("unsupported launcher config")
	}
	return c, e
}
func readManifest(p string) (Manifest, error) {
	var m Manifest
	b, e := os.ReadFile(p)
	if e == nil {
		e = json.Unmarshal(b, &m)
	}
	return m, e
}
func writeJSON(p string, v any) error {
	b, e := json.MarshalIndent(v, "", "  ")
	if e != nil {
		return e
	}
	return os.WriteFile(p, append(b, '\n'), 0644)
}
func configure(def string, old Config) (Config, error) {
	desk, start := old.Desktop, old.StartMenu
	if old.Format == 0 {
		desk, start = true, true
	}
	p := tempScript("config.ps1", configPS)
	defer os.Remove(p)
	cmd := ps("-File", p, "-DefaultDir", def, "-Desktop", fmt.Sprint(desk), "-StartMenu", fmt.Sprint(start))
	out, e := cmd.Output()
	if e != nil {
		var x *exec.ExitError
		if errors.As(e, &x) && x.ExitCode() == 2 {
			return Config{}, errCancel
		}
		return Config{}, e
	}
	var c Config
	e = json.Unmarshal(out, &c)
	return c, e
}
func fetchManifest() (Manifest, error) {
	var m Manifest
	r, e := client.Get(manifestURL)
	if e != nil {
		return m, e
	}
	defer r.Body.Close()
	if r.StatusCode != 200 {
		return m, fmt.Errorf("manifest HTTP %d", r.StatusCode)
	}
	e = json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&m)
	if e == nil && (m.Format != 1 || m.URL == "" || len(m.SHA256) != 64 || m.BuildID == "") {
		e = errors.New("invalid release manifest")
	}
	return m, e
}
func download(m Manifest, dst string, progress func(int)) error {
	r, e := client.Get(m.URL)
	if e != nil {
		return e
	}
	defer r.Body.Close()
	if r.StatusCode != 200 {
		return fmt.Errorf("download HTTP %d", r.StatusCode)
	}
	tmp := dst + ".download"
	_ = os.Remove(tmp)
	f, e := os.Create(tmp)
	if e != nil {
		return e
	}
	h := sha256.New()
	buf := make([]byte, 1<<20)
	var n int64
	last := -1
	for {
		q, re := r.Body.Read(buf)
		if q > 0 {
			if _, e = f.Write(buf[:q]); e != nil {
				f.Close()
				os.Remove(tmp)
				return e
			}
			h.Write(buf[:q])
			n += int64(q)
			if m.Bytes > 0 {
				p := int(n * 100 / m.Bytes)
				if p != last {
					last = p
					progress(p)
				}
			}
		}
		if re == io.EOF {
			break
		}
		if re != nil {
			f.Close()
			os.Remove(tmp)
			return re
		}
	}
	if e = f.Close(); e != nil {
		os.Remove(tmp)
		return e
	}
	if m.Bytes > 0 && n != m.Bytes {
		os.Remove(tmp)
		return fmt.Errorf("size mismatch")
	}
	if !strings.EqualFold(hex.EncodeToString(h.Sum(nil)), m.SHA256) {
		os.Remove(tmp)
		return fmt.Errorf("SHA-256 mismatch")
	}
	bak := dst + ".old"
	os.Remove(bak)
	had := fileExists(dst)
	if had {
		if e = os.Rename(dst, bak); e != nil {
			os.Remove(tmp)
			return e
		}
	}
	if e = os.Rename(tmp, dst); e != nil {
		if had {
			_ = os.Rename(bak, dst)
		}
		return e
	}
	os.Remove(bak)
	return nil
}
func installSelf(dir string) error {
	src, e := os.Executable()
	if e != nil {
		return e
	}
	dst := filepath.Join(dir, launcherName)
	a, _ := filepath.Abs(src)
	b, _ := filepath.Abs(dst)
	if strings.EqualFold(a, b) {
		return nil
	}
	in, e := os.Open(src)
	if e != nil {
		return e
	}
	defer in.Close()
	tmp := dst + ".new"
	out, e := os.Create(tmp)
	if e != nil {
		return e
	}
	_, e = io.Copy(out, in)
	ce := out.Close()
	if e == nil {
		e = ce
	}
	if e != nil {
		os.Remove(tmp)
		return e
	}
	os.Remove(dst)
	return os.Rename(tmp, dst)
}
func shortcuts(c Config, game string) error {
	destinations := `$d=Join-Path ([Environment]::GetFolderPath('Desktop')) 'DiceBound.lnk';$s=Join-Path (Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs') 'DiceBound.lnk'`
	return updateShortcuts(c, game, destinations)
}
func updateShortcuts(c Config, game, destinations string) error {
	launcher := filepath.Join(c.InstallDir, launcherName)
	script := fmt.Sprintf(`$ErrorActionPreference='Stop';$w=New-Object -ComObject WScript.Shell;$target='%s';$workingDirectory='%s';$icon='%s,0';%s;function Set-Link($p){$parent=Split-Path -Parent $p;if(-not (Test-Path -LiteralPath $parent -PathType Container)){New-Item -ItemType Directory -Path $parent -Force|Out-Null};$x=$w.CreateShortcut($p);$x.TargetPath=$target;$x.WorkingDirectory=$workingDirectory;$x.IconLocation=$icon;$x.Save();$check=$w.CreateShortcut($p);if($check.TargetPath -ne $target){throw "Shortcut target verification failed for $p. Expected '$target', got '$($check.TargetPath)'."}};function Remove-Link($p){if(Test-Path -LiteralPath $p -PathType Leaf){Remove-Item -LiteralPath $p -Force;if(Test-Path -LiteralPath $p){throw "Could not remove shortcut '$p'."}}};if(%s){Set-Link $d}else{Remove-Link $d};if(%s){Set-Link $s}else{Remove-Link $s}`, psq(launcher), psq(c.InstallDir), psq(game), destinations, psbool(c.Desktop), psbool(c.StartMenu))
	output, err := ps("-Command", script).CombinedOutput()
	if err == nil {
		return nil
	}
	detail := strings.TrimSpace(string(output))
	if detail == "" {
		return fmt.Errorf("could not update shortcuts: %w", err)
	}
	return fmt.Errorf("could not update shortcuts: %s (%w)", detail, err)
}
func launch(p string) {
	c := exec.Command(p)
	c.Dir = filepath.Dir(p)
	if e := c.Start(); e != nil {
		must(nil, e)
	}
}
func fileExists(p string) bool { s, e := os.Stat(p); return e == nil && !s.IsDir() }
func short(s string) string {
	if len(s) > 22 {
		return s[:22]
	}
	return s
}
func label(m Manifest, ok bool) string {
	if !ok {
		return "DiceBound is not installed yet"
	}
	v := strings.TrimSpace(m.Channel + " " + m.Version)
	if v == "" {
		v = "Installed DiceBound"
	}
	if m.BuildID != "" {
		v += " · " + short(m.BuildID)
	}
	return "Installed: " + v
}
func must(s *Splash, e error) {
	if e == nil {
		return
	}
	if s != nil {
		s.close()
	}
	warn("DiceBound Launcher", e.Error())
	os.Exit(1)
}
func warn(t, m string) {
	_ = ps("-Command", fmt.Sprintf("Add-Type -AssemblyName System.Windows.Forms;[Windows.Forms.MessageBox]::Show('%s','%s','OK','Warning')|Out-Null", psq(m), psq(t))).Run()
}
func psbool(v bool) string {
	if v {
		return "$true"
	}
	return "$false"
}
func psq(s string) string { return strings.ReplaceAll(s, "'", "''") }
func ps(args ...string) *exec.Cmd {
	c := exec.Command("powershell.exe", append([]string{"-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass"}, args...)...)
	c.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x08000000} // CREATE_NO_WINDOW
	return c
}
func tempScript(name string, b []byte) string {
	d := os.TempDir()
	p := filepath.Join(d, "DiceBound-"+name)
	_ = os.WriteFile(p, b, 0644)
	return p
}
func startSplash() (*Splash, error) {
	d, e := os.MkdirTemp("", "DiceBoundLauncher-")
	if e != nil {
		return nil, e
	}
	img := filepath.Join(d, "splash.jpg")
	hs := filepath.Join(d, "hints.txt")
	st := filepath.Join(d, "status.txt")
	ve := filepath.Join(d, "version.txt")
	done := filepath.Join(d, "done")
	os.WriteFile(img, splash, 0644)
	var h HintFile
	_ = json.Unmarshal(hints, &h)
	os.WriteFile(hs, []byte(strings.Join(h.Hints, "\r\n")), 0644)
	os.WriteFile(st, []byte("Starting DiceBound Launcher..."), 0644)
	p := filepath.Join(d, "splash.ps1")
	os.WriteFile(p, splashPS, 0644)
	c := ps("-STA", "-File", p, "-SplashPath", img, "-HintsPath", hs, "-StatusPath", st, "-VersionPath", ve, "-DonePath", done)
	if e = c.Start(); e != nil {
		os.RemoveAll(d)
		return nil, e
	}
	return &Splash{d, st, ve, done, c}, nil
}
func (s *Splash) set(a, b string) {
	if s == nil || s.dir == "" {
		return
	}
	if a != "" {
		os.WriteFile(s.status, []byte(a), 0644)
	}
	if b != "" {
		os.WriteFile(s.version, []byte(b), 0644)
	}
}
func (s *Splash) close() {
	if s == nil || s.dir == "" {
		return
	}
	os.WriteFile(s.done, []byte("done"), 0644)
	time.Sleep(350 * time.Millisecond)
	if s.cmd != nil && s.cmd.Process != nil {
		_ = s.cmd.Process.Kill()
	}
	os.RemoveAll(s.dir)
	s.dir = ""
}
