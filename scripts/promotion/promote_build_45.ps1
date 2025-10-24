# Script de promotion Build #45 → Test
# Usage: $env:HOMEY_PAT = "YOUR_TOKEN" ; .\promote_build_45.ps1

Write-Host "🚀 PROMOTION BUILD #45 VERS TEST" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check token
$Token = $env:HOMEY_PAT
if (-not $Token) {
    Write-Host "❌ Error: HOMEY_PAT not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "Obtenir le token:" -ForegroundColor Yellow
    Write-Host "  https://tools.developer.homey.app/me" -ForegroundColor White
    Write-Host ""
    Write-Host "Puis définir:" -ForegroundColor Yellow
    Write-Host '  $env:HOMEY_PAT = "VOTRE_TOKEN_ICI"' -ForegroundColor White
    exit 1
}

Write-Host "✅ Token trouvé" -ForegroundColor Green
Write-Host ""

$BuildID = 45
$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$body = @{
    target = "test"
} | ConvertTo-Json

try {
    Write-Host "🚀 Promotion du Build #$BuildID vers Test..." -ForegroundColor Cyan
    
    $response = Invoke-RestMethod `
        -Uri "https://api.developer.homey.app/app/com.dlnraja.tuya.zigbee/build/$BuildID/promote" `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -ContentType "application/json"
    
    Write-Host ""
    Write-Host "✅ Build #$BuildID promu vers Test avec succès!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 Test URL: https://homey.app/a/com.dlnraja.tuya.zigbee/test/" -ForegroundColor Cyan
    Write-Host "🔗 Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/build/$BuildID" -ForegroundColor Cyan
    Write-Host ""
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    Write-Host ""
    Write-Host "⚠️ Promotion échouée (Status: $statusCode)" -ForegroundColor Yellow
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    if ($statusCode -eq 401) {
        Write-Host "💡 Le token est invalide ou expiré" -ForegroundColor Yellow
        Write-Host "   Obtenir nouveau token: https://tools.developer.homey.app/me" -ForegroundColor Yellow
    }
    elseif ($statusCode -eq 404) {
        Write-Host "💡 Build #$BuildID non trouvé" -ForegroundColor Yellow
    }
    elseif ($statusCode -eq 400) {
        Write-Host "💡 Build déjà promu ou invalide" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎉 TERMINÉ!" -ForegroundColor Green
Write-Host ""
