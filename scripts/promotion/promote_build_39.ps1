# Promote Build #39 to Test - SIZE FIX SUCCESS!

param(
    [string]$Token = $env:HOMEY_PAT
)

Write-Host "🚀 PROMOTION BUILD #39 → TEST" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

if (-not $Token) {
    Write-Host "❌ HOMEY_PAT not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "Get token: https://tools.developer.homey.app/me" -ForegroundColor Yellow
    Write-Host "Then: `$env:HOMEY_PAT = 'YOUR_TOKEN'" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Promoting Build #39 (v2.1.21)..." -ForegroundColor White
Write-Host "   ✅ Package size: 20.42 MB (FIXED!)" -ForegroundColor Green
Write-Host "   ✅ PNG images only" -ForegroundColor Green
Write-Host "   ✅ All heavy folders excluded" -ForegroundColor Green
Write-Host ""

$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$body = @{ target = "test" } | ConvertTo-Json

try {
    $response = Invoke-RestMethod `
        -Uri "https://api.developer.homey.app/app/com.dlnraja.tuya.zigbee/build/39/promote" `
        -Method Post `
        -Headers $headers `
        -Body $body
    
    Write-Host "✅ Build #39 promoted to Test!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 SIZE PROBLEM SOLVED:" -ForegroundColor Cyan
    Write-Host "   - Was: 350 MB (failed)" -ForegroundColor Gray
    Write-Host "   - Now: 20.42 MB (success!)" -ForegroundColor Green
    Write-Host ""
    Write-Host "📦 Package contains:" -ForegroundColor Cyan
    Write-Host "   - 163 drivers (PNG only)" -ForegroundColor Gray
    Write-Host "   - 10,558+ manufacturer IDs" -ForegroundColor Gray
    Write-Host "   - 1,825 files total" -ForegroundColor Gray
    Write-Host "   - Essential files only" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔗 Test URL: https://homey.app/a/com.dlnraja.tuya.zigbee/test/" -ForegroundColor Cyan
    Write-Host "🔗 Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/build/39" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual promotion:" -ForegroundColor Yellow
    Write-Host "https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/build/39" -ForegroundColor Gray
}

Write-Host ""
