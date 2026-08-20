//go:build windows

package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestUpdateShortcutsIsIdempotent(t *testing.T) {
	dir := t.TempDir()
	launcher := filepath.Join(dir, launcherName)
	game := filepath.Join(dir, "DiceBound.exe")
	for _, path := range []string{launcher, game} {
		if err := os.WriteFile(path, []byte("test"), 0600); err != nil {
			t.Fatal(err)
		}
	}

	desktop := filepath.Join(dir, "Desktop", "DiceBound.lnk")
	startMenu := filepath.Join(dir, "Start Menu", "DiceBound.lnk")
	destinations := fmt.Sprintf("$d='%s';$s='%s'", psq(desktop), psq(startMenu))
	for _, want := range []struct {
		name               string
		desktop, startMenu bool
	}{
		{name: "neither"},
		{name: "desktop-only", desktop: true},
		{name: "start-menu-only", startMenu: true},
		{name: "both", desktop: true, startMenu: true},
		{name: "neither-again"},
	} {
		t.Run(want.name, func(t *testing.T) {
			cfg := Config{InstallDir: dir, Desktop: want.desktop, StartMenu: want.startMenu}
			for i := 0; i < 2; i++ {
				if err := updateShortcuts(cfg, game, destinations); err != nil {
					t.Fatalf("shortcut refresh pass %d: %v", i+1, err)
				}
			}
			assertFileState(t, desktop, want.desktop)
			assertFileState(t, startMenu, want.startMenu)
		})
	}
}

func assertFileState(t *testing.T, path string, want bool) {
	t.Helper()
	_, err := os.Stat(path)
	if want && err != nil {
		t.Fatalf("expected %q to exist: %v", path, err)
	}
	if !want && !os.IsNotExist(err) {
		t.Fatalf("expected %q to be absent, got: %v", path, err)
	}
}

func TestUpdateShortcutsReturnsPowerShellDetail(t *testing.T) {
	dir := t.TempDir()
	launcher := filepath.Join(dir, launcherName)
	game := filepath.Join(dir, "DiceBound.exe")
	blocker := filepath.Join(dir, "not-a-directory")
	for _, path := range []string{launcher, game, blocker} {
		if err := os.WriteFile(path, []byte("test"), 0600); err != nil {
			t.Fatal(err)
		}
	}

	desktop := filepath.Join(blocker, "DiceBound.lnk")
	startMenu := filepath.Join(dir, "Start Menu", "DiceBound.lnk")
	destinations := fmt.Sprintf("$d='%s';$s='%s'", psq(desktop), psq(startMenu))
	err := updateShortcuts(Config{InstallDir: dir, Desktop: true}, game, destinations)
	if err == nil {
		t.Fatal("expected shortcut creation to fail")
	}
	message := err.Error()
	if !strings.Contains(message, "could not update shortcuts:") {
		t.Fatalf("missing launcher context in error: %v", err)
	}
	if !strings.Contains(message, "Unable to save shortcut") || !strings.Contains(message, "DirectoryNotFoundException") {
		t.Fatalf("missing PowerShell failure detail in error: %v", err)
	}
}

func TestConfigRoundTripPreservesCustomPathAndEveryShortcutChoice(t *testing.T) {
	for _, choice := range []struct {
		desktop, startMenu bool
	}{{}, {desktop: true}, {startMenu: true}, {desktop: true, startMenu: true}} {
		path := filepath.Join(t.TempDir(), "launcher-config.json")
		want := Config{Format: 1, InstallDir: filepath.Join(t.TempDir(), "A custom DiceBound road"), Desktop: choice.desktop, StartMenu: choice.startMenu}
		if err := writeJSON(path, want); err != nil {
			t.Fatal(err)
		}
		got, err := readConfig(path)
		if err != nil {
			t.Fatal(err)
		}
		if got != want {
			t.Fatalf("config round trip mismatch: got %#v, want %#v", got, want)
		}
	}
}

