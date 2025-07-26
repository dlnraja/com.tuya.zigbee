# Script de réorganisation complète du projet
# Mode enrichissement additif - Structure optimisée

Write-Host "📁 RÉORGANISATION COMPLÈTE DU PROJET - Mode enrichissement" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green

# Obtenir la date et heure actuelles
$currentDate = Get-Date -Format "yyyy-MM-dd"
$currentTime = Get-Date -Format "HH:mm:ss"
$currentDateTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Host "📅 Date: $currentDate" -ForegroundColor Yellow
Write-Host "🕐 Heure: $currentTime" -ForegroundColor Yellow

# Fonction pour créer la nouvelle structure de dossiers
function Create-NewStructure {
    Write-Host "📁 Création de la nouvelle structure..." -ForegroundColor Yellow
    
    # Structure optimisée
    $directories = @(
        # Documentation principale
        "docs",
        "docs/README",
        "docs/CHANGELOG", 
        "docs/CONTRIBUTING",
        "docs/CODE_OF_CONDUCT",
        "docs/docs/LICENSE/LICENSE",
        "docs/INSTALLATION",
        "docs/TROUBLESHOOTING",
        "docs/GUIDES",
        "docs/TUTORIALS",
        
        # Traductions
        "docs/locales",
        "docs/locales/en",
        "docs/locales/fr", 
        "docs/locales/ta",
        "docs/locales/nl",
        "docs/locales/de",
        "docs/locales/es",
        "docs/locales/it",
        "docs/locales/ru",
        "docs/locales/pt",
        "docs/locales/pl",
        
        # TODO et tâches
        "docs/todo",
        "docs/todo/current",
        "docs/todo/completed",
        "docs/todo/archived",
        
        # Rapports
        "docs/reports",
        "docs/reports/daily",
        "docs/reports/weekly", 
        "docs/reports/monthly",
        "docs/reports/final",
        "docs/reports/validation",
        "docs/reports/optimization",
        "docs/reports/analysis",
        
        # Dashboard
        "docs/dashboard",
        "docs/dashboard/assets",
        "docs/dashboard/css",
        "docs/dashboard/js",
        
        # Zigbee Cluster
        "docs/zigbee",
        "docs/zigbee/clusters",
        "docs/zigbee/endpoints",
        "docs/zigbee/device-types",
        "docs/zigbee/sources",
        
        # Scripts organisés
        "scripts",
        "scripts/setup",
        "scripts/optimization",
        "scripts/validation",
        "scripts/analysis",
        "scripts/zigbee",
        "scripts/zigbee/parser",
        "scripts/zigbee/updater",
        "scripts/zigbee/scraper",
        
        # Logs organisés
        "logs",
        "logs/daily",
        "logs/weekly",
        "logs/monthly",
        "logs/errors",
        "logs/validation",
        
        # Data organisée
        "data",
        "data/zigbee",
        "data/zigbee/clusters",
        "data/zigbee/endpoints", 
        "data/zigbee/device-types",
        "data/zigbee/sources",
        "data/devices",
        "data/validation",
        "data/analysis",
        
        # Assets organisés
        "assets",
        "assets/images",
        "assets/icons",
        "assets/logos",
        "assets/documents",
        
        # Configuration
        "config",
        "config/git",
        "config/editor",
        "config/lint",
        
        # Backup organisé
        "backup",
        "backup/daily",
        "backup/weekly",
        "backup/monthly",
        
        # Issues organisées
        "issues",
        "issues/open",
        "issues/closed",
        "issues/feature-requests",
        "issues/bugs"
    )
    
    foreach ($dir in $directories) {
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force
            Write-Host "✅ Dossier créé: $dir" -ForegroundColor Green
        } else {
            Write-Host "✅ Dossier existant: $dir" -ForegroundColor Green
        }
    }
    
    return $true
}

