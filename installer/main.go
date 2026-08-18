//go:build windows

package main

import (
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "errors"
    "fmt"
    "io"
    "net/http"
    "os"
    "os/exec"
    "path/filepath"
    "runtime"
    "strings"
    "time"
)

const (
    manifestURL  = "https://raw.githubusercontent.com/Krtz/DiceBound/main/distribution/latest.json"
    launcherName = "DiceBoundLauncher.exe"
    stateName    = "installed.json"
)

type Manifest struct {
    Format     int    `json:"format"`
    Name       string `json:"name"`
    Version    string `json:"version"`
    Channel    string `json:"channel"`
    BuildID    string `json:"buildId"`
    URL        string `json:"url"`
    SHA256     string `json:"sha256"`
    Bytes      int64  `json:"bytes"`
    Executable string `json:"executable"`
}

var client = &http.Client{Timeout: 45 * time.Second}

func main() {
    if runtime.GOOS != "windows" {
        fmt.Fprintln(os.Stderr, "DiceBound Launcher only supports Windows.")
        os.Exit(1)
    }

    fmt.Println("DiceBound Launcher")
    fmt.Println("==================")

    installDir, err := installPath()
    fatalIf(err)
    if err := os.MkdirAll(installDir, 0o755); err != nil {
        fatal(err)
    }

    // Keep a stable copy of the launcher in the install directory so shortcuts
    // can always target the same file even when Setup was run from Downloads.
    if err := installSelf(installDir); err != nil {
        fmt.Printf("Warning: could not install launcher copy: %v\n", err)
    }

    remote, err := fetchManifest()
    gamePath := filepath.Join(installDir, "DiceBound.exe")
    if err != nil {
        if fileExists(gamePath) {
            fmt.Printf("Could not check for updates (%v). Launching installed DiceBound offline.\n", err)
            launch(gamePath)
            return
        }
        fatal(fmt.Errorf("could not download DiceBound release information: %w", err))
    }

    if remote.Executable == "" {
        remote.Executable = "DiceBound.exe"
    }
    gamePath = filepath.Join(installDir, remote.Executable)

    local, _ := readInstalledState(filepath.Join(installDir, stateName))
    needsInstall := !fileExists(gamePath) || local.BuildID != remote.BuildID || local.SHA256 != remote.SHA256
    if !needsInstall && remote.Bytes > 0 {
        if info, err := os.Stat(gamePath); err != nil || info.Size() != remote.Bytes {
            needsInstall = true
        }
    }

    if needsInstall {
        fmt.Printf("Installing DiceBound %s %s...\n", remote.Channel, remote.Version)
        if err := downloadVerified(remote, gamePath); err != nil {
            fatal(err)
        }
        if err := writeInstalledState(filepath.Join(installDir, stateName), remote); err != nil {
            fmt.Printf("Warning: could not write install state: %v\n", err)
        }
        fmt.Println("Install/update complete.")
    } else {
        fmt.Printf("DiceBound %s %s is already up to date.\n", remote.Channel, remote.Version)
    }

    if err := createShortcuts(installDir); err != nil {
        fmt.Printf("Warning: shortcuts could not be created: %v\n", err)
    }

    launch(gamePath)
}

func installPath() (string, error) {
    local := strings.TrimSpace(os.Getenv("LOCALAPPDATA"))
    if local == "" {
        return "", errors.New("LOCALAPPDATA is not set")
    }
    return filepath.Join(local, "DiceBound"), nil
}

func installSelf(installDir string) error {
    src, err := os.Executable()
    if err != nil {
        return err
    }
    dst := filepath.Join(installDir, launcherName)
    srcAbs, _ := filepath.Abs(src)
    dstAbs, _ := filepath.Abs(dst)
    if strings.EqualFold(srcAbs, dstAbs) {
        return nil
    }

    in, err := os.Open(src)
    if err != nil {
        return err
    }
    defer in.Close()
    tmp := dst + ".new"
    out, err := os.Create(tmp)
    if err != nil {
        return err
    }
    _, copyErr := io.Copy(out, in)
    closeErr := out.Close()
    if copyErr != nil {
        _ = os.Remove(tmp)
        return copyErr
    }
    if closeErr != nil {
        _ = os.Remove(tmp)
        return closeErr
    }
    _ = os.Remove(dst)
    return os.Rename(tmp, dst)
}

func fetchManifest() (Manifest, error) {
    req, err := http.NewRequest(http.MethodGet, manifestURL, nil)
    if err != nil {
        return Manifest{}, err
    }
    req.Header.Set("User-Agent", "DiceBound-Launcher/1")
    req.Header.Set("Cache-Control", "no-cache")
    resp, err := client.Do(req)
    if err != nil {
        return Manifest{}, err
    }
    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        return Manifest{}, fmt.Errorf("manifest request returned HTTP %d", resp.StatusCode)
    }
    var m Manifest
    if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&m); err != nil {
        return Manifest{}, err
    }
    if m.Format != 1 || m.URL == "" || len(m.SHA256) != 64 || m.BuildID == "" {
        return Manifest{}, errors.New("release manifest is incomplete or unsupported")
    }
    return m, nil
}

