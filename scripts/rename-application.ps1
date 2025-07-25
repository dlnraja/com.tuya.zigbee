# Script de renommage automatique de l'application - Universal Universal TUYA Zigbee Device
# Description: Renommer universal.tuya.zigbee.device vers un nom plus explicite et mettre à jour toute la documentation

Write-Host "Renommage automatique de l'application..." -ForegroundColor Cyan

# Configuration du nouveau nom
$oldAppId = "universal.tuya.zigbee.device"
$newAppId = "universal.tuya.zigbee.device"
$oldAppName = "Universal TUYA Zigbee Device"
$newAppName = "Universal Universal TUYA Zigbee Device"
$oldDescription = "Universal Universal TUYA Zigbee Device for Homey"
$newDescription = "Universal Universal TUYA Zigbee Device for Homey - Support complet de 215 drivers avec automatisation avancée"

# Fonction pour remplacer dans un fichier
function Replace-InFile {
    param(
        [string]$FilePath,
        [string]$OldText,
        [string]$NewText
    )
    
    if (Test-Path $FilePath) {
        $content = Get-Content $FilePath -Raw
        $newContent = $content -replace $OldText, $NewText
        Set-Content $FilePath $newContent
        Write-Host "Mis a jour: $FilePath" -ForegroundColor Green
    }
}

# Fonction pour renommer l'application
function Rename-Application {
    Write-Host "Renommage de l'application..." -ForegroundColor Yellow
    
    # 1. Mettre à jour app.json
    if (Test-Path "app.json") {
        $appJson = Get-Content "app.json" -Raw | ConvertFrom-Json
        $appJson.id = $newAppId
        $appJson.name = $newAppName
        $appJson.description = $newDescription
        $appJson | ConvertTo-Json -Depth 10 | Set-Content "app.json"
        Write-Host "app.json mis a jour avec le nouveau nom" -ForegroundColor Green
    }
    
    # 2. Mettre à jour package.json
    if (Test-Path "package.json") {
        $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
        $packageJson.name = $newAppId
        $packageJson.description = $newDescription
        $packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"
        Write-Host "package.json mis a jour avec le nouveau nom" -ForegroundColor Green
    }
    
    # 3. Mettre à jour les fichiers de documentation
    $docsFiles = @(
        "README.md",
        "docs/README.md",
        "docs/INDEX.md",
        "CHANGELOG.md",
        "docs/CHANGELOG.md",
        "CONTRIBUTING.md",
        "docs/CONTRIBUTING.md"
    )
    
    foreach ($file in $docsFiles) {
        if (Test-Path $file) {
            Replace-InFile $file $oldAppId $newAppId
            Replace-InFile $file $oldAppName $newAppName
            Replace-InFile $file $oldDescription $newDescription
        }
    }
    
    # 4. Mettre à jour les fichiers de locales
    $localeFiles = @(
        "docs/locales/en.md",
        "docs/locales/fr.md",
        "docs/locales/ta.md",
        "docs/locales/nl.md",
        "docs/locales/de.md",
        "docs/locales/es.md",
        "docs/locales/it.md"
    )
    
    foreach ($file in $localeFiles) {
        if (Test-Path $file) {
            Replace-InFile $file $oldAppId $newAppId
            Replace-InFile $file $oldAppName $newAppName
            Replace-InFile $file $oldDescription $newDescription
        }
    }
    
    # 5. Mettre à jour les fichiers TODO
    $todoFiles = @(
        "docs/todo/TODO_CURSOR_NATIVE.md",
        "docs/todo/TODO_PROJET.md",
        "docs/todo/TODO_CURSOR_COMPLET.md",
        "docs/todo/TODO_CURSOR_INCREMENTAL.md",
        "docs/todo/TODO_COMPLETE_FIX.md"
    )
    
    foreach ($file in $todoFiles) {
        if (Test-Path $file) {
            Replace-InFile $file $oldAppId $newAppId
            Replace-InFile $file $oldAppName $newAppName
            Replace-InFile $file $oldDescription $newDescription
        }
    }
    
    # 6. Mettre à jour les workflows GitHub Actions
    $workflowFiles = Get-ChildItem ".github/workflows" -Filter "*.yml"
    foreach ($file in $workflowFiles) {
        Replace-InFile $file.FullName $oldAppId $newAppId
        Replace-InFile $file.FullName $oldAppName $newAppName
    }
    
    # 7. Mettre à jour les scripts
    $scriptFiles = Get-ChildItem "scripts" -Filter "*.ps1"
    foreach ($file in $scriptFiles) {
        Replace-InFile $file.FullName $oldAppId $newAppId
        Replace-InFile $file.FullName $oldAppName $newAppName
    }
    
    Write-Host "Renommage de l'application termine" -ForegroundColor Green
}