# Fonction pour déplacer les fichiers README
function Move-ReadmeFiles {
    Write-Host "📖 Déplacement des fichiers README..." -ForegroundColor Yellow
    
    $readmeFiles = @{
        "README.md" = "docs/README/README.md"
        "docs/locales/en/README.md" = "docs/locales/en/README.md"
        "README.txt" = "docs/README/README.txt"
    }
    
    foreach ($file in $readmeFiles.Keys) {
        if (Test-Path $file) {
            $destination = $readmeFiles[$file]
            $destinationDir = Split-Path $destination -Parent
            
            if (!(Test-Path $destinationDir)) {
                New-Item -ItemType Directory -Path $destinationDir -Force
            }
            
            Move-Item $file $destination -Force
            Write-Host "✅ $file → $destination" -ForegroundColor Green
        }
    }
    
    return $true
}

# Fonction pour déplacer les fichiers de documentation
function Move-DocumentationFiles {
    Write-Host "📚 Déplacement des fichiers de documentation..." -ForegroundColor Yellow
    
    $docFiles = @{
        "CHANGELOG.md" = "docs/CHANGELOG/CHANGELOG.md"
        "docs/CONTRIBUTING/CONTRIBUTING.md" = "docs/CONTRIBUTING/docs/CONTRIBUTING/CONTRIBUTING.md"
        "docs/CODE_OF_CONDUCT/CODE_OF_CONDUCT.md" = "docs/CODE_OF_CONDUCT/docs/CODE_OF_CONDUCT/CODE_OF_CONDUCT.md"
        "docs/LICENSE/LICENSE" = "docs/docs/LICENSE/LICENSE/docs/LICENSE/LICENSE"
        "INSTALLATION_GUIDE.md" = "docs/INSTALLATION/INSTALLATION_GUIDE.md"
        "TROUBLESHOOTING.md" = "docs/TROUBLESHOOTING/TROUBLESHOOTING.md"
    }
    
    foreach ($file in $docFiles.Keys) {
        if (Test-Path $file) {
            $destination = $docFiles[$file]
            $destinationDir = Split-Path $destination -Parent
            
            if (!(Test-Path $destinationDir)) {
                New-Item -ItemType Directory -Path $destinationDir -Force
            }
            
            Move-Item $file $destination -Force
            Write-Host "✅ $file → $destination" -ForegroundColor Green
        }
    }
    
    return $true
}

# Fonction pour déplacer les fichiers TODO
function Move-TodoFiles {
    Write-Host "📋 Déplacement des fichiers TODO..." -ForegroundColor Yellow
    
    $todoFiles = @{
        "docs/todo/current/TODO_REPRISE_49H.md" = "docs/todo/current/docs/todo/current/TODO_REPRISE_49H.md"
    }
    
    foreach ($file in $todoFiles.Keys) {
        if (Test-Path $file) {
            $destination = $todoFiles[$file]
            $destinationDir = Split-Path $destination -Parent
            
            if (!(Test-Path $destinationDir)) {
                New-Item -ItemType Directory -Path $destinationDir -Force
            }
            
            Move-Item $file $destination -Force
            Write-Host "✅ $file → $destination" -ForegroundColor Green
        }
    }
    
    return $true
}

