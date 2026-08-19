# WebView2 loader vendor slot

Dicebound Beta 0.5.0 prefers Microsoft's official x64 `WebView2Loader.dll` from the release `Microsoft.Web.WebView2` SDK package.

Place the signed x64 loader here before building:

`vendor/webview2/x64/WebView2Loader.dll`

`tools/build_launcher.py` embeds that DLL into the single Dicebound EXE. At startup the wrapper extracts the exact loader into `%LOCALAPPDATA%\Dicebound\runtime-cache\wrapper\WebView2Loader.dll` and calls the public `CreateCoreWebView2EnvironmentWithOptions` export.

CI can alternatively set `WEBVIEW2_LOADER_DLL` to the official x64 loader path.

If no signed loader is staged, offline/developer builds retain an isolated compatibility bootstrap so Dicebound remains buildable. Production releases should vendor the official loader and remove that fallback once the release environment can reliably fetch/package the SDK artifact.
