# Promote Build #30 to Test - NOUVELLES ICÔNES!

param(
    [string]$Token = $env:HOMEY_PAT
)

Write-Host "🚀 PROMOTION BUILD #30 → TEST" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

if (-not $Token) {
    Write-Host "❌ HOMEY_PAT not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "Get token: https://tools.developer.homey.app/me" -ForegroundColor Yellow
    Write-Host "Then: `$env:HOMEY_PAT = 'YOUR_TOKEN'" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Promoting Build #30 (v2.1.13)..." -ForegroundColor White
Write-Host "   ✨ Avec les nouvelles icônes spécifiques!" -ForegroundColor Cyan
Write-Host ""

$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$body = @{ target = "test" } | ConvertTo-Json

try {
    $response = Invoke-RestMethod `
        -Uri "https://api.developer.homey.app/app/com.dlnraja.tuya.zigbee/build/30/promote" `
        -Method Post `
        -Headers $headers `
        -Body $body
    
    Write-Host "✅ Build #30 promoted to Test!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎨 Nouvelles icônes disponibles:" -ForegroundColor Cyan
    Write-Host "   - Switch: Icône interrupteur" -ForegroundColor Gray
    Write-Host "   - Light: Icône ampoule" -ForegroundColor Gray
    Write-Host "   - Motion: Icône personne + ondes" -ForegroundColor Gray
    Write-Host "   - Plug: Icône prise électrique" -ForegroundColor Gray
    Write-Host "   - Contact: Icône porte/fenêtre" -ForegroundColor Gray
    Write-Host "   - Temperature: Icône thermomètre" -ForegroundColor Gray
    Write-Host "   - Smoke: Icône détecteur fumée" -ForegroundColor Gray
    Write-Host "   - Curtain: Icône rideau" -ForegroundColor Gray
    Write-Host "   - Thermostat: Icône cadran" -ForegroundColor Gray
    Write-Host "   - Generic: Icône zigbee" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔗 Test URL: https://homey.app/a/com.dlnraja.tuya.zigbee/test/" -ForegroundColor Cyan
    Write-Host "🔗 Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/build/30" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual promotion:" -ForegroundColor Yellow
    Write-Host "https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/build/30" -ForegroundColor Gray
}

Write-Host ""