func TestOfflineFallbackStartsOnlyAValidInstalledGame(t *testing.T) {
	networkErr := errors.New("network offline")
	started := ""
	start := func(path string) error { started = path; return nil }
	game := filepath.Join(t.TempDir(), "DiceBound.exe")

	handled, err := offlineFallback(game, true, networkErr, start)
	if err != nil || !handled || started != game {
		t.Fatalf("installed fallback failed: handled=%t started=%q err=%v", handled, started, err)
	}
	started = ""
	handled, err = offlineFallback(game, false, networkErr, start)
	if err == nil || handled || started != "" || !strings.Contains(err.Error(), "not installed") {
		t.Fatalf("missing-install fallback was not rejected safely: handled=%t started=%q err=%v", handled, started, err)
	}
	handled, err = offlineFallback(game, true, nil, start)
	if err != nil || handled || started != "" {
		t.Fatalf("fallback ran without a manifest failure: handled=%t started=%q err=%v", handled, started, err)
	}
}

func TestUpdateDecisionCoversBuildHashAndSize(t *testing.T) {
	game := filepath.Join(t.TempDir(), "DiceBound.exe")
	payload := []byte("working game")
	if err := os.WriteFile(game, payload, 0600); err != nil {
		t.Fatal(err)
	}
	digest := shaHex(payload)
	local := Manifest{BuildID: "build-a", SHA256: digest}
	remote := Manifest{BuildID: "build-a", SHA256: digest, Bytes: int64(len(payload))}
	if updateNeeded(local, remote, game) {
		t.Fatal("matching installed build unexpectedly needs an update")
	}
	for name, mutate := range map[string]func(*Manifest){
		"build": func(m *Manifest) { m.BuildID = "build-b" },
		"hash":  func(m *Manifest) { m.SHA256 = strings.Repeat("0", 64) },
		"size":  func(m *Manifest) { m.Bytes++ },
	} {
		t.Run(name, func(t *testing.T) {
			changed := remote
			mutate(&changed)
			if !updateNeeded(local, changed, game) {
				t.Fatal("changed release identity did not request an update")
			}
		})
	}
}

func TestManifestVersionCompatibilityAcceptsHistoricalAndFourComponentVersions(t *testing.T) {
	base := Manifest{
		Format: 1, Version: "0.6.2.1", Channel: "Beta", BuildID: "dicebound-0.6.2.1-test",
		URL: "https://example.invalid/DiceBound.exe", SHA256: strings.Repeat("a", 64), Bytes: 1,
	}
	for _, version := range []string{"0.6.1", "0.6.1-recovery", "0.6.2.1"} {
		manifest := base
		manifest.Version = version
		if err := validateManifest(manifest); err != nil {
			t.Fatalf("compatible version %q was rejected: %v", version, err)
		}
	}
	for _, version := range []string{"0.6", "0.6.2.1.5", "v0.6.2.1", "0.6.x.1", ""} {
		manifest := base
		manifest.Version = version
		if err := validateManifest(manifest); err == nil {
			t.Fatalf("invalid version %q was accepted", version)
		}
	}
}

