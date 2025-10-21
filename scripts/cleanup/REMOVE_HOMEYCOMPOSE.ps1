#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Nettoie le répertoire .homeycompose/ (maintenant inutilisé)

.DESCRIPTION
    Avec le nouveau workflow d'édition directe de app.json,
    .homeycompose/ n'est plus nécessaire et peut être supprimé.
    
    Ce script:
    1. Vérifie si .homeycompose/ existe
    2. Crée un backup si demandé
    3. Supprime .homeycompose/
    4. Confirme que .homeycompose/ est bien dans .gitignore

.NOTES
    Author: Dylan Rajasekaram
    Date: 2025-10-21
    Version: 1.0.0
#>

Write-Host "`n🧹 CLEANUP .homeycompose/ DIRECTORY`n" -ForegroundColor Cyan

$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $rootDir

$homeycomposePath = Join-Path $rootDir ".homeycompose"
$gitignorePath = Join-Path $rootDir ".gitignore"

# Check if .homeycompose/ exists
if (-Not (Test-Path $homeycomposePath)) {
    Write-Host "✅ .homeycompose/ n'existe pas (déjà nettoyé)" -ForegroundColor Green
    exit 0
}

Write-Host "📁 .homeycompose/ trouvé: $homeycomposePath" -ForegroundColor Yellow

# Check size
$size = (Get-ChildItem $homeycomposePath -Recurse -File | Measure-Object -Property Length -Sum).Sum
$sizeMB = [math]::Round($size / 1MB, 2)

Write-Host "📊 Taille: $sizeMB MB" -ForegroundColor White

# Confirm deletion
Write-Host "`n⚠️  ATTENTION: Suppression de .homeycompose/" -ForegroundColor Yellow
Write-Host "   Avec le nouveau workflow, on édite app.json directement." -ForegroundColor White
Write-Host "   .homeycompose/ n'est plus nécessaire.`n" -ForegroundColor White

$confirmation = Read-Host "Voulez-vous créer un backup avant suppression? (y/N)"

if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
    $backupPath = Join-Path $rootDir ".homeycompose.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Write-Host "`n📦 Création backup: $backupPath" -ForegroundColor Cyan
    
    Copy-Item -Path $homeycomposePath -Destination $backupPath -Recurse -Force
    
    Write-Host "✅ Backup créé" -ForegroundColor Green
}

# Delete .homeycompose/
Write-Host "`n🗑️  Suppression .homeycompose/..." -ForegroundColor Cyan

Remove-Item -Path $homeycomposePath -Recurse -Force

if (Test-Path $homeycomposePath) {
    Write-Host "❌ Échec suppression" -ForegroundColor Red
    exit 1
}

Write-Host "✅ .homeycompose/ supprimé" -ForegroundColor Green

# Verify .gitignore
Write-Host "`n🔍 Vérification .gitignore..." -ForegroundColor Cyan

$gitignoreContent = Get-Content $gitignorePath -Raw

if ($gitignoreContent -match "\.homeycompose/") {
    Write-Host "✅ .homeycompose/ est bien dans .gitignore" -ForegroundColor Green
} else {
    Write-Host "⚠️  .homeycompose/ n'est PAS dans .gitignore" -ForegroundColor Yellow
    Write-Host "   Ajout dans .gitignore..." -ForegroundColor White
    
    Add-Content -Path $gitignorePath -Value "`n# Homey compose (workflow direct app.json)`n.homeycompose/"
    
    Write-Host "✅ Ajouté dans .gitignore" -ForegroundColor Green
}

Write-Host "`n" -NoNewline
Write-Host "🎉 CLEANUP TERMINÉ`n" -ForegroundColor Green

Write-Host "📝 Workflow actuel:" -ForegroundColor Cyan
Write-Host "   ✅ Éditer: app.json directement" -ForegroundColor White
Write-Host "   ✅ Build: homey app build" -ForegroundColor White
Write-Host "   ✅ Publish: homey app publish" -ForegroundColor White
Write-Host "   ✅ .homeycompose/: ignoré (gitignore)" -ForegroundColor White

Write-Host "`n📚 Documentation:" -ForegroundColor Cyan
Write-Host "   docs/workflow/DIRECT_APP_JSON_WORKFLOW.md`n" -ForegroundColor White