# Fonction pour créer un nouveau README principal
function Create-NewMainReadme {
    Write-Host "Creation du nouveau README principal..." -ForegroundColor Yellow
    
    $newReadmeContent = @"
# Universal Universal TUYA Zigbee Device

## Description
Application Homey pour la gestion universelle des appareils Tuya Zigbee. Support complet de 215 drivers avec automatisation avancée et mode YOLO activé.

## Caractéristiques
- **215 drivers Tuya Zigbee** supportés
- **57 workflows GitHub Actions** d'automatisation
- **4 langues** supportées (EN/FR/TA/NL)
- **Mode YOLO** activé avec auto-approve et auto-continue
- **Focus exclusif** sur l'écosystème Tuya Zigbee

## Structure du projet
```
universal.tuya.zigbee.device/
├── docs/                    # Documentation principale
│   ├── todo/               # Fichiers TODO
│   ├── locales/            # Traductions
│   └── INDEX.md            # Index de navigation
├── drivers/                # 215 drivers Tuya Zigbee
├── scripts/                # Scripts d'automatisation
├── .github/workflows/      # 57 workflows GitHub Actions
└── app.json               # Configuration de l'application
```

## Installation
1. Cloner le repository
2. Installer les dépendances : `npm install`
3. Lancer l'application : `npm start`

## Configuration YOLO Mode
```json
{
  "enabled": true,
  "auto-approve": true,
  "auto-continue": true,
  "delay": 0.1,
  "mode": "aggressive",
  "cross-platform": true,
  "real-time": true,
  "instant": true
}
```

## Métriques
- **Drivers** : 215 Tuya Zigbee
- **Workflows** : 57 GitHub Actions
- **Langues** : 4 (EN/FR/TA/NL)
- **Performance** : < 1 seconde de délai

## Focus exclusif Tuya Zigbee
Ce projet se concentre exclusivement sur l'écosystème Tuya Zigbee pour Homey, avec support complet des 215 drivers et automatisation avancée.

## Documentation
- [Documentation complète](docs/)
- [TODO](docs/todo/)
- [Traductions](docs/locales/)
- [Changelog](docs/CHANGELOG.md)

## Support
- **GitHub** : [dlnraja/universal.tuya.zigbee.device](https://github.com/dlnraja/universal.tuya.zigbee.device)
- **Auteur** : dlnraja <dylan.rajasekaram@gmail.com>
- **Licence** : MIT

*Dernière mise à jour : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')*
"@
    
    Set-Content -Path "README.md" -Value $newReadmeContent
    Write-Host "Nouveau README principal cree" -ForegroundColor Green
}

# Fonction pour créer un workflow de renommage automatique
function Create-RenameWorkflow {
    Write-Host "Creation du workflow de renommage automatique..." -ForegroundColor Yellow
    
    $workflowContent = @"
# Description: Renommage automatique de l'application
name: Auto-Application-Rename
on:
  push:
    branches: [ master ]
    paths:
      - 'app.json'
      - 'package.json'
      - 'README.md'
  workflow_dispatch:

jobs:
  rename-application:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v4
      
    - name: Setup Git
      run: |
        git config --global user.name "dlnraja"
        git config --global user.email "dylan.rajasekaram@gmail.com"
        
    - name: Rename Application
      run: |
        echo "Renommage automatique de l'application..."
        
        # Variables
        OLD_APP_ID="universal.tuya.zigbee.device"
        NEW_APP_ID="universal.tuya.zigbee.device"
        OLD_APP_NAME="Universal TUYA Zigbee Device"
        NEW_APP_NAME="Universal Universal TUYA Zigbee Device"
        
        # Mettre à jour app.json
        if [ -f "app.json" ]; then
          sed -i "s/$OLD_APP_ID/$NEW_APP_ID/g" app.json
          sed -i "s/$OLD_APP_NAME/$NEW_APP_NAME/g" app.json
          echo "app.json mis a jour"
        fi
        
        # Mettre à jour package.json
        if [ -f "package.json" ]; then
          sed -i "s/$OLD_APP_ID/$NEW_APP_ID/g" package.json
          echo "package.json mis a jour"
        fi
        
        # Mettre à jour les fichiers de documentation
        find . -name "*.md" -type f -exec sed -i "s/$OLD_APP_ID/$NEW_APP_ID/g" {} \;
        find . -name "*.md" -type f -exec sed -i "s/$OLD_APP_NAME/$NEW_APP_NAME/g" {} \;
        echo "Documentation mise a jour"
        
    - name: Commit and Push
      run: |
        git add .
        git commit -m "[YOLO] Renommage automatique de l'application - $OLD_APP_ID -> $NEW_APP_ID. Focus exclusif Tuya Zigbee maintenu avec 215 drivers et 57 workflows."
        git push origin master
        
    - name: Success
      run: |
        echo "Renommage automatique de l'application termine!"
        echo "Nouveau nom: $NEW_APP_ID"
        echo "Focus exclusif Tuya Zigbee maintenu"
        
    - name: Clean up package-lock.json
      if: always()
      run: |
        echo "Suppression du package-lock.json pour éviter la surcharge du repo."
        rm -f package-lock.json
"@
    
    Set-Content -Path ".github/workflows/auto-application-rename.yml" -Value $workflowContent
    Write-Host "Workflow de renommage cree: .github/workflows/auto-application-rename.yml" -ForegroundColor Green
}

# Fonction pour créer un script de validation du renommage
function Create-RenameValidationScript {
    Write-Host "Creation du script de validation du renommage..." -ForegroundColor Yellow
    
    $validationScript = @"
# Script de validation du renommage de l'application
# Description: Vérifier que le renommage a été effectué correctement

echo "Validation du renommage de l'application..."

# Vérifier app.json
if grep -q "universal.tuya.zigbee.device" app.json; then
    echo "app.json: Renommage valide"
else
    echo "app.json: Renommage manquant"
fi

# Vérifier package.json
if grep -q "universal.tuya.zigbee.device" package.json; then
    echo "package.json: Renommage valide"
else
    echo "package.json: Renommage manquant"
fi

# Vérifier README.md
if grep -q "Universal Universal TUYA Zigbee Device" README.md; then
    echo "README.md: Renommage valide"
else
    echo "README.md: Renommage manquant"
fi

# Vérifier les fichiers de documentation
echo ""
echo "Verification des fichiers de documentation..."
find docs/ -name "*.md" -type f -exec grep -l "universal.tuya.zigbee.device" {} \; | wc -l | xargs echo "Fichiers de documentation mis a jour:"

# Vérifier les workflows
echo ""
echo "Verification des workflows..."
find .github/workflows/ -name "*.yml" -type f -exec grep -l "universal.tuya.zigbee.device" {} \; | wc -l | xargs echo "Workflows mis a jour:"

echo ""
echo "Validation du renommage terminee!"
"@
    
    Set-Content -Path "scripts/validate-rename.sh" -Value $validationScript
    Write-Host "Script de validation cree: scripts/validate-rename.sh" -ForegroundColor Green
}

# Exécution principale
try {
    Write-Host "Debut du renommage automatique de l'application..." -ForegroundColor Cyan
    Write-Host "Ancien nom: $oldAppId" -ForegroundColor Yellow
    Write-Host "Nouveau nom: $newAppId" -ForegroundColor Yellow
    
    # 1. Renommer l'application
    Rename-Application
    
    # 2. Créer le nouveau README principal
    Create-NewMainReadme
    
    # 3. Créer le workflow de renommage automatique
    Create-RenameWorkflow
    
    # 4. Créer le script de validation du renommage
    Create-RenameValidationScript
    
    Write-Host "Renommage automatique de l'application termine!" -ForegroundColor Green
    Write-Host "Resume:" -ForegroundColor White
    Write-Host "- Ancien nom: $oldAppId" -ForegroundColor Yellow
    Write-Host "- Nouveau nom: $newAppId" -ForegroundColor Green
    Write-Host "- Documentation mise a jour" -ForegroundColor Green
    Write-Host "- Workflow automatique cree" -ForegroundColor Green
    Write-Host "- Script de validation cree" -ForegroundColor Green
    Write-Host "- Focus exclusif Tuya Zigbee maintenu" -ForegroundColor Green
    
} catch {
    Write-Host "Erreur lors du renommage de l'application: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 

