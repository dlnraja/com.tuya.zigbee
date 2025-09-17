# BUFFER FIX v2.0.8
Set-Location "C:\Users\HP\Desktop\tuya_repair"
Remove-Item ".homeybuild" -Recurse -Force -ErrorAction SilentlyContinue

# Mise à jour version
$json = Get-Content ".homeycompose\app.json" -Raw | ConvertFrom-Json
$json.version = "2.0.8"
$json | ConvertTo-Json -Depth 10 | Set-Content ".homeycompose\app.json"

# Publication buffer-safe avec log
Write-Host "🚀 Publication buffer-safe..."
$null = homey app publish 2>&1 | Out-File "project-data\publish-v2.0.8.log" -Encoding UTF8
Write-Host "✅ Log: project-data\publish-v2.0.8.log"
