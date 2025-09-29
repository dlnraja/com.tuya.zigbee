# BUFFER FIX PUBLISHER v2.0.8
$ProjectRoot = "C:\Users\HP\Desktop\tuya_repair"
Set-Location $ProjectRoot

# Nettoyage buffer
Remove-Item ".homeybuild" -Recurse -Force -ErrorAction SilentlyContinue

# Mise à jour version
$appJson = Get-Content ".homeycompose\app.json" -Raw | ConvertFrom-Json
$appJson.version = "2.0.8"
$appJson | ConvertTo-Json -Depth 10 | Set-Content ".homeycompose\app.json" -Encoding UTF8

# Publication avec redirection buffer-safe
Write-Host "🚀 Publication buffer-safe..."
homey app publish 2>&1 | Out-File "project-data\publish-buffer-safe.log" -Encoding UTF8

Write-Host "✅ Terminé - Vérifier log: project-data\publish-buffer-safe.log"
