# PRE-COMMIT: Mise à jour automatique des liens et docs
# S'exécute avant chaque commit pour maintenir les docs à jour

Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "🔄 Pre-commit: Mise à jour automatique..." -ForegroundColor Cyan

# 1. Mettre à jour tous les liens et chemins
Write-Host "  → Mise à jour des liens..." -ForegroundColor Yellow
& node scripts/automation/update-all-links.js

# 2. Vérifier s'il y a des changements
$changes = & git status --porcelain
if ($changes) {
    Write-Host "  → Changements détectés, ajout au commit..." -ForegroundColor Yellow
    & git add README.md CHANGELOG.md docs/ -ErrorAction SilentlyContinue
    Write-Host "  ✅ Docs mis à jour et ajoutées au commit" -ForegroundColor Green
} else {
    Write-Host "  ✓ Aucun changement nécessaire" -ForegroundColor Green
}

Write-Host ""
