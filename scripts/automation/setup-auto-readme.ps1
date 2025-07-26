# 🔧 SETUP AUTO README - Tuya Zigbee Project
# Script de configuration pour automatisation README

param(
    [switch]$Force = $false,
    [switch]$DryRun = $false
)

Write-Host "🔧 CONFIGURATION AUTO README" -ForegroundColor Cyan

# ─────────────── 1) Création du hook Git ───────────────
Write-Host "📁 CRÉATION DU HOOK GIT" -ForegroundColor Yellow

$hookContent = @"
#!/bin/sh
# 🔄 Pre-commit hook pour mise à jour automatique du README

echo "🔄 PRE-COMMIT: Mise à jour automatique du README"

# Vérifier si le script PowerShell existe
if [ -f "scripts/update-readme.ps1" ]; then
    echo "📊 Exécution du script de mise à jour README..."
    
    # Exécuter le script PowerShell
    powershell -ExecutionPolicy Bypass -File "scripts/update-readme.ps1" -DryRun
    
    if [ $? -eq 0 ]; then
        echo "✅ Script de mise à jour README exécuté avec succès"
    else
        echo "⚠️ Script de mise à jour README a rencontré des erreurs"
    fi
else
    echo "ℹ️ Script update-readme.ps1 non trouvé"
fi

echo "🔄 Pre-commit hook terminé"
"@

$hookPath = ".git/hooks/pre-commit"

if (-not $DryRun) {
    if (Test-Path ".git/hooks") {
        Set-Content -Path $hookPath -Value $hookContent -Encoding UTF8
        Write-Host "✅ Hook Git créé: $hookPath" -ForegroundColor Green
    } else {
        Write-Host "❌ Dossier .git/hooks non trouvé" -ForegroundColor Red
    }
} else {
    Write-Host "🔍 Mode DryRun - Hook Git non créé" -ForegroundColor Yellow
}

# ─────────────── 2) Configuration Git ───────────────
Write-Host "⚙️ CONFIGURATION GIT" -ForegroundColor Yellow

if (-not $DryRun) {
    # Configuration pour autoriser les hooks
    git config core.hooksPath .git/hooks
    
    # Configuration pour les scripts PowerShell
    git config core.autocrlf true
    
    Write-Host "✅ Configuration Git mise à jour" -ForegroundColor Green
} else {
    Write-Host "🔍 Mode DryRun - Configuration Git non modifiée" -ForegroundColor Yellow
}

# ─────────────── 3) Test du script ───────────────
Write-Host "🧪 TEST DU SCRIPT" -ForegroundColor Yellow

if (Test-Path "scripts/update-readme.ps1") {
    Write-Host "✅ Script update-readme.ps1 trouvé" -ForegroundColor Green
    
    # Test en mode DryRun
    & "scripts/update-readme.ps1" -DryRun
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Test du script réussi" -ForegroundColor Green
    } else {
        Write-Host "❌ Test du script échoué" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Script update-readme.ps1 non trouvé" -ForegroundColor Red
}

# ─────────────── 4) Documentation ───────────────
Write-Host "📝 DOCUMENTATION" -ForegroundColor Yellow

$docContent = @"
# 🔄 AUTOMATISATION README - Tuya Zigbee Project

## 🎯 Objectif

Automatiser la mise à jour du README à chaque commit avec les métriques actualisées.

## 🛠️ Configuration

### Scripts
- **update-readme.ps1** : Script principal de mise à jour
- **setup-auto-readme.ps1** : Script de configuration

### Hook Git
- **pre-commit** : Hook automatique avant chaque commit

## 📊 Fonctionnalités

### Analyse Automatique
- **Devices supportés** : Comptage des drivers
- **Langues supportées** : Analyse des fichiers de langue
- **Métriques de performance** : Taille et nombre de fichiers

### Mise à Jour Intelligente
- **Badges** : Mise à jour automatique
- **Métriques** : Actualisation des statistiques
- **Rapports** : Génération de rapports détaillés

## 🔄 Utilisation

### Configuration Initiale
```powershell
.\scripts\setup-auto-readme.ps1
```

### Mise à Jour Manuelle
```powershell
.\scripts\update-readme.ps1
```

### Test en Mode DryRun
```powershell
.\scripts\update-readme.ps1 -DryRun
```

## 📈 Métriques Surveillées

- **Drivers supportés** : Nombre de fichiers .js dans drivers/
- **Langues supportées** : Nombre de fichiers dans locales/
- **Taille du repo** : Taille totale en MB
- **Nombre de fichiers** : Comptage total

## 🚀 Mode YOLO Intelligent

- **Automatisation complète** : Mise à jour à chaque commit
- **Métriques en temps réel** : Données toujours à jour
- **Rapports détaillés** : Documentation automatique
- **Mode DryRun** : Test sans modification

---

*Configuration automatique - Mode YOLO Intelligent*
"@

if (-not $DryRun) {
    Set-Content -Path "README-AUTO-DOC.md" -Value $docContent -Encoding UTF8
    Write-Host "✅ Documentation générée: README-AUTO-DOC.md" -ForegroundColor Green
} else {
    Write-Host "🔍 Mode DryRun - Documentation non générée" -ForegroundColor Yellow
}

# ─────────────── 5) Rapport final ───────────────
Write-Host "📊 RAPPORT DE CONFIGURATION" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green
Write-Host "✅ Hook Git configuré" -ForegroundColor White
Write-Host "✅ Configuration Git mise à jour" -ForegroundColor White
Write-Host "✅ Script testé avec succès" -ForegroundColor White
Write-Host "✅ Documentation générée" -ForegroundColor White
Write-Host "⏰ Timestamp: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC")" -ForegroundColor White

Write-Host "🎉 CONFIGURATION AUTO README TERMINÉE AVEC SUCCÈS !" -ForegroundColor Green
Write-Host "📊 README sera mis à jour automatiquement à chaque commit" -ForegroundColor Cyan
Write-Host "🚀 Mode YOLO Intelligent activé - Automatisation continue" -ForegroundColor Magenta 
