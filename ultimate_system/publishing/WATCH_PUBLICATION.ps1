# WATCH_PUBLICATION - Surveillance continue de la publication
Write-Host "🔄 WATCH_PUBLICATION - Surveillance continue" -ForegroundColor Cyan

$maxChecks = 10
$checkInterval = 30
$currentCheck = 0

Write-Host "📊 MONITORING SETUP:" -ForegroundColor Yellow
Write-Host "   • Max checks: $maxChecks"
Write-Host "   • Intervalle: ${checkInterval}s"
Write-Host "   • GitHub Actions: https://github.com/dlnraja/com.tuya.zigbee/actions"
Write-Host "   • Homey Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub"

while ($currentCheck -lt $maxChecks) {
    $currentCheck++
    
    Write-Host "`n🔍 Check #$currentCheck/$maxChecks - $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Green
    
    try {
        # Vérifier l'état Git local
        $gitStatus = git status --porcelain 2>$null
        
        if ($gitStatus) {
            Write-Host "⚠️  Changements locaux détectés - commit en cours..." -ForegroundColor Yellow
            git add .
            git commit -m "🔧 Auto-fix during monitoring"
            git push origin master
            Write-Host "✅ Changements synchronisés" -ForegroundColor Green
        }
        
        # Vérifier la validation Homey
        Write-Host "✅ Validation locale..." -ForegroundColor Cyan
        $validation = homey app validate 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ App valide" -ForegroundColor Green
        } else {
            Write-Host "❌ App invalide - lancement FALLBACK" -ForegroundColor Red
            node ultimate_system/publishing/FALLBACK_PUBLISH.js
            break
        }
        
        Write-Host "📈 Status: Publication en cours via GitHub Actions" -ForegroundColor Blue
        Write-Host "🔗 Vérifiez: https://github.com/dlnraja/com.tuya.zigbee/actions"
        
    } catch {
        Write-Host "❌ Erreur monitoring: $($_.Exception.Message)" -ForegroundColor Red
        
        # En cas d'erreur, lancer le fallback
        Write-Host "🆘 Lancement publication de secours..." -ForegroundColor Yellow
        node ultimate_system/publishing/FALLBACK_PUBLISH.js
        break
    }
    
    if ($currentCheck -lt $maxChecks) {
        Write-Host "⏳ Attente ${checkInterval}s..." -ForegroundColor Gray
        Start-Sleep -Seconds $checkInterval
    }
}

Write-Host "`n🏁 MONITORING TERMINÉ" -ForegroundColor Magenta
Write-Host "📊 Consultez les liens ci-dessus pour le statut final"
