# Promote Build #26 to Test - URGENT

param(
    [string]$Token = $env:HOMEY_PAT
)

Write-Host "🚀 PROMOTION BUILD #26 → TEST" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

if (-not $Token) {
    Write-Host "❌ HOMEY_PAT not set" -ForegroundColor Red
    Write-Host "Get token: https://tools.developer.homey.app/me" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Promoting Build #26 (v2.1.10)..." -ForegroundColor White
Write-Host ""

$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$body = @{ target = "test" } | ConvertTo-Json

try {
    $response = Invoke-RestMethod `
        -Uri "https://api.developer.homey.app/app/com.dlnraja.tuya.zigbee/build/26/promote" `
        -Method Post `
        -Headers $headers `
        -Body $body
    
    Write-Host "✅ Build #26 promoted to Test!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 Test URL: https://homey.app/a/com.dlnraja.tuya.zigbee/test/" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual promotion:" -ForegroundColor Yellow
    Write-Host "https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/build/26"
}

Write-Host ""
