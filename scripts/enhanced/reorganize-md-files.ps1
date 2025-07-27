
---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
# Script de réorganisation automatique des fichiers Markdown - Universal Universal TUYA Zigbee Device
# Description: Réorganisation automatique des fichiers MD à chaque push avec Mode Automatique

Write-Host "Reorganisation automatique des fichiers Markdown..." -ForegroundColor Cyan

# Configuration
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$mdFiles = @(
    "README.md",
    "README.txt",
    "CHANGELOG.md",
    "docs/CONTRIBUTING/CONTRIBUTING.md",
    "docs/LICENSE/LICENSE",
    "TODO_CURSOR_NATIVE.md",
    "TODO_PROJET.md",
    "TODO_CURSOR_COMPLET.md",
    "TODO_CURSOR_INCREMENTAL.md",
    "TODO_COMPLETE_FIX.md"
)

# Fonction pour réorganiser les fichiers Markdown
function Reorganize-MarkdownFiles {
    Write-Host "Reorganisation des fichiers Markdown..." -ForegroundColor Yellow
    
    # Créer le dossier docs s'il n'existe pas
    if (!(Test-Path "docs")) {
        New-Item -ItemType Directory -Path "docs" -Force
        Write-Host "Dossier docs cree" -ForegroundColor Green
    }
    
    # Créer le dossier docs/todo s'il n'existe pas
    if (!(Test-Path "docs/todo")) {
        New-Item -ItemType Directory -Path "docs/todo" -Force
        Write-Host "Dossier docs/todo cree" -ForegroundColor Green
    }
    
    # Créer le dossier docs/locales s'il n'existe pas
    if (!(Test-Path "docs/locales")) {
        New-Item -ItemType Directory -Path "docs/locales" -Force
        Write-Host "Dossier docs/locales cree" -ForegroundColor Green
    }
    
    # Déplacer les fichiers TODO vers docs/todo
    Get-ChildItem -Filter "TODO_*.md" | ForEach-Object {
        $destination = "docs/todo/$($_.Name)"
        Move-Item $_.FullName $destination -Force
        Write-Host "Deplace: $($_.Name) -> $destination" -ForegroundColor Green
    }
    
    # Déplacer les fichiers de locales vers docs/locales
    if (Test-Path "locales") {
        Get-ChildItem "locales" -Filter "*.md" | ForEach-Object {
            $destination = "docs/locales/$($_.Name)"
            Move-Item $_.FullName $destination -Force
            Write-Host "Deplace: $($_.Name) -> $destination" -ForegroundColor Green
        }
    }
    
    # Déplacer les autres fichiers MD vers docs
    foreach ($mdFile in @("README.md", "CHANGELOG.md", "docs/CONTRIBUTING/CONTRIBUTING.md")) {
        if (Test-Path $mdFile) {
            $destination = "docs/$mdFile"
            Copy-Item $mdFile $destination -Force
            Write-Host "Copie: $mdFile -> $destination" -ForegroundColor Green
        }
    }
    
    Write-Host "Reorganisation des fichiers Markdown terminee" -ForegroundColor Green
}

# Fonction pour créer un index des fichiers MD
function Create-MarkdownIndex {
    Write-Host "Creation de l'index des fichiers Markdown..." -ForegroundColor Yellow
    
    $indexContent = @"
# Documentation Universal Universal TUYA Zigbee Device

## Structure des fichiers Markdown

### Documentation principale
- [README.md](README.md) - Documentation principale du projet
- [CHANGELOG.md](CHANGELOG.md) - Historique des changements
- [docs/CONTRIBUTING/CONTRIBUTING.md](docs/CONTRIBUTING/CONTRIBUTING.md) - Guide de contribution

### Fichiers TODO
- [TODO_CURSOR_NATIVE.md](todo/TODO_CURSOR_NATIVE.md) - TODO principal
- [TODO_PROJET.md](todo/TODO_PROJET.md) - TODO du projet
- [TODO_CURSOR_COMPLET.md](todo/TODO_CURSOR_COMPLET.md) - TODO complet
- [TODO_CURSOR_INCREMENTAL.md](todo/TODO_CURSOR_INCREMENTAL.md) - TODO incrémental
- [TODO_COMPLETE_FIX.md](todo/TODO_COMPLETE_FIX.md) - TODO des corrections

### Traductions
- [English](locales/en.md) - Documentation en anglais
- [Français](locales/fr.md) - Documentation en français
- [Tamil](locales/ta.md) - Documentation en tamoul
- [Dutch](locales/nl.md) - Documentation en néerlandais

## Métriques du projet
- **Drivers Tuya Zigbee** : 215 drivers
- **Workflows GitHub Actions** : 57 workflows
- **Langues supportées** : 4 (EN/FR/TA/NL)
- **Mode Automatique** : Activé avec validation automatique et continuation automatique

## Focus exclusif Tuya Zigbee
Ce projet se concentre exclusivement sur l'écosystème Tuya Zigbee pour Homey, avec support complet des 215 drivers et automatisation avancée.

*Dernière mise à jour : $timestamp*
"@
    
    Set-Content -Path "docs/INDEX.md" -Value $indexContent
    Write-Host "Index des fichiers Markdown cree: docs/INDEX.md" -ForegroundColor Green
}

