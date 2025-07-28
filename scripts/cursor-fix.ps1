# Correctif Cursor et Terminal
Write-Host '🔧 Nettoyage des processus Cursor...' -ForegroundColor Yellow
Get-Process | Where-Object {.ProcessName -like '*cursor*' -and .Id -ne 44964} | Stop-Process -Force
Start-Sleep -Seconds 3
Set-PSReadLineOption -EditMode Windows
$ErrorActionPreference = "Continue"
$ConfirmPreference = "None"
