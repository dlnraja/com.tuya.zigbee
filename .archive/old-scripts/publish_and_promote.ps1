# Script complet: Publish + Auto-Promote Draft→Test
# Utilise le token GitHub automatiquement

Write-Host "🚀 PUBLICATION AUTOMATIQUE + PROMOTION TEST" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
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

# Step 1: Publish
Write-Host "📦 ÉTAPE 1: Publication de l'app..." -ForegroundColor Cyan
Write-Host ""

try {
    # Login Homey
    Write-Host "   Login Homey..." -ForegroundColor Gray
    $loginOutput = homey login --bearer "$Token" 2>&1
    
    # Publish
    Write-Host "   Publication en cours..." -ForegroundColor Gray
    $publishOutput = homey app publish 2>&1 | Out-String
    
    Write-Host $publishOutput
    
    # Extract Build ID
    if ($publishOutput -match 'Created Build ID (\d+)') {
        $BuildID = $Matches[1]
        Write-Host ""
        Write-Host "✅ Build ID extrait: $BuildID" -ForegroundColor Green
    }
    else {
        Write-Host ""
        Write-Host "⚠️  Impossible d'extraire le Build ID" -ForegroundColor Yellow
        Write-Host "   Vérifier manuellement sur le dashboard" -ForegroundColor Yellow
        exit 1
    }
}
catch {
    Write-Host ""
    Write-Host "❌ Erreur lors de la publication: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Step 2: Auto-Promote
Write-Host "🎯 ÉTAPE 2: Promotion automatique Draft → Test..." -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 2

$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$body = @{
    target = "test"
} | ConvertTo-Json

try {
    Write-Host "   API Call: promote build/$BuildID..." -ForegroundColor Gray
    
    $response = Invoke-RestMethod `
        -Uri "https://api.developer.homey.app/app/com.dlnraja.tuya.zigbee/build/$BuildID/promote" `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -ContentType "application/json"
    
    Write-Host ""
    Write-Host "✅ Build #$BuildID promu vers Test avec succès!" -ForegroundColor Green
    Write-Host ""
    
    if ($response) {
        Write-Host "   Réponse API:" -ForegroundColor Gray
        Write-Host "   $($response | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
    }
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    Write-Host ""
    Write-Host "⚠️  Promotion échouée (Status: $statusCode)" -ForegroundColor Yellow
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    if ($statusCode -eq 401) {
        Write-Host "💡 Le token est invalide ou expiré" -ForegroundColor Yellow
        Write-Host "   Obtenir nouveau token: https://tools.developer.homey.app/me" -ForegroundColor Yellow
    }
    elseif ($statusCode -eq 404) {
        Write-Host "💡 Build #$BuildID non trouvé" -ForegroundColor Yellow
        Write-Host "   Vérifier le dashboard" -ForegroundColor Yellow
    }
    else {
        Write-Host "💡 Promotion manuelle requise" -ForegroundColor Yellow
        Write-Host "   Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/build/$BuildID" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔗 LIENS UTILES:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Build #$BuildID Dashboard:" -ForegroundColor White
Write-Host "   https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/build/$BuildID" -ForegroundColor Gray
Write-Host ""
Write-Host "   Test Installation:" -ForegroundColor White
Write-Host "   https://homey.app/a/com.dlnraja.tuya.zigbee/test/" -ForegroundColor Gray
Write-Host ""
Write-Host "   App Dashboard:" -ForegroundColor White
Write-Host "   https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee" -ForegroundColor Gray
Write-Host ""
Write-Host "🎉 TERMINÉ!" -ForegroundColor Green
Write-Host ""
