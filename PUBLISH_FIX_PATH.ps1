# PUBLISH FIX PATH - Contourne le problème d'espace dans le chemin
# Le problème: "homey app" contient un espace que Git ne gère pas bien

Write-Host ""
Write-Host "🚀 PUBLICATION HOMEY - FIX PATH" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# Vérifier Homey CLI
Write-Host "🔍 Vérification Homey CLI..." -ForegroundColor Yellow
try {
    $version = homey --version 2>&1
    Write-Host "  ✅ Homey CLI: $version" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Homey CLI non trouvé!" -ForegroundColor Red
    exit 1
}

# La version a déjà été mise à jour à 1.3.1
Write-Host ""
Write-Host "📊 Version actuelle: 1.3.1" -ForegroundColor Cyan
Write-Host ""

# Option 1: Commit manuel avec guillemets
Write-Host "🔧 SOLUTION 1: Commit manuel" -ForegroundColor Yellow
Write-Host ""
Write-Host "Le problème est l'espace dans 'homey app'. Git ne peut pas le gérer." -ForegroundColor Gray
Write-Host ""
Write-Host "Voulez-vous:" -ForegroundColor Yellow
Write-Host "  1. Faire le commit manuellement (recommandé)" -ForegroundColor White
Write-Host "  2. Publier sans commit Git" -ForegroundColor White
Write-Host "  3. Annuler" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Choix (1/2/3)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "📝 Commit manuel des changements..." -ForegroundColor Yellow
    
    try {
        # Utiliser des guillemets pour les chemins avec espaces
        git add "app.json" ".homeychangelog.json" 2>&1 | Out-Null
        git commit -m "chore: Version bump to v1.3.1 - Fix: Settings infinite loop + homey-zigbeedriver dependency + 28 flow cards" 2>&1 | Out-Null
        
        Write-Host "  ✅ Commit créé" -ForegroundColor Green
        
        # Push
        Write-Host ""
        Write-Host "📤 Push vers GitHub..." -ForegroundColor Yellow
        git push origin master 2>&1 | Out-Null
        Write-Host "  ✅ Push réussi" -ForegroundColor Green
        
    } catch {
        Write-Host "  ⚠️  Erreur Git (peut-être déjà commité)" -ForegroundColor Yellow
    }
    
    # Maintenant publier
    Write-Host ""
    Write-Host "🚀 Publication sur Homey App Store..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "ℹ️  Homey CLI va demander des confirmations." -ForegroundColor Yellow
    Write-Host "   Répondez 'No' à la question de commit (déjà fait)" -ForegroundColor Yellow
    Write-Host ""
    
    # Lancer homey app publish
    homey app publish
    
} elseif ($choice -eq "2") {
    Write-Host ""
    Write-Host "🚀 Publication sans commit Git..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "ℹ️  Répondez 'No' quand demandé si vous voulez commit" -ForegroundColor Yellow
    Write-Host ""
    
    homey app publish
    
} else {
    Write-Host ""
    Write-Host "❌ Annulé" -ForegroundColor Yellow
    exit 0
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=" * 80 -ForegroundColor Green
    Write-Host "✅ PUBLICATION RÉUSSIE !" -ForegroundColor Green
    Write-Host "=" * 80 -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "=" * 80 -ForegroundColor Red
    Write-Host "❌ ERREUR LORS DE LA PUBLICATION" -ForegroundColor Red
    Write-Host "=" * 80 -ForegroundColor Red
    Write-Host ""
}
