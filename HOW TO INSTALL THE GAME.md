# HOW TO INSTALL THE GAME

If Axel sent you this GitHub repository because he wants you to play DiceBound, this page is for you.

DiceBound is currently a **Windows Beta**. It is not yet distributed like a normal finished Steam game, so the newest development build is made from the files in this repository.

You do **not** need to understand programming to do this. You need to install two tools, download the repository, paste one block into PowerShell, and then double-click the EXE it creates.

---

# Recommended: build the newest DiceBound from this GitHub

## 1. You need Windows

The normal DiceBound app is currently a Windows x64 WebView2 application.

Windows 10 or Windows 11 is recommended.

## 2. Install Python

Download Python 3 for Windows from:

https://www.python.org/downloads/windows/

During installation, enable the option that adds Python to `PATH` if the installer offers it.

After installing, open **PowerShell** and run:

```powershell
python --version
```

If it prints a Python 3 version, that part is done.

## 3. Install Go

Download Go for Windows from:

https://go.dev/dl/

After installing, close and reopen PowerShell and run:

```powershell
go version
```

If it prints a Go version, that part is done.

## 4. Download DiceBound

On the main GitHub page:

1. Click the green **Code** button.
2. Click **Download ZIP**.
3. Extract the ZIP somewhere sensible, for example your Desktop.
4. Open the extracted `DiceBound` folder.

Do **not** try to build the game while it is still inside the downloaded ZIP.

## 5. Open PowerShell in the DiceBound folder

In Windows Explorer, open the folder containing files such as:

- `README.md`
- `runtime`
- `wrapper-source`
- `tools`

Then right-click empty space in the folder and choose **Open in Terminal** / **Open PowerShell window here**.

If your prompt is not currently inside the DiceBound folder, `cd` into it first.

## 6. Copy and paste this whole block

```powershell
python --version
go version

python .\tools\refresh_runtime_manifest.py

Remove-Item .\wrapper-source\dist\browser -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path .\wrapper-source\dist\browser -Force | Out-Null
Copy-Item .\runtime\* .\wrapper-source\dist\browser\ -Recurse -Force

python .\wrapper-source\tools\build_launcher.py

$exe = Get-ChildItem .\wrapper-source\release\Dicebound_*.exe | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Write-Host ""
Write-Host "DiceBound was built here:"
Write-Host $exe.FullName
```

If everything worked, the last line shows where your new DiceBound EXE was created.

It will normally be under:

```text
wrapper-source\release\
```

with a name similar to:

```text
Dicebound_Beta_0_6_3_0.exe
```

The exact version number may be newer than the example above.

## 7. Play

Double-click the newly created EXE.

That is the game.

You can make a shortcut to it if you want.

---

# Windows says the EXE is suspicious / unknown

DiceBound is a hobby Beta and the development EXE is currently **not code-signed**.

Windows SmartScreen, antivirus software, or a corporate security product may therefore complain because the executable is unknown rather than because DiceBound is a published trusted application.

Only run software from repositories/files you trust.

On a normal personal Windows PC, SmartScreen may show **Windows protected your PC**. If you trust this repository/build, the usual path is:

1. Click **More info**.
2. Click **Run anyway**.

On a managed work/school computer, security policy may simply block it. Do not fight your employer's security software; use a personal computer instead.

---

# If DiceBound complains about WebView2

DiceBound's Windows app uses Microsoft Edge WebView2.

Most current Windows 10/11 machines already have the WebView2 Runtime installed, usually through Microsoft Edge.

If the game specifically reports that WebView2 is missing, install Microsoft's WebView2 Runtime from:

https://developer.microsoft.com/microsoft-edge/webview2/

Then run DiceBound again.

You do **not** need the WebView2 SDK just to make a normal local development build using the instructions above.

---

# Extremely easy browser fallback

If you do not care about the native Windows wrapper and only want to try the game:

1. Download and extract the repository ZIP.
2. Open the `runtime` folder.
3. Open `index.html` in Microsoft Edge or Chrome.

The browser version is a secondary development/fallback target. The native EXE is the intended experience, especially for native save-folder behavior.

---

# Updating to a newer GitHub version later

If you originally used **Download ZIP**:

1. Download the repository ZIP again.
2. Extract the new copy.
3. Repeat the PowerShell build block above.

If you know Git and cloned the repository instead, update your clone and repeat the build block.

---

# Optional: Git users

If you already have Git installed, you can clone instead of downloading a ZIP:

```powershell
git clone https://github.com/Krtz/DiceBound.git
cd DiceBound
```

Then run the same build block from step 6.

To update later:

```powershell
git pull --ff-only
```

and rebuild.

---

# Do NOT use the production-release script just to play

You may notice this file in the repository:

```text
Build-DiceBoundRelease.ps1
```

That script is for making a **formal DiceBound release artifact**. It performs release version stamping, validation, release metadata work, and can require the official signed Microsoft WebView2 loader.

You do not need it just to build the current game for yourself.

Use the simple instructions on this page instead.

---

# Saves

DiceBound is still in Beta.

Beta development can deliberately break compatibility with older saves. If a new development version behaves strangely after a major update, the save may simply be from an incompatible older Beta.

The game has native save/backup handling, but this is still an actively changing project rather than a finished stable release.

---

# Something failed

The most common causes are:

### `python` is not recognized
Python was not installed correctly or was not added to PATH. Reinstall Python, enable its PATH option, then reopen PowerShell.

### `go` is not recognized
Go was not installed correctly or PowerShell was left open from before the installation. Reopen PowerShell first; reinstall Go if necessary.

### `Build dist/browser before building the launcher.`
You skipped part of the PowerShell block. Run the whole block again from the repository root.

### WebView2 error when starting the EXE
Install/update Microsoft Edge WebView2 Runtime using the Microsoft link above.

### Antivirus/work computer blocks the EXE
The development executable is unsigned. Use a personal machine if the computer is centrally managed.

### Everything is on fire
Take a screenshot of the complete PowerShell error and send it to Axel. Do not send only the final line if there are twenty useful lines above it.

---

# For developers

The normal self-build described here intentionally uses the repository's compatibility build path.

For formal release packaging, signed-loader requirements, version stamping, checksums and distribution metadata, read:

- `README.md`
- `docs/DEVELOPMENT.md`
- `docs/RELEASE_PROCESS.md`
- `installer/README.md`
- `Build-DiceBoundRelease.ps1`

Enjoy the Road.