# SMART COMMIT: Commit intelligent avec mise à jour automatique
# Usage: .\smart-commit.ps1 "Votre message de commit"

param(
    [Parameter(Mandatory=$true)]
    [string]$Message
)

Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   SMART COMMIT AUTOMATIQUE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 1. Mise à jour automatique des docs
Write-Host "1️⃣  MISE À JOUR AUTOMATIQUE" -ForegroundColor Yellow
Write-Host "   → Mise à jour des liens, README & CHANGELOG..." -ForegroundColor White
& node scripts/automation/update-all-links.js | Out-Null

# 2. Ajouter tous les fichiers modifiés
Write-Host ""
Write-Host "2️⃣  AJOUT DES FICHIERS" -ForegroundColor Yellow
& git add -A
$status = & git status --short
if ($status) {
    Write-Host "   → Fichiers ajoutés:" -ForegroundColor White
    $status | ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
} else {
    Write-Host "   ⚠️  Aucun changement à commiter" -ForegroundColor Red
    exit 0
}

# 3. Commit avec le message fourni
Write-Host ""
Write-Host "3️⃣  COMMIT" -ForegroundColor Yellow
Write-Host "   → Message: $Message" -ForegroundColor White
& git commit -m $Message

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Commit réussi!" -ForegroundColor Green
} else {
    Write-Host "   ❌ Échec du commit" -ForegroundColor Red
    exit 1
}

# 4. Demander si on push
Write-Host ""
Write-Host "4️⃣  PUSH" -ForegroundColor Yellow
$push = Read-Host "   → Pusher vers GitHub? (o/N)"

if ($push -eq "o" -or $push -eq "O") {
    Write-Host "   → Push en cours..." -ForegroundColor White
    & git push origin master
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Push réussi!" -ForegroundColor Green
        Write-Host ""
        Write-Host "   🤖 GitHub Actions va:" -ForegroundColor Cyan
        Write-Host "      • Valider l'app" -ForegroundColor White
        Write-Host "      • Bumper la version" -ForegroundColor White
        Write-Host "      • Publier sur Homey App Store" -ForegroundColor White
        Write-Host "      • Mettre à jour la documentation" -ForegroundColor White
    } else {
        Write-Host "   ❌ Échec du push" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ℹ️  Push annulé. Pour pusher plus tard:" -ForegroundColor Cyan
    Write-Host "      git push origin master" -ForegroundColor White
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host "   ✅ SMART COMMIT TERMINÉ!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host ""
