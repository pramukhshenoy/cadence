# Usage:
#   .\start.ps1           — start backend + emulator + Expo (Expo Go, Phases 1-3)
#   .\start.ps1 -DevBuild — start backend + Expo in dev-client mode (Phases 4-5, physical device)
#   .\start.ps1 -Build    — trigger EAS cloud build, then start dev-client Metro

param(
    [switch]$Build,      # run `eas build` before starting Metro
    [switch]$DevBuild    # skip emulator, start Metro in dev-client mode (APK already installed)
)

$useDevClient = $Build -or $DevBuild

# ── Backend ────────────────────────────────────────────────────────────────────
$backendRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 2 -ErrorAction Stop
    if ($response.StatusCode -eq 200) { $backendRunning = $true }
} catch {}

if ($backendRunning) {
    Write-Host "Backend already running on port 3000" -ForegroundColor Green
} else {
    Write-Host "Starting backend..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\server'; npm run dev" -WindowStyle Normal
    Start-Sleep -Seconds 3
}

# ── Emulator (Phases 1-3 only) ─────────────────────────────────────────────────
if (-not $useDevClient) {
    $adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
    $emulator = "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe"

    $devices = & $adb devices 2>$null | Select-String "emulator"
    if ($devices) {
        Write-Host "Emulator already running" -ForegroundColor Green
    } else {
        Write-Host "Starting Pixel_8 emulator..." -ForegroundColor Cyan
        Start-Process -FilePath $emulator -ArgumentList "-avd Pixel_8"
        Write-Host "Waiting for emulator to boot..." -ForegroundColor Cyan
        & $adb wait-for-device
        do {
            Start-Sleep -Seconds 2
            $bootCompleted = (& $adb shell getprop sys.boot_completed 2>$null).Trim()
        } until ($bootCompleted -eq "1")
        Start-Sleep -Seconds 2
    }
}

# ── EAS Build (Phase 4+ native dev client) ─────────────────────────────────────
if ($Build) {
    Write-Host "Building dev client APK via EAS (this takes ~10 minutes)..." -ForegroundColor Cyan
    Write-Host "Install the resulting APK on your physical Android device." -ForegroundColor Yellow
    Set-Location "$PSScriptRoot\app"
    eas build -p android --profile development
    if ($LASTEXITCODE -ne 0) {
        Write-Host "EAS build failed. Exiting." -ForegroundColor Red
        exit 1
    }
    Write-Host "Build complete. Install the APK on your phone, then re-run with -DevBuild." -ForegroundColor Green
    exit 0
}

# ── Expo Metro ─────────────────────────────────────────────────────────────────
Set-Location "$PSScriptRoot\app"
if ($useDevClient) {
    Write-Host "Starting Expo in dev-client mode (connect via Tailscale)..." -ForegroundColor Cyan
    npx expo start --dev-client
} else {
    Write-Host "Starting Expo..." -ForegroundColor Cyan
    npx expo start --android
}