# Fonction pour créer un workflow de réorganisation automatique
function Create-ReorganizationWorkflow {
    Write-Host "Creation du workflow de reorganisation automatique..." -ForegroundColor Yellow
    
    $workflowContent = @"
# Description: Réorganisation automatique des fichiers Markdown à chaque push
name: Auto-Markdown-Reorganization
on:
  push:
    branches: [ master ]
    paths:
      - '*.md'
      - 'docs/**'
  workflow_dispatch:

jobs:
  reorganize-markdown:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v4
      
    - name: Setup Git
      run: |
        git config --global user.name "dlnraja"
        git config --global user.email "dylan.rajasekaram@gmail.com"
        
    - name: Reorganize Markdown Files
      run: |
        echo "Reorganisation automatique des fichiers Markdown..."
        
        # Créer les dossiers
        mkdir -p docs/todo docs/locales
        
        # Déplacer les fichiers TODO
        for file in TODO_*.md; do
          if [ -f "$file" ]; then
            mv "$file" "docs/todo/"
            echo "Deplace: $file -> docs/todo/$file"
          fi
        done
        
        # Déplacer les fichiers de locales
        if [ -d "locales" ]; then
          for file in locales/*.md; do
            if [ -f "$file" ]; then
              mv "$file" "docs/locales/"
              echo "Deplace: $file -> docs/locales/"
            fi
          done
        fi
        
        # Copier les fichiers principaux
        cp README.md docs/ 2>/dev/null || echo "README.md non trouve"
        cp CHANGELOG.md docs/ 2>/dev/null || echo "CHANGELOG.md non trouve"
        cp docs/CONTRIBUTING/CONTRIBUTING.md docs/ 2>/dev/null || echo "docs/CONTRIBUTING/CONTRIBUTING.md non trouve"
        
        # Créer l'index
        cat > docs/INDEX.md << 'EOF'
# Documentation Universal Universal TUYA Zigbee Device

## Structure des fichiers Markdown

### Documentation principale
- [README.md](README.md) - Documentation principale du projet
- [CHANGELOG.md](CHANGELOG.md) - Historique des changements
- [docs/CONTRIBUTING/CONTRIBUTING.md](docs/CONTRIBUTING/CONTRIBUTING.md) - Guide de contribution

### Fichiers TODO
- [TODO_CURSOR_NATIVE.md](todo/TODO_CURSOR_NATIVE.md) - TODO principal
- [TODO_PROJET.md](todo/TODO_PROJET.md) - TODO du projet
- [TODO_CURSOR_COMPLET.md](todo/TODO_CURSOR_COMPLET.md) - TODO complet
- [TODO_CURSOR_INCREMENTAL.md](todo/TODO_CURSOR_INCREMENTAL.md) - TODO incrémental
- [TODO_COMPLETE_FIX.md](todo/TODO_COMPLETE_FIX.md) - TODO des corrections

### Traductions
- [English](locales/en.md) - Documentation en anglais
- [Français](locales/fr.md) - Documentation en français
- [Tamil](locales/ta.md) - Documentation en tamoul
- [Dutch](locales/nl.md) - Documentation en néerlandais

## Métriques du projet
- **Drivers Tuya Zigbee** : 215 drivers
- **Workflows GitHub Actions** : 57 workflows
- **Langues supportées** : 4 (EN/FR/TA/NL)
- **Mode Automatique** : Activé avec validation automatique et continuation automatique

## Focus exclusif Tuya Zigbee
Ce projet se concentre exclusivement sur l'écosystème Tuya Zigbee pour Homey, avec support complet des 215 drivers et automatisation avancée.

*Dernière mise à jour : $(date)*
EOF
        
    - name: Commit and Push
      run: |
        git add .
        git commit -m "[Automatique] Reorganisation automatique des fichiers Markdown - Structure optimisee avec docs/, docs/todo/, docs/locales/. Focus exclusif Tuya Zigbee maintenu."
        git push origin master
        
    - name: Success
      run: |
        echo "Reorganisation automatique des fichiers Markdown terminee!"
        echo "Structure creee:"
        echo "- docs/ - Documentation principale"
        echo "- docs/todo/ - Fichiers TODO"
        echo "- docs/locales/ - Traductions"
        echo "- docs/INDEX.md - Index des fichiers"
        
    - name: Clean up package-lock.json
      if: always()
      run: |
        echo "Suppression du package-lock.json pour éviter la surcharge du repo."
        rm -f package-lock.json
"@
    
    Set-Content -Path ".github/workflows/auto-markdown-reorganization.yml" -Value $workflowContent
    Write-Host "Workflow de reorganisation cree: .github/workflows/auto-markdown-reorganization.yml" -ForegroundColor Green
}

# Fonction pour créer un script de validation de la structure
function Create-StructureValidationScript {
    Write-Host "Creation du script de validation de la structure..." -ForegroundColor Yellow
    
    $validationScript = @"
# Script de validation de la structure des fichiers Markdown
# Description: Vérifier que tous les fichiers MD sont correctement organisés

echo "Validation de la structure des fichiers Markdown..."

# Vérifier les dossiers
if [ -d "docs" ]; then
    echo "Dossier docs trouve"
else
    echo "Dossier docs manquant"
fi

if [ -d "docs/todo" ]; then
    echo "Dossier docs/todo trouve"
else
    echo "Dossier docs/todo manquant"
fi

if [ -d "docs/locales" ]; then
    echo "Dossier docs/locales trouve"
else
    echo "Dossier docs/locales manquant"
fi

# Vérifier les fichiers TODO
echo ""
echo "Fichiers TODO dans docs/todo/:"
ls -la docs/todo/ 2>/dev/null || echo "Aucun fichier TODO trouve"

# Vérifier les fichiers de locales
echo ""
echo "Fichiers de locales dans docs/locales/:"
ls -la docs/locales/ 2>/dev/null || echo "Aucun fichier de locale trouve"

# Vérifier l'index
if [ -f "docs/INDEX.md" ]; then
    echo "Index des fichiers trouve: docs/INDEX.md"
else
    echo "Index des fichiers manquant"
fi

echo ""
echo "Validation de la structure terminee!"
"@
    
    Set-Content -Path "scripts/validate-md-structure.sh" -Value $validationScript
    Write-Host "Script de validation cree: scripts/validate-md-structure.sh" -ForegroundColor Green
}

# Exécution principale
try {
    Write-Host "Debut de la reorganisation automatique des fichiers Markdown..." -ForegroundColor Cyan
    
    # 1. Réorganiser les fichiers Markdown
    Reorganize-MarkdownFiles
    
    # 2. Créer l'index des fichiers MD
    Create-MarkdownIndex
    
    # 3. Créer le workflow de réorganisation automatique
    Create-ReorganizationWorkflow
    
    # 4. Créer le script de validation de la structure
    Create-StructureValidationScript
    
    Write-Host "Reorganisation automatique des fichiers Markdown terminee!" -ForegroundColor Green
    Write-Host "Resume:" -ForegroundColor White
    Write-Host "- Structure docs/ creee" -ForegroundColor Green
    Write-Host "- Dossier docs/todo/ pour les TODO" -ForegroundColor Green
    Write-Host "- Dossier docs/locales/ pour les traductions" -ForegroundColor Green
    Write-Host "- Index docs/INDEX.md cree" -ForegroundColor Green
    Write-Host "- Workflow automatique cree" -ForegroundColor Green
    Write-Host "- Script de validation cree" -ForegroundColor Green
    
} catch {
    Write-Host "Erreur lors de la reorganisation des fichiers Markdown: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 





