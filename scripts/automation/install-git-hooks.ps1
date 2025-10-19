# Installation des Git Hooks
# Cree un lien symbolique vers nos hooks personnalises

Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "Installation des Git Hooks..." -ForegroundColor Cyan

# Configurer Git pour utiliser notre dossier de hooks
& git config core.hooksPath .githooks

if ($LASTEXITCODE -eq 0) {
    Write-Host "Git hooks installes!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Hooks actifs:" -ForegroundColor Yellow
    Write-Host "  pre-commit: Mise a jour automatique docs" -ForegroundColor White
    Write-Host ""
    Write-Host "A chaque commit, les liens et docs seront mis a jour automatiquement!" -ForegroundColor Cyan
} else {
    Write-Host "Echec de l'installation" -ForegroundColor Red
}
