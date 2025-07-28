# Correction automatique du terminal
Set-PSReadLineOption -EditMode Windows
$ErrorActionPreference = "Continue"
$ConfirmPreference = "None"
Write-Host "Terminal configuré pour éviter les blocages" -ForegroundColor Green
