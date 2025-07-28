# Script PowerShell pour relancer Cursor proprement
Write-Host '🚀 Initialisation Cursor pour projet Tuya Zigbee' -ForegroundColor Green
Set-PSReadLineOption -EditMode Windows
$ErrorActionPreference = "Continue"
$ConfirmPreference = "None"
if (Test-Path 'cursor_todo_queue.md') { Write-Host '📋 Queue trouvée, reprise des tâches...' -ForegroundColor Yellow }
