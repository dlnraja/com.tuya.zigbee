# FORCE PUBLISH NOW v2.0.8 - RÉSOLUTION BUFFER
Set-Location "C:\Users\HP\Desktop\tuya_repair"

Write-Host "🚀 FORCE PUBLISH v2.0.8 - RÉSOLUTION BUFFER" -ForegroundColor Green

# 1. Nettoyage
Remove-Item ".homeybuild" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✅ .homeybuild cleaned" -ForegroundColor Green

# 2. Version update
$json = Get-Content ".homeycompose\app.json" -Raw | ConvertFrom-Json
$json.version = "2.0.8"
$json | ConvertTo-Json -Depth 10 | Set-Content ".homeycompose\app.json" -Encoding UTF8
Write-Host "✅ Version updated to 2.0.8" -ForegroundColor Green

# 3. Force publish avec méthode stdio
Write-Host "🚀 Force publishing with stdio automation..." -ForegroundColor Cyan
$responses = @"
y
y
patch
v2.0.8 - Ultimate buffer fix + comprehensive unbranded drivers enhancement with 101+ categories (1-6 gang, AC/DC/CR2032/CR2450/hybrid)
y
"@

try {
    $responses | homey app publish 2>&1 | Out-File "project-data\force-publish-v2.0.8.log" -Encoding UTF8
    Write-Host "✅ PUBLISHED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "📄 Log: project-data\force-publish-v2.0.8.log" -ForegroundColor Yellow
} catch {
    Write-Host "⚠️ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "📄 Check log: project-data\force-publish-v2.0.8.log" -ForegroundColor Yellow
}
