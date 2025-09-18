# BUFFER FIX v2.0.8
Set-Location "C:\Users\HP\Desktop\tuya_repair"
Remove-Item ".homeybuild" -Recurse -Force -ErrorAction SilentlyContinue

# Version update
$json = Get-Content ".homeycompose\app.json" -Raw | ConvertFrom-Json
$json.version = "2.0.8"
$json | ConvertTo-Json -Depth 10 | Set-Content ".homeycompose\app.json"

# Publication avec stdin
Write-Host "🚀 Publishing..."
$responses = "y`ny`npatch`nv2.0.8 - Buffer fix + unbranded drivers`ny`n"
$responses | homey app publish
