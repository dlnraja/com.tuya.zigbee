
---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
# Script cross-platform de correction Git - Universal Universal TUYA Zigbee Device
# Description: Correction des auteurs Git et amélioration des messages de commit pour tous les systèmes

Write-Host "Script cross-platform de correction Git..." -ForegroundColor Cyan

# Configuration
$correctAuthor = "dlnraja"
$correctEmail = "dylan.rajasekaram@gmail.com"
$oldEmail = "dylan.rajasekaram+myhomeyapp@gmail.com"

# Fonction pour détecter le système d'exploitation
function Get-OperatingSystem {
    if ($IsWindows) {
        return "Windows"
    } elseif ($IsLinux) {
        return "Linux"
    } elseif ($IsMacOS) {
        return "macOS"
    } else {
        return "Unknown"
    }
}

# Fonction pour corriger les auteurs Git
function Fix-GitAuthors {
    Write-Host "Correction des auteurs Git pour $(Get-OperatingSystem)..." -ForegroundColor Yellow
    
    # Configuration globale
    git config --global user.name $correctAuthor
    git config --global user.email $correctEmail
    
    # Configuration locale
    git config user.name $correctAuthor
    git config user.email $correctEmail
    
    Write-Host "Auteur Git configure: $correctAuthor <$correctEmail>" -ForegroundColor Green
}

