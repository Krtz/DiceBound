[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string]$Version,
    [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string]$Channel,
    [string]$PythonExecutable = "python",
    [switch]$SkipSourceStamp,
    [switch]$RequireSignedLoader
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
Set-Location $PSScriptRoot

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
    )
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath failed with exit code $LASTEXITCODE"
    }
}

Write-Host "== DiceBound $Channel $Version release build =="

if (-not $SkipSourceStamp) {
    Invoke-Checked $PythonExecutable "tools/set_project_version.py" "--version" $Version "--channel" $Channel
}

Invoke-Checked $PythonExecutable "tools/refresh_runtime_manifest.py" `
    "--version" $Version `
    "--channel" $Channel `
    "--development-state" "Unreleased"

Invoke-Checked $PythonExecutable "tools/validate_version_identity.py" "--version" $Version "--channel" $Channel
Invoke-Checked $PythonExecutable "tools/validate_asset_architecture.py"
Invoke-Checked $PythonExecutable "tools/validate_runtime_architecture.py"
Invoke-Checked $PythonExecutable "tools/validate_launcher_assets.py"

$dist = Join-Path $PSScriptRoot "wrapper-source\dist\browser"
if (Test-Path $dist) {
    Remove-Item $dist -Recurse -Force
}
New-Item -ItemType Directory -Path $dist -Force | Out-Null
Copy-Item (Join-Path $PSScriptRoot "runtime\*") $dist -Recurse -Force

Invoke-Checked $PythonExecutable "tools/refresh_runtime_manifest.py" `
    "--root" $dist `
    "--version" $Version `
    "--channel" $Channel `
    "--development-state" "Release" `
    "--notes" "DiceBound $Channel $Version packaged release payload."

$sourceAssetsRoot = (Resolve-Path (Join-Path $PSScriptRoot "runtime\assets")).Path.TrimEnd("\")
$stagedAssetsRoot = (Resolve-Path (Join-Path $dist "assets")).Path.TrimEnd("\")

$sourceAssets = @(
    Get-ChildItem $sourceAssetsRoot -Recurse -File |
        ForEach-Object {
            $_.FullName.Substring($sourceAssetsRoot.Length).TrimStart([char]"\").Replace("\", "/")
        } |
        Sort-Object
)
$stagedAssets = @(
    Get-ChildItem $stagedAssetsRoot -Recurse -File |
        ForEach-Object {
            $_.FullName.Substring($stagedAssetsRoot.Length).TrimStart([char]"\").Replace("\", "/")
        } |
        Sort-Object
)

$assetDiff = @(Compare-Object $sourceAssets $stagedAssets)
if ($assetDiff.Count -ne 0) {
    $assetDiff | Format-Table | Out-String | Write-Host
    throw "Staged asset tree does not exactly match runtime/assets."
}

$sourcePngCount = @(Get-ChildItem $sourceAssetsRoot -Recurse -File -Filter "*.png").Count
$stagedPngCount = @(Get-ChildItem $stagedAssetsRoot -Recurse -File -Filter "*.png").Count
if ($sourcePngCount -ne $stagedPngCount) {
    throw "PNG packaging mismatch: source=$sourcePngCount staged=$stagedPngCount"
}

$requiredArtwork = @(
    "assets\board\backgrounds\board-6-end-of-mathematics.png",
    "assets\enemies\normal\battle\wolf.png",
    "assets\enemies\normal\board-markers\wolf.png",
    "assets\enemies\minibosses\board-markers\titan-guard.png",
    "assets\enemies\bosses\board-markers\last-equation.png",
    "assets\characters\classes\markers\ranger.png",
    "assets\characters\pets\portraits\coffee.png",
    "assets\powerups\poor\heavy-purse.png"
)
foreach ($relative in $requiredArtwork) {
    $path = Join-Path $dist $relative
    if (-not (Test-Path $path)) {
        throw "Required current artwork is missing from staged payload: $relative"
    }
    if ((Get-Item $path).Length -le 0) {
        throw "Required current artwork is empty in staged payload: $relative"
    }
}

if ($RequireSignedLoader) {
    $loader = [Environment]::GetEnvironmentVariable("WEBVIEW2_LOADER_DLL")
    if ([string]::IsNullOrWhiteSpace($loader) -or -not (Test-Path $loader)) {
        throw "WEBVIEW2_LOADER_DLL must point to the official x64 WebView2Loader.dll for a release build."
    }
    $signature = Get-AuthenticodeSignature $loader
    if ($signature.Status -ne "Valid") {
        throw "WebView2Loader.dll signature is not valid: $($signature.Status)"
    }
}

$artifactChannel = $Channel.Replace(" ", "_")
$artifactVersion = $Version.Replace(".", "_")
$builtExe = Join-Path $PSScriptRoot "wrapper-source\release\Dicebound_${artifactChannel}_${artifactVersion}.exe"
$releaseExe = Join-Path $PSScriptRoot "wrapper-source\release\DiceBound.exe"
$metadataPath = Join-Path $PSScriptRoot "wrapper-source\release\release-metadata.json"
foreach ($staleArtifact in @($builtExe, $releaseExe, $metadataPath)) {
    if (Test-Path $staleArtifact) {
        Remove-Item $staleArtifact -Force
    }
}

Invoke-Checked $PythonExecutable "wrapper-source/tools/build_launcher.py"

if (-not (Test-Path $builtExe)) {
    throw "Native wrapper build did not produce $builtExe"
}
Copy-Item $builtExe $releaseExe -Force

$expectedTitle = "Dicebound: $Channel v$Version"

$sha256 = (Get-FileHash $releaseExe -Algorithm SHA256).Hash.ToLowerInvariant()
$bytes = (Get-Item $releaseExe).Length
$buildInfo = Get-Content (Join-Path $dist "build-info.json") -Raw | ConvertFrom-Json

$metadata = [ordered]@{
    format = 1
    name = "DiceBound"
    version = $Version
    channel = $Channel
    buildId = $buildInfo.buildId
    browserContentHash = $buildInfo.browserContentHash
    artifact = "DiceBound.exe"
    sha256 = $sha256
    bytes = $bytes
    sourceAssetFiles = $sourceAssets.Count
    pngFiles = $sourcePngCount
    webView2SdkVersion = [Environment]::GetEnvironmentVariable("WEBVIEW2_SDK_VERSION")
    windowsTitle = $expectedTitle
}
$metadataJson = $metadata | ConvertTo-Json -Depth 6
[IO.File]::WriteAllText(
    $metadataPath,
    $metadataJson + "`n",
    [Text.UTF8Encoding]::new($false)
)

Invoke-Checked $PythonExecutable `
    "tools/validate_version_identity.py" `
    "--version" $Version `
    "--channel" $Channel `
    "--release-metadata" $metadataPath

Write-Host ""
Write-Host "Release build complete."
Write-Host "EXE: $releaseExe"
Write-Host "SHA256: $sha256"
Write-Host "Bytes: $bytes"
Write-Host "Build ID: $($buildInfo.buildId)"
Write-Host "Asset files verified: $($sourceAssets.Count)"
Write-Host "PNG files verified: $sourcePngCount"
