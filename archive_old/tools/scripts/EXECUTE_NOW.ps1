# ============================================================================
# EXÉCUTER MAINTENANT - Publication Intelligente
# ============================================================================

Write-Host "🧠 PUBLICATION INTELLIGENTE v1.1.7" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# 1. Commit des corrections workflows
Write-Host "📦 1. Commit corrections workflows..." -ForegroundColor Yellow
git add .github/workflows/
git add PUBLISH_GUIDE.md
git commit -m "🔧 Fix workflows intelligently - Disable duplicates, add clean workflow"

# 2. Push
Write-Host "`n📤 2. Push vers GitHub..." -ForegroundColor Yellow
git push origin master

Write-Host "`n✅ Workflows corrigés et pushés!" -ForegroundColor Green

# 3. Afficher options
Write-Host "`n" -ForegroundColor White
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "📊 OPTIONS DE PUBLICATION" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

Write-Host "`n🎯 OPTION 1: Publication Manuelle (RECOMMANDÉE)" -ForegroundColor Green
Write-Host "   Commande: homey app publish" -ForegroundColor White
Write-Host "   Avantages: Contrôle total, feedback immédiat" -ForegroundColor Gray

Write-Host "`n🎯 OPTION 2: GitHub Actions" -ForegroundColor Yellow
Write-Host "   Le workflow 'publish-clean.yml' est maintenant actif" -ForegroundColor White
Write-Host "   Trigger: Le push ci-dessus a déjà déclenché le workflow" -ForegroundColor Gray
Write-Host "   Monitor: https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor Gray

Write-Host "`n🎯 OPTION 3: Trigger Manuel GitHub" -ForegroundColor Yellow
Write-Host "   1. Aller sur: https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor White
Write-Host "   2. Sélectionner 'Homey App Publication'" -ForegroundColor White
Write-Host "   3. Cliquer 'Run workflow'" -ForegroundColor White

Write-Host "`n" -ForegroundColor White
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "💡 RECOMMANDATION" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

Write-Host "`nPour publier MAINTENANT avec contrôle total:" -ForegroundColor White
Write-Host "`n   homey app publish" -ForegroundColor Green -BackgroundColor Black
Write-Host "`nPuis suivre les prompts interactifs.`n" -ForegroundColor Gray

Write-Host "🔗 Dashboard: https://tools.developer.homey.app/apps`n" -ForegroundColor Cyan

# Demander si l'utilisateur veut publier maintenant
Write-Host "Voulez-vous publier maintenant ? (o/n): " -ForegroundColor Yellow -NoNewline
$response = Read-Host

if ($response -eq "o" -or $response -eq "O") {
    Write-Host "`n🚀 Lancement publication..." -ForegroundColor Green
    homey app publish
} else {
    Write-Host "`nℹ️  Publication reportée. Exécutez 'homey app publish' quand prêt.`n" -ForegroundColor Cyan
}
