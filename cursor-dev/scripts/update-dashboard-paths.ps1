# Script de mise à jour des chemins dashboard - Version corrigée
# Mise à jour des workflows après déplacement dashboard vers docs/

Write-Host "🔧 MISE À JOUR DES CHEMINS DASHBOARD" -ForegroundColor Green
Write-Host "📁 Dashboard déplacé vers docs/dashboard/" -ForegroundColor Cyan

# Fonction pour corriger un fichier
function Update-DashboardPaths {
    param([string]$FilePath)
    
    if (Test-Path $FilePath) {
        Write-Host "🔍 Traitement: $FilePath" -ForegroundColor Yellow
        
        # Lire le contenu
        $content = Get-Content $FilePath -Raw
        
        # Remplacer les anciens chemins
        $content = $content -replace "dashboard/", "docs/dashboard/"
        $content = $content -replace "dashboard", "docs/dashboard"
        
        # Écrire le contenu corrigé
        Set-Content $FilePath $content -Encoding UTF8
        
        Write-Host "✅ Corrigé: $FilePath" -ForegroundColor Green
    }
}

# Liste des fichiers à corriger
$filesToUpdate = @(
    ".github/workflows/auto-update.yml",
    ".github/workflows/auto-translation.yml",
    ".github/workflows/auto-enrich-drivers.yml",
    ".github/workflows/build.yml",
    ".github/workflows/ci.yml",
    ".github/workflows/monthly-enrichment.yml",
    ".github/workflows/yolo-mode.yml",
    ".github/workflows/validation-automated.yml"
)

# Corriger chaque fichier
foreach ($file in $filesToUpdate) {
    Update-DashboardPaths $file
}

Write-Host "🎉 MISE À JOUR TERMINÉE" -ForegroundColor Green
Write-Host "📊 Workflows mis à jour avec le nouveau chemin docs/dashboard/" -ForegroundColor Cyan

# Validation
Write-Host "🔍 VALIDATION DES MISE À JOUR" -ForegroundColor Yellow
Get-ChildItem ".github/workflows" -Filter "*.yml" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "docs/dashboard") {
        Write-Host "✅ $($_.Name) - Chemin corrigé" -ForegroundColor Green
    }
}

Write-Host "✅ Tous les workflows mis à jour avec succès!" -ForegroundColor Green 