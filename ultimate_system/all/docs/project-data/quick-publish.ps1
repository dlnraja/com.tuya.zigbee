# QUICK PUBLISH v2.0.9
Set-Location "C:\Users\HP\Desktop\tuya_repair"
Remove-Item ".homeybuild" -Recurse -Force -ErrorAction SilentlyContinue

# Update version 2.0.8 → 2.0.9
$json = Get-Content ".homeycompose\app.json" -Raw | ConvertFrom-Json
$json.version = "2.0.9"
$json | ConvertTo-Json -Depth 10 | Set-Content ".homeycompose\app.json"

# Force publish
Write-Host "🚀 Publishing v2.0.9..."
homey app publish --force 2>&1 | Out-File "project-data\publish-v2.0.9.log"
Write-Host "✅ Done! Check: project-data\publish-v2.0.9.log"