func downloadVerified(m Manifest, dst string) error {
    req, err := http.NewRequest(http.MethodGet, m.URL, nil)
    if err != nil {
        return err
    }
    req.Header.Set("User-Agent", "DiceBound-Launcher/1")
    resp, err := client.Do(req)
    if err != nil {
        return fmt.Errorf("download failed: %w", err)
    }
    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        return fmt.Errorf("game download returned HTTP %d", resp.StatusCode)
    }

    tmp := dst + ".download"
    _ = os.Remove(tmp)
    f, err := os.Create(tmp)
    if err != nil {
        return err
    }

    h := sha256.New()
    expected := m.Bytes
    var written int64
    buf := make([]byte, 1024*1024)
    lastPct := int64(-1)
    for {
        n, readErr := resp.Body.Read(buf)
        if n > 0 {
            if _, err := f.Write(buf[:n]); err != nil {
                f.Close()
                _ = os.Remove(tmp)
                return err
            }
            _, _ = h.Write(buf[:n])
            written += int64(n)
            if expected > 0 {
                pct := written * 100 / expected
                if pct != lastPct && (pct%5 == 0 || pct == 100) {
                    fmt.Printf("  Downloading... %d%%\n", pct)
                    lastPct = pct
                }
            }
        }
        if readErr == io.EOF {
            break
        }
        if readErr != nil {
            f.Close()
            _ = os.Remove(tmp)
            return fmt.Errorf("download interrupted: %w", readErr)
        }
    }
    if err := f.Close(); err != nil {
        _ = os.Remove(tmp)
        return err
    }

    if m.Bytes > 0 && written != m.Bytes {
        _ = os.Remove(tmp)
        return fmt.Errorf("download size mismatch: got %d bytes, expected %d", written, m.Bytes)
    }
    got := hex.EncodeToString(h.Sum(nil))
    if !strings.EqualFold(got, m.SHA256) {
        _ = os.Remove(tmp)
        return fmt.Errorf("SHA-256 mismatch: got %s, expected %s", got, m.SHA256)
    }

    backup := dst + ".old"
    _ = os.Remove(backup)
    if fileExists(dst) {
        if err := os.Rename(dst, backup); err != nil {
            _ = os.Remove(tmp)
            return fmt.Errorf("could not replace installed game: %w", err)
        }
    }
    if err := os.Rename(tmp, dst); err != nil {
        if fileExists(backup) {
            _ = os.Rename(backup, dst)
        }
        return err
    }
    _ = os.Remove(backup)
    return nil
}

func readInstalledState(path string) (Manifest, error) {
    b, err := os.ReadFile(path)
    if err != nil {
        return Manifest{}, err
    }
    var m Manifest
    err = json.Unmarshal(b, &m)
    return m, err
}

func writeInstalledState(path string, m Manifest) error {
    b, err := json.MarshalIndent(m, "", "  ")
    if err != nil {
        return err
    }
    return os.WriteFile(path, append(b, '\n'), 0o644)
}

func createShortcuts(installDir string) error {
    launcher := filepath.Join(installDir, launcherName)
    icon := filepath.Join(installDir, "DiceBound.exe")
    script := `$ErrorActionPreference='Stop';` +
        `$w=New-Object -ComObject WScript.Shell;` +
        `$desk=[Environment]::GetFolderPath('Desktop');` +
        `$start=Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs';` +
        `$targets=@((Join-Path $desk 'DiceBound.lnk'),(Join-Path $start 'DiceBound.lnk'));` +
        `foreach($p in $targets){$s=$w.CreateShortcut($p);$s.TargetPath='` + psQuote(launcher) + `';$s.WorkingDirectory='` + psQuote(installDir) + `';$s.IconLocation='` + psQuote(icon) + `,0';$s.Save()}`
    cmd := exec.Command("powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script)
    return cmd.Run()
}

func psQuote(s string) string { return strings.ReplaceAll(s, "'", "''") }

func launch(path string) {
    fmt.Println("Launching DiceBound...")
    cmd := exec.Command(path)
    cmd.Dir = filepath.Dir(path)
    if err := cmd.Start(); err != nil {
        fatal(fmt.Errorf("could not launch DiceBound: %w", err))
    }
}

func fileExists(path string) bool {
    st, err := os.Stat(path)
    return err == nil && !st.IsDir()
}

func fatalIf(err error) {
    if err != nil {
        fatal(err)
    }
}

func fatal(err error) {
    fmt.Fprintf(os.Stderr, "\nDiceBound Launcher error: %v\n", err)
    fmt.Fprintln(os.Stderr, "Press Enter to close.")
    _, _ = fmt.Scanln()
    os.Exit(1)
}