func TestFailedDownloadsPreserveWorkingGameAndSaves(t *testing.T) {
	goodPayload := []byte("new verified game payload")
	serverURL, closeServer := testHTTPServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/http-error" {
			http.Error(w, "no release", http.StatusBadGateway)
			return
		}
		_, _ = w.Write(goodPayload)
	}))
	defer closeServer()

	for _, tc := range []struct {
		name   string
		url    string
		bytes  int64
		digest string
		want   string
	}{
		{name: "hash-mismatch", url: serverURL + "/game", bytes: int64(len(goodPayload)), digest: strings.Repeat("0", 64), want: "SHA-256 mismatch: expected"},
		{name: "size-mismatch", url: serverURL + "/game", bytes: int64(len(goodPayload) + 1), digest: shaHex(goodPayload), want: "size mismatch: expected"},
		{name: "http-failure", url: serverURL + "/http-error", bytes: int64(len(goodPayload)), digest: shaHex(goodPayload), want: "download HTTP 502"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			game := filepath.Join(dir, "DiceBound.exe")
			save := filepath.Join(dir, "career-save.json")
			oldGame, oldSave := []byte("previous runnable game"), []byte(`{"career":"preserved"}`)
			if err := os.WriteFile(game, oldGame, 0600); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(save, oldSave, 0600); err != nil {
				t.Fatal(err)
			}
			err := download(Manifest{URL: tc.url, Bytes: tc.bytes, SHA256: tc.digest}, game, func(int) {})
			if err == nil {
				t.Fatal("invalid download unexpectedly succeeded")
			}
			if !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("failure diagnostic %q does not contain %q", err, tc.want)
			}
			assertBytes(t, game, oldGame)
			assertBytes(t, save, oldSave)
			for _, residue := range []string{game + ".download", game + ".old", game + ".new"} {
				assertFileState(t, residue, false)
			}
		})
	}
}

func TestVerifiedDownloadAtomicallyReplacesGameAndPreservesSave(t *testing.T) {
	payload := []byte("new verified game payload")
	serverURL, closeServer := testHTTPServer(t, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write(payload) }))
	defer closeServer()
	dir := t.TempDir()
	game := filepath.Join(dir, "DiceBound.exe")
	save := filepath.Join(dir, "career-save.json")
	if err := os.WriteFile(game, []byte("old game"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(save, []byte("save survives"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := download(Manifest{URL: serverURL, Bytes: int64(len(payload)), SHA256: shaHex(payload)}, game, func(int) {}); err != nil {
		t.Fatal(err)
	}
	assertBytes(t, game, payload)
	assertBytes(t, save, []byte("save survives"))
	for _, residue := range []string{game + ".download", game + ".old", game + ".new"} {
		assertFileState(t, residue, false)
	}
}

func TestPersistentLauncherLogAndPowerShellStderr(t *testing.T) {
	root := t.TempDir()
	f, path, err := openLauncherLog(root)
	if err != nil {
		t.Fatal(err)
	}
	launcherLogger.Print("persistent marker")
	if got := startSplashWithDiagnostics(func() (*Splash, error) { return nil, errors.New("splash diagnostic marker") }); got != nil {
		t.Fatal("failed splash startup unexpectedly returned a splash")
	}
	cmd := ps("-Command", "[Console]::Error.Write('powershell diagnostic marker'); exit 7")
	_, stderr, runErr := runPowerShellCapture(cmd, "test PowerShell child")
	if runErr == nil || !strings.Contains(string(stderr), "powershell diagnostic marker") {
		t.Fatalf("PowerShell stderr was not captured: stderr=%q err=%v", stderr, runErr)
	}
	if err := f.Close(); err != nil {
		t.Fatal(err)
	}
	launcherLogger.SetOutput(io.Discard)
	contents, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	for _, marker := range []string{"persistent marker", "splash startup failed", "splash diagnostic marker", "test PowerShell child stderr", "powershell diagnostic marker"} {
		if !bytes.Contains(contents, []byte(marker)) {
			t.Fatalf("launcher log is missing %q:\n%s", marker, contents)
		}
	}
}

func shaHex(value []byte) string {
	digest := sha256.Sum256(value)
	return hex.EncodeToString(digest[:])
}

func testHTTPServer(t *testing.T, handler http.Handler) (string, func()) {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	server := &http.Server{Handler: handler}
	go func() { _ = server.Serve(listener) }()
	return "http://" + listener.Addr().String(), func() { _ = server.Close() }
}

func assertBytes(t *testing.T, path string, want []byte) {
	t.Helper()
	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got, want) {
		t.Fatalf("%q changed unexpectedly: got %q, want %q", path, got, want)
	}
}