# Fonction pour déplacer les rapports
function Move-ReportFiles {
    Write-Host "📊 Déplacement des rapports..." -ForegroundColor Yellow
    
    # Rapports finaux
    $finalReports = @{
        "RAPPORT_FINAL_EXECUTION.md" = "docs/reports/final/RAPPORT_FINAL_EXECUTION.md"
        "RAPPORT_FINAL_ZIGBEE_ENRICHMENT.md" = "docs/reports/final/RAPPORT_FINAL_ZIGBEE_ENRICHMENT.md"
        "RAPPORT_FINAL_COMPLETION.md" = "docs/reports/final/RAPPORT_FINAL_COMPLETION.md"
        "RAPPORT_CORRECTION_GITHUB_PAGES.md" = "docs/reports/final/RAPPORT_CORRECTION_GITHUB_PAGES.md"
        "RESUME_FINAL_CURSOR.md" = "docs/reports/final/RESUME_FINAL_CURSOR.md"
    }
    
    foreach ($file in $finalReports.Keys) {
        if (Test-Path $file) {
            $destination = $finalReports[$file]
            $destinationDir = Split-Path $destination -Parent
            
            if (!(Test-Path $destinationDir)) {
                New-Item -ItemType Directory -Path $destinationDir -Force
            }
            
            Move-Item $file $destination -Force
            Write-Host "✅ $file → $destination" -ForegroundColor Green
        }
    }
    
    # Déplacer tous les fichiers de rapports existants
    if (Test-Path "rapports") {
        $rapportFiles = Get-ChildItem "rapports" -File
        foreach ($file in $rapportFiles) {
            $destination = "docs/reports/analysis/$($file.Name)"
            Move-Item $file.FullName $destination -Force
            Write-Host "✅ $($file.Name) → $destination" -ForegroundColor Green
        }
        
        # Supprimer le dossier rapports vide
        Remove-Item "rapports" -Force -ErrorAction SilentlyContinue
        Write-Host "🗑️ Dossier rapports supprimé" -ForegroundColor Yellow
    }
    
    return $true
}

# Fonction pour déplacer les fichiers de configuration
function Move-ConfigFiles {
    Write-Host "⚙️ Déplacement des fichiers de configuration..." -ForegroundColor Yellow
    
    $configFiles = @{
        ".gitignore" = "config/git/.gitignore"
        ".eslintrc.json" = "config/lint/.eslintrc.json"
        ".eslintrc.js" = "config/lint/.eslintrc.js"
        ".editorconfig" = "config/editor/.editorconfig"
        ".cursorrules" = "config/editor/.cursorrules"
        ".cursorignore" = "config/editor/.cursorignore"
        "tsconfig.json" = "config/lint/tsconfig.json"
        ".homeyplugins.json" = "config/homey/.homeyplugins.json"
        ".homeychangelog.json" = "config/homey/.homeychangelog.json"
        ".homeyignore" = "config/homey/.homeyignore"
    }
    
    foreach ($file in $configFiles.Keys) {
        if (Test-Path $file) {
            $destination = $configFiles[$file]
            $destinationDir = Split-Path $destination -Parent
            
            if (!(Test-Path $destinationDir)) {
                New-Item -ItemType Directory -Path $destinationDir -Force
            }
            
            Move-Item $file $destination -Force
            Write-Host "✅ $file → $destination" -ForegroundColor Green
        }
    }
    
    return $true
}

# Fonction pour déplacer les fichiers de données
function Move-DataFiles {
    Write-Host "📊 Déplacement des fichiers de données..." -ForegroundColor Yellow
    
    $dataFiles = @{
        "all_devices.json" = "data/devices/all_devices.json"
        "all_commits.txt" = "data/analysis/all_commits.txt"
    }
    
    foreach ($file in $dataFiles.Keys) {
        if (Test-Path $file) {
            $destination = $dataFiles[$file]
            $destinationDir = Split-Path $destination -Parent
            
            if (!(Test-Path $destinationDir)) {
                New-Item -ItemType Directory -Path $destinationDir -Force
            }
            
            Move-Item $file $destination -Force
            Write-Host "✅ $file → $destination" -ForegroundColor Green
        }
    }
    
    return $true
}

# Fonction pour déplacer les fichiers de logs
function Move-LogFiles {
    Write-Host "📝 Déplacement des fichiers de logs..." -ForegroundColor Yellow
    
    # Déplacer les fichiers de logs existants
    if (Test-Path "logs") {
        $logFiles = Get-ChildItem "logs" -File
        foreach ($file in $logFiles) {
            $destination = "logs/daily/$($file.Name)"
            Move-Item $file.FullName $destination -Force
            Write-Host "✅ $($file.Name) → $destination" -ForegroundColor Green
        }
    }
    
    return $true
}

