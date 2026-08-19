//go:build windows

package main

import (
	"fmt"
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
	cfg := Config{InstallDir: dir, Desktop: true}

	for i := 0; i < 2; i++ {
		if err := updateShortcuts(cfg, game, destinations); err != nil {
			t.Fatalf("create desktop shortcut pass %d: %v", i+1, err)
		}
	}
	if _, err := os.Stat(desktop); err != nil {
		t.Fatalf("desktop shortcut was not created: %v", err)
	}
	if _, err := os.Stat(startMenu); !os.IsNotExist(err) {
		t.Fatalf("unselected Start Menu shortcut exists or could not be checked: %v", err)
	}

	cfg.Desktop = false
	cfg.StartMenu = true
	for i := 0; i < 2; i++ {
		if err := updateShortcuts(cfg, game, destinations); err != nil {
			t.Fatalf("switch shortcut selection pass %d: %v", i+1, err)
		}
	}
	if _, err := os.Stat(desktop); !os.IsNotExist(err) {
		t.Fatalf("unselected desktop shortcut exists or could not be checked: %v", err)
	}
	if _, err := os.Stat(startMenu); err != nil {
		t.Fatalf("Start Menu shortcut was not created: %v", err)
	}

	cfg.StartMenu = false
	for i := 0; i < 2; i++ {
		if err := updateShortcuts(cfg, game, destinations); err != nil {
			t.Fatalf("remove shortcuts pass %d: %v", i+1, err)
		}
	}
	if _, err := os.Stat(desktop); !os.IsNotExist(err) {
		t.Fatalf("desktop shortcut exists or could not be checked: %v", err)
	}
	if _, err := os.Stat(startMenu); !os.IsNotExist(err) {
		t.Fatalf("Start Menu shortcut exists or could not be checked: %v", err)
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
