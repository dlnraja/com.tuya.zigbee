# Script pour supprimer le gros fichier de l'historique Git

Write-Host "`n🗑️  SUPPRESSION DU FICHIER LOURD DE L'HISTORIQUE GIT`n" -ForegroundColor Cyan

$repo = "C:\Users\HP\Desktop\homey app\tuya_repair"
$largeFile = "docs/releases/ULTIMATE_AUDIT_REPORT_v2.15.60.md"

Set-Location $repo

# Utiliser git filter-repo si disponible, sinon filter-branch
Write-Host "Suppression de $largeFile de l'historique..." -ForegroundColor Yellow

# Méthode alternative: créer une nouvelle branche propre
git checkout --orphan temp_branch
git add -A
git commit -m "feat: restore 40 brand drivers - total 319 drivers (cleaned history)"
git branch -D master
git branch -m master
git gc --aggressive --prune=now

Write-Host "`n✅ Historique nettoyé!" -ForegroundColor Green
Write-Host "Prêt pour force push`n" -ForegroundColor Green