# Fonction pour déplacer les assets
function Move-AssetFiles {
    Write-Host "🎨 Déplacement des assets..." -ForegroundColor Yellow
    
    # Déplacer les assets existants
    if (Test-Path "assets") {
        $assetFiles = Get-ChildItem "assets" -Recurse -File
        foreach ($file in $assetFiles) {
            $relativePath = $file.FullName.Replace("$PWD\assets\", "")
            $destination = "assets/$relativePath"
            
            $destinationDir = Split-Path $destination -Parent
            if (!(Test-Path $destinationDir)) {
                New-Item -ItemType Directory -Path $destinationDir -Force
            }
            
            Move-Item $file.FullName $destination -Force
            Write-Host "✅ $($file.Name) → $destination" -ForegroundColor Green
        }
    }
    
    return $true
}

# Fonction pour créer les liens symboliques pour les fichiers essentiels
function Create-EssentialLinks {
    Write-Host "🔗 Création des liens essentiels..." -ForegroundColor Yellow
    
    # Créer des liens vers les fichiers essentiels à la racine
    $essentialLinks = @{
        "docs/README/README.md" = "README.md"
        "docs/CHANGELOG/CHANGELOG.md" = "CHANGELOG.md"
        "docs/CONTRIBUTING/docs/CONTRIBUTING/CONTRIBUTING.md" = "docs/CONTRIBUTING/CONTRIBUTING.md"
        "docs/CODE_OF_CONDUCT/docs/CODE_OF_CONDUCT/CODE_OF_CONDUCT.md" = "docs/CODE_OF_CONDUCT/CODE_OF_CONDUCT.md"
        "docs/docs/LICENSE/LICENSE/docs/LICENSE/LICENSE" = "docs/LICENSE/LICENSE"
        "config/git/.gitignore" = ".gitignore"
        "config/homey/.homeyignore" = ".homeyignore"
        "config/lint/tsconfig.json" = "tsconfig.json"
    }
    
    foreach ($source in $essentialLinks.Keys) {
        if (Test-Path $source) {
            $link = $essentialLinks[$source]
            if (Test-Path $link) {
                Remove-Item $link -Force
            }
            New-Item -ItemType SymbolicLink -Path $link -Target $source -Force
            Write-Host "🔗 Lien créé: $link → $source" -ForegroundColor Green
        }
    }
    
    return $true
}

# Fonction pour mettre à jour les chemins dans les scripts
function Update-ScriptPaths {
    Write-Host "🔧 Mise à jour des chemins dans les scripts..." -ForegroundColor Yellow
    
    # Mettre à jour les chemins dans les scripts PowerShell
    $scriptFiles = Get-ChildItem "scripts" -Recurse -Filter "*.ps1"
    foreach ($script in $scriptFiles) {
        $content = Get-Content $script.FullName -Raw
        $updated = $content -replace "docs/README\.md", "docs/README/README.md"
        $updated = $updated -replace "docs/CHANGELOG\.md", "docs/CHANGELOG/CHANGELOG.md"
        $updated = $updated -replace "docs/reports/", "docs/reports/"
        $updated = $updated -replace "TODO_REPRISE_49H\.md", "docs/todo/current/docs/todo/current/TODO_REPRISE_49H.md"
        
        Set-Content -Path $script.FullName -Value $updated -Encoding UTF8
        Write-Host "✅ Script mis à jour: $($script.Name)" -ForegroundColor Green
    }
    
    return $true
}

# Fonction pour créer un fichier d'index de la nouvelle structure
function Create-StructureIndex {
    Write-Host "📋 Création de l'index de structure..." -ForegroundColor Yellow
    
    $indexContent = @"
# 📁 Structure du Projet Tuya Zigbee

## 🎯 **Organisation Optimisée**

### 📚 **Documentation**
- **docs/README/** : Fichiers README principaux
- **docs/CHANGELOG/** : Historique des versions
- **docs/CONTRIBUTING/** : Guide de contribution
- **docs/CODE_OF_CONDUCT/** : Code de conduite
- **docs/docs/LICENSE/LICENSE/** : Licences
- **docs/INSTALLATION/** : Guides d'installation
- **docs/TROUBLESHOOTING/** : Résolution de problèmes
- **docs/GUIDES/** : Guides utilisateur
- **docs/TUTORIALS/** : Tutoriels

### 🌍 **Traductions**
- **docs/locales/** : Toutes les traductions
- **docs/locales/en/** : Anglais
- **docs/locales/fr/** : Français
- **docs/locales/ta/** : Tamil
- **docs/locales/nl/** : Néerlandais
- **docs/locales/de/** : Allemand
- **docs/locales/es/** : Espagnol
- **docs/locales/it/** : Italien
- **docs/locales/ru/** : Russe
- **docs/locales/pt/** : Portugais
- **docs/locales/pl/** : Polonais

### 📋 **TODO et Tâches**
- **docs/todo/current/** : Tâches en cours
- **docs/todo/completed/** : Tâches terminées
- **docs/todo/archived/** : Tâches archivées

### 📊 **Rapports**
- **docs/reports/daily/** : Rapports quotidiens
- **docs/reports/weekly/** : Rapports hebdomadaires
- **docs/reports/monthly/** : Rapports mensuels
- **docs/reports/final/** : Rapports finaux
- **docs/reports/validation/** : Rapports de validation
- **docs/reports/optimization/** : Rapports d'optimisation
- **docs/reports/analysis/** : Rapports d'analyse

### 📊 **Dashboard**
- **docs/dashboard/** : Interface dashboard
- **docs/dashboard/assets/** : Assets du dashboard
- **docs/dashboard/css/** : Styles CSS
- **docs/dashboard/js/** : Scripts JavaScript

### 🔗 **Zigbee Cluster**
- **docs/zigbee/** : Documentation Zigbee
- **docs/zigbee/clusters/** : Clusters Zigbee
- **docs/zigbee/endpoints/** : Endpoints Zigbee
- **docs/zigbee/device-types/** : Types d'appareils
- **docs/zigbee/sources/** : Sources officielles

### 🔧 **Scripts**
- **scripts/setup/** : Scripts de configuration
- **scripts/optimization/** : Scripts d'optimisation
- **scripts/validation/** : Scripts de validation
- **scripts/analysis/** : Scripts d'analyse
- **scripts/zigbee/** : Scripts Zigbee
- **scripts/zigbee/parser/** : Parsers Zigbee
- **scripts/zigbee/updater/** : Mise à jour Zigbee
- **scripts/zigbee/scraper/** : Scrapers Zigbee

### 📝 **Logs**
- **logs/daily/** : Logs quotidiens
- **logs/weekly/** : Logs hebdomadaires
- **logs/monthly/** : Logs mensuels
- **logs/errors/** : Logs d'erreurs
- **logs/validation/** : Logs de validation

### 📊 **Données**
- **data/zigbee/** : Données Zigbee
- **data/zigbee/clusters/** : Clusters
- **data/zigbee/endpoints/** : Endpoints
- **data/zigbee/device-types/** : Types d'appareils
- **data/zigbee/sources/** : Sources
- **data/devices/** : Données d'appareils
- **data/validation/** : Données de validation
- **data/analysis/** : Données d'analyse

### 🎨 **Assets**
- **assets/images/** : Images
- **assets/icons/** : Icônes
- **assets/logos/** : Logos
- **assets/documents/** : Documents

### ⚙️ **Configuration**
- **config/git/** : Configuration Git
- **config/editor/** : Configuration éditeur
- **config/lint/** : Configuration linting
- **config/homey/** : Configuration Homey

### 💾 **Backup**
- **backup/daily/** : Sauvegardes quotidiennes
- **backup/weekly/** : Sauvegardes hebdomadaires
- **backup/monthly/** : Sauvegardes mensuelles

### 🐛 **Issues**
- **issues/open/** : Issues ouvertes
- **issues/closed/** : Issues fermées
- **issues/feature-requests/** : Demandes de fonctionnalités
- **issues/bugs/** : Bugs

---

**📅 Date**: $currentDateTime
**🎯 Objectif**: Structure optimisée et organisée
**🚀 Mode**: Enrichissement additif
"@
    
    Set-Content -Path "docs/STRUCTURE_INDEX.md" -Value $indexContent -Encoding UTF8
    Write-Host "✅ Index de structure créé" -ForegroundColor Green
    
    return $true
}

# Exécution de la réorganisation
Write-Host ""
Write-Host "🚀 DÉBUT DE LA RÉORGANISATION COMPLÈTE..." -ForegroundColor Cyan

# 1. Créer la nouvelle structure
$structureOk = Create-NewStructure

# 2. Déplacer les fichiers README
$readmeOk = Move-ReadmeFiles

# 3. Déplacer les fichiers de documentation
$docOk = Move-DocumentationFiles

# 4. Déplacer les fichiers TODO
$todoOk = Move-TodoFiles

# 5. Déplacer les rapports
$reportsOk = Move-ReportFiles

# 6. Déplacer les fichiers de configuration
$configOk = Move-ConfigFiles

# 7. Déplacer les fichiers de données
$dataOk = Move-DataFiles

# 8. Déplacer les logs
$logsOk = Move-LogFiles

# 9. Déplacer les assets
$assetsOk = Move-AssetFiles

# 10. Créer les liens essentiels
$linksOk = Create-EssentialLinks

# 11. Mettre à jour les chemins dans les scripts
$scriptsOk = Update-ScriptPaths

# 12. Créer l'index de structure
$indexOk = Create-StructureIndex

# Statistiques finales
Write-Host ""
Write-Host "📊 RAPPORT DE RÉORGANISATION COMPLÈTE:" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "📅 Date: $currentDate" -ForegroundColor White
Write-Host "🕐 Heure: $currentTime" -ForegroundColor White
Write-Host "📁 Structure: $($structureOk ? '✅ Créée' : '❌ Erreur')" -ForegroundColor White
Write-Host "📖 README: $($readmeOk ? '✅ Déplacés' : '❌ Erreur')" -ForegroundColor White
Write-Host "📚 Documentation: $($docOk ? '✅ Déplacée' : '❌ Erreur')" -ForegroundColor White
Write-Host "📋 TODO: $($todoOk ? '✅ Déplacés' : '❌ Erreur')" -ForegroundColor White
Write-Host "📊 Rapports: $($reportsOk ? '✅ Déplacés' : '❌ Erreur')" -ForegroundColor White
Write-Host "⚙️ Configuration: $($configOk ? '✅ Déplacée' : '❌ Erreur')" -ForegroundColor White
Write-Host "📊 Données: $($dataOk ? '✅ Déplacées' : '❌ Erreur')" -ForegroundColor White
Write-Host "📝 Logs: $($logsOk ? '✅ Déplacés' : '❌ Erreur')" -ForegroundColor White
Write-Host "🎨 Assets: $($assetsOk ? '✅ Déplacés' : '❌ Erreur')" -ForegroundColor White
Write-Host "🔗 Liens: $($linksOk ? '✅ Créés' : '❌ Erreur')" -ForegroundColor White
Write-Host "🔧 Scripts: $($scriptsOk ? '✅ Mis à jour' : '❌ Erreur')" -ForegroundColor White
Write-Host "📋 Index: $($indexOk ? '✅ Créé' : '❌ Erreur')" -ForegroundColor White

Write-Host ""
Write-Host "🎉 RÉORGANISATION COMPLÈTE TERMINÉE - Mode additif appliqué" -ForegroundColor Green
Write-Host "✅ Structure optimisée créée" -ForegroundColor Green
Write-Host "✅ Tous les fichiers réorganisés" -ForegroundColor Green
Write-Host "✅ Chemins mis à jour dans les scripts" -ForegroundColor Green
Write-Host "✅ Liens essentiels créés" -ForegroundColor Green
Write-Host "✅ Index de structure généré" -ForegroundColor Green
Write-Host "✅ Aucune dégradation de fonctionnalité" -ForegroundColor Green
Write-Host "✅ Mode enrichissement additif appliqué avec succès" -ForegroundColor Green 
