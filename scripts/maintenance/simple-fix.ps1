# Simple PowerShell Fix
Write-Host "=== CORRECTION POWERSHELL SIMPLE ===" -ForegroundColor Green

# Kill processes
Get-Process | Where-Object {$_.ProcessName -like "*git*" -or $_.ProcessName -like "*npm*" -or $_.ProcessName -like "*node*"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Clear terminal
Clear-Host

# Set environment
$env:YOLO_MODE = "true"
$env:AUTO_CONTINUE = "true"

Write-Host "[OK] Processus nettoyés" -ForegroundColor Green
Write-Host "[OK] Variables d'environnement définies" -ForegroundColor Green

# Update version
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$packageJson.version = "1.0.20"
$packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"
Write-Host "[OK] Version mise à jour: 1.0.20" -ForegroundColor Green

# Git operations
git add -A
git commit -m "CORRECTION POWERSHELL - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Version 1.0.20"
git push origin master

Write-Host "[SUCCESS] Correction terminée!" -ForegroundColor Green 

