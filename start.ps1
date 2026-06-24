# Start backend if not already running on port 3000
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

# Start Android emulator if none is running
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
    Start-Sleep -Seconds 5
}

# Start Expo
Write-Host "Starting Expo..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\app"
npx expo start --android
