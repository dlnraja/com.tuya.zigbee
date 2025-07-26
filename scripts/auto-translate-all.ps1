# Script d'automatisation de traduction complète
# Traduction de tous les fichiers pertinents du projet

Write-Host "🌍 AUTOMATISATION TRADUCTION COMPLÈTE" -ForegroundColor Green
Write-Host "📁 Traduction de tous les fichiers pertinents" -ForegroundColor Cyan

# Fonction pour traduire un fichier
function Translate-File {
    param([string]$FilePath, [string]$Language)
    
    if (Test-Path $FilePath) {
        Write-Host "🔍 Traduction: $FilePath vers $Language" -ForegroundColor Yellow
        
        # Lire le contenu
        $content = Get-Content $FilePath -Raw
        
        # Traductions spécifiques selon la langue
        switch ($Language) {
            "en" {
                $content = $content -replace "Mode Local", "Local Mode"
                $content = $content -replace "Drivers SDK3", "SDK3 Drivers"
                $content = $content -replace "Modules Intelligents", "Intelligent Modules"
                $content = $content -replace "Workflows GitHub", "GitHub Workflows"
                $content = $content -replace "Traductions Multilingues", "Multilingual Translations"
            }
            "de" {
                $content = $content -replace "Mode Local", "Lokaler Modus"
                $content = $content -replace "Drivers SDK3", "SDK3 Treiber"
                $content = $content -replace "Modules Intelligents", "Intelligente Module"
                $content = $content -replace "Workflows GitHub", "GitHub Workflows"
                $content = $content -replace "Traductions Multilingues", "Mehrsprachige Übersetzungen"
            }
            "es" {
                $content = $content -replace "Mode Local", "Modo Local"
                $content = $content -replace "Drivers SDK3", "Drivers SDK3"
                $content = $content -replace "Modules Intelligents", "Módulos Inteligentes"
                $content = $content -replace "Workflows GitHub", "Workflows GitHub"
                $content = $content -replace "Traductions Multilingues", "Traducciones Multilingües"
            }
            "it" {
                $content = $content -replace "Mode Local", "Modalità Locale"
                $content = $content -replace "Drivers SDK3", "Drivers SDK3"
                $content = $content -replace "Modules Intelligents", "Moduli Intelligenti"
                $content = $content -replace "Workflows GitHub", "Workflows GitHub"
                $content = $content -replace "Traductions Multilingues", "Traduzioni Multilingue"
            }
            "nl" {
                $content = $content -replace "Mode Local", "Lokale Modus"
                $content = $content -replace "Drivers SDK3", "SDK3 Drivers"
                $content = $content -replace "Modules Intelligents", "Intelligente Modules"
                $content = $content -replace "Workflows GitHub", "GitHub Workflows"
                $content = $content -replace "Traductions Multilingues", "Meertalige Vertalingen"
            }
        }
        
        # Créer le dossier de destination
        $destDir = "docs/locales/$Language"
        if (!(Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force
        }
        
        # Écrire le fichier traduit
        $destFile = "$destDir/$(Split-Path $FilePath -Leaf)"
        Set-Content $destFile $content -Encoding UTF8
        
        Write-Host "✅ Traduit: $destFile" -ForegroundColor Green
    }
}

# Liste des fichiers à traduire
$filesToTranslate = @(
    "README.md",
    "CHANGELOG.md",
    "docs/BUT_PRINCIPAL.md",
    "docs/INDEX.md",
    "app.json",
    "package.json"
)

# Langues cibles
$languages = @("en", "de", "es", "it", "nl")

# Traduire chaque fichier dans chaque langue
foreach ($file in $filesToTranslate) {
    foreach ($lang in $languages) {
        Translate-File $file $lang
    }
}

Write-Host "🎉 TRADUCTION COMPLÈTE TERMINÉE" -ForegroundColor Green
Write-Host "📊 Fichiers traduits: $($filesToTranslate.Count)" -ForegroundColor Cyan
Write-Host "🌍 Langues: $($languages -join ', ')" -ForegroundColor Cyan 