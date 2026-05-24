# PowerShell Sync Script: tuya_repair -> com.tuya.zigbee-SDK3
$src = "c:\Users\HP\Desktop\homey-app\tuya_repair"
$dst = "c:\Users\HP\Desktop\homey-app\com.tuya.zigbee-SDK3\com.tuya.zigbee-SDK3"

Write-Host "Synchronizing Tuya Homey Applications..." -ForegroundColor Cyan

# 1. Clean existing folders in destination to prevent orphan files
$folders = @("drivers", "lib", "assets", "capabilities", "locales", "scripts", ".github", "docs")
foreach ($folder in $folders) {
    $folderPath = Join-Path $dst $folder
    if (Test-Path $folderPath) {
        Write-Host "Clearing destination folder: $folder" -ForegroundColor Yellow
        Remove-Item -Path $folderPath -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 2. Copy folders recursively
foreach ($folder in $folders) {
    $srcPath = Join-Path $src $folder
    if (Test-Path $srcPath) {
        Write-Host "Copying folder: $folder" -ForegroundColor Green
        Copy-Item -Path $srcPath -Destination $dst -Recurse -Force
    }
}

# 3. Copy root configuration and logic files
$files = @("app.js", "app.json", "package.json", "package-lock.json", ".gitignore")
foreach ($file in $files) {
    $srcFile = Join-Path $src $file
    if (Test-Path $srcFile) {
        Write-Host "Copying root file: $file" -ForegroundColor Green
        Copy-Item -Path $srcFile -Destination $dst -Force
    }
}

Write-Host "Synchronization Complete! Both apps are now aligned with the latest Zero-Defect features." -ForegroundColor Cyan