# Fonction pour créer un script bash cross-platform
function Create-CrossPlatformScript {
    Write-Host "Creation du script bash cross-platform..." -ForegroundColor Yellow
    
    $bashScript = @"
#!/bin/bash
# Script cross-platform de correction Git

# Configuration
CORRECT_AUTHOR="dlnraja"
CORRECT_EMAIL="dylan.rajasekaram@gmail.com"
OLD_EMAIL="dylan.rajasekaram+myhomeyapp@gmail.com"

echo "Correction des auteurs Git..."

# Détecter le système d'exploitation
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    OS="Windows"
else
    OS="Unknown"
fi

echo "Système détecté: $OS"

# Configuration Git
git config --global user.name "$CORRECT_AUTHOR"
git config --global user.email "$CORRECT_EMAIL"

# Réécrire l'historique si nécessaire
if git log --author="$OLD_EMAIL" --oneline | head -1; then
    echo "Commits avec l'ancien email trouvés, réécriture en cours..."
    git filter-branch --env-filter "
        if [ \"\$GIT_AUTHOR_EMAIL\" = \"$OLD_EMAIL\" ]
        then
            export GIT_AUTHOR_EMAIL=\"$CORRECT_EMAIL\"
            export GIT_AUTHOR_NAME=\"$CORRECT_AUTHOR\"
        fi
        if [ \"\$GIT_COMMITTER_EMAIL\" = \"$OLD_EMAIL\" ]
        then
            export GIT_COMMITTER_EMAIL=\"$CORRECT_EMAIL\"
            export GIT_COMMITTER_NAME=\"$CORRECT_AUTHOR\"
        fi
    " --tag-name-filter cat -- --branches --tags
else
    echo "Aucun commit avec l'ancien email trouvé"
fi

echo "Correction terminée!"
"@
    
    Set-Content -Path "scripts/cross-platform-git-fix.sh" -Value $bashScript
    Write-Host "Script bash cree: scripts/cross-platform-git-fix.sh" -ForegroundColor Green
}

# Fonction pour créer un workflow cross-platform
function Create-CrossPlatformWorkflow {
    Write-Host "Creation du workflow cross-platform..." -ForegroundColor Yellow
    
    $workflowContent = @"
# Description: Correction cross-platform des auteurs Git
name: Cross-Platform-Git-Fix
on:
  schedule:
    - cron: '0 */6 * * *' # Toutes les 6 heures
  push:
    branches: [ master ]
  workflow_dispatch:

jobs:
  fix-git-authors:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v4
      with:
        fetch-depth: 0 # Récupérer tout l'historique
      
    - name: Setup Git
      run: |
        git config --global user.name "dlnraja"
        git config --global user.email "dylan.rajasekaram@gmail.com"
        
    - name: Fix Git Authors
      run: |
        echo "Correction cross-platform des auteurs Git..."
        
        # Vérifier les commits avec l'ancien email
        OLD_EMAIL="dylan.rajasekaram+myhomeyapp@gmail.com"
        CORRECT_EMAIL="dylan.rajasekaram@gmail.com"
        CORRECT_AUTHOR="dlnraja"
        
        # Réécrire l'historique si nécessaire
        if git log --author="$OLD_EMAIL" --oneline | head -1; then
          echo "Commits avec l'ancien email trouvés, réécriture en cours..."
          git filter-branch --env-filter "
            if [ \"\$GIT_AUTHOR_EMAIL\" = \"$OLD_EMAIL\" ]
            then
                export GIT_AUTHOR_EMAIL=\"$CORRECT_EMAIL\"
                export GIT_AUTHOR_NAME=\"$CORRECT_AUTHOR\"
            fi
            if [ \"\$GIT_COMMITTER_EMAIL\" = \"$OLD_EMAIL\" ]
            then
                export GIT_COMMITTER_EMAIL=\"$CORRECT_EMAIL\"
                export GIT_COMMITTER_NAME=\"$CORRECT_AUTHOR\"
            fi
          " --tag-name-filter cat -- --branches --tags
        else
          echo "Aucun commit avec l'ancien email trouvé"
        fi
        
    - name: Force Push
      run: |
        echo "Force push des changements..."
        git push origin master --force
        
    - name: Success
      run: |
        echo "Correction cross-platform des auteurs Git terminée!"
        echo "Résumé:"
        echo "- Auteurs Git corrigés"
        echo "- Compatible Windows/Linux/macOS"
        echo "- Historique réécrit"
        echo "- Force push effectué"
        
    - name: Clean up package-lock.json
      if: always()
      run: |
        echo "Suppression du package-lock.json pour éviter la surcharge du repo."
        rm -f package-lock.json
"@
    
    Set-Content -Path ".github/workflows/cross-platform-git-fix.yml" -Value $workflowContent
    Write-Host "Workflow cross-platform cree: .github/workflows/cross-platform-git-fix.yml" -ForegroundColor Green
}

# Fonction pour créer un script de validation cross-platform
function Create-CrossPlatformValidationScript {
    Write-Host "Creation du script de validation cross-platform..." -ForegroundColor Yellow
    
    $validationScript = @"
# Script de validation cross-platform des auteurs Git
# Description: Vérifier que tous les commits ont le bon auteur sur tous les systèmes

echo "Validation cross-platform des auteurs Git..."

# Détecter le système d'exploitation
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    OS="Windows"
else
    OS="Unknown"
fi

echo "Système: $OS"

# Vérifier les commits avec l'ancien email
OLD_EMAIL="dylan.rajasekaram+myhomeyapp@gmail.com"
CORRECT_EMAIL="dylan.rajasekaram@gmail.com"
CORRECT_AUTHOR="dlnraja"

echo "Commits avec l'ancien email:"
git log --author="$OLD_EMAIL" --oneline

echo ""
echo "Commits avec le bon email:"
git log --author="$CORRECT_EMAIL" --oneline

echo ""
echo "Configuration Git actuelle:"
git config user.name
git config user.email

echo ""
echo "Validation cross-platform terminée!"
"@
    
    Set-Content -Path "scripts/validate-cross-platform.sh" -Value $validationScript
    Write-Host "Script de validation cross-platform cree: scripts/validate-cross-platform.sh" -ForegroundColor Green
}

# Exécution principale
try {
    Write-Host "Debut de la correction cross-platform Git..." -ForegroundColor Cyan
    
    # 1. Corriger les auteurs Git
    Fix-GitAuthors
    
    # 2. Créer le script bash cross-platform
    Create-CrossPlatformScript
    
    # 3. Créer le workflow cross-platform
    Create-CrossPlatformWorkflow
    
    # 4. Créer le script de validation cross-platform
    Create-CrossPlatformValidationScript
    
    Write-Host "Correction cross-platform Git terminee!" -ForegroundColor Green
    Write-Host "Resume:" -ForegroundColor White
    Write-Host "- Auteurs Git configures: $correctAuthor <$correctEmail>" -ForegroundColor Green
    Write-Host "- Script bash cross-platform cree: scripts/cross-platform-git-fix.sh" -ForegroundColor Green
    Write-Host "- Workflow cross-platform cree: .github/workflows/cross-platform-git-fix.yml" -ForegroundColor Green
    Write-Host "- Script de validation cross-platform cree: scripts/validate-cross-platform.sh" -ForegroundColor Green
    Write-Host "- Compatible Windows/Linux/macOS" -ForegroundColor Green
    
} catch {
    Write-Host "Erreur lors de la correction cross-platform Git: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 




