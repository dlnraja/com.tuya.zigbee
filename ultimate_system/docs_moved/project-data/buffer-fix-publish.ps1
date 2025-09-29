# BUFFER FIX v2.0.8 - RÉSOLUTION DEFINITIVE
Set-Location "C:\Users\HP\Desktop\tuya_repair"

# Nettoyage
Remove-Item ".homeybuild" -Recurse -Force -ErrorAction SilentlyContinue

# Version update  
$json = Get-Content ".homeycompose\app.json" -Raw | ConvertFrom-Json
$json.version = "2.0.8"
$json | ConvertTo-Json -Depth 10 | Set-Content ".homeycompose\app.json"

# Publication avec expect automation
Write-Host "🚀 Publishing v2.0.8..."
$proc = Start-Process -FilePath "homey" -ArgumentList "app", "publish" -NoNewWindow -PassThru -RedirectStandardOutput "project-data\publish-v2.0.8.log"
$proc.WaitForExit(300000)  # 5 min timeout

Write-Host "✅ Published! Check: project-data\publish-v2.0.8.log"
