# Dicebound native WebView2 wrapper — Beta 0.5.8

This is the primary Windows runtime for Dicebound.

- Owns a real Win32 application window.
- Embeds the exact generated `dist/browser` payload without post-build edits.
- Hosts that payload on a loopback-only ephemeral HTTP port inside the process.
- Uses the installed Evergreen Microsoft Edge WebView2 Runtime to render it.
- Saves native game files under `%LOCALAPPDATA%\Dicebound\saves`.
- Persists native window placement under `%LOCALAPPDATA%\Dicebound\wrapper\window.json`.
- Keeps the one-double-click EXE workflow and named-mutex single-instance guard.

## WebView2 loader path

Beta 0.5.8 moves the wrapper to a **public WebView2Loader-first bootstrap**. When Microsoft's signed x64 `WebView2Loader.dll` from the `Microsoft.Web.WebView2` SDK is staged, `tools/build_launcher.py` embeds it into the Dicebound EXE. At runtime Dicebound extracts it privately and calls `CreateCoreWebView2EnvironmentWithOptions`.

The build accepts the loader from either `vendor/webview2/x64/WebView2Loader.dll` or the `WEBVIEW2_LOADER_DLL` environment variable.

For offline development environments that cannot fetch the signed SDK artifact, the old direct-runtime bootstrap is now isolated behind a compatibility fallback. It is no longer the preferred wrapper path and can be removed completely once every release build environment reliably vendors the official loader.
