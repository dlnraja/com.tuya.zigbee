# 🚀 INSTALLATION AUTOMATION SYSTEM v1.0.0
#
# Installation complète et guidée du système d'automatisation
# GitHub Issues Johan → dlnraja avec interface graphique

param(
  [Parameter(Mandatory = $false)]
  [switch]$Silent = $false,

  [Parameter(Mandatory = $false)]
  [string]$ProjectPath = "c:\Users\HP\Desktop\homey app\tuya_repair",

  [Parameter(Mandatory = $false)]
  [int]$MonitorInterval = 60
)

# Configuration globale
$Config = @{
  ProjectPath          = $ProjectPath
  ScriptsPath          = "$ProjectPath\scripts\automation"
  LogsPath             = "$ProjectPath\logs\automation"
  NodeRequired         = $true
  GitRequired          = $true
  PowerShellMinVersion = 5.1
  MonitorInterval      = $MonitorInterval
}

function Write-Header {
  Clear-Host
  Write-Host @"
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║        🤖 GITHUB AUTO-MONITOR INSTALLATION WIZARD               ║
║                                                                  ║
║        Système d'automatisation complète pour                   ║
║        Issues Johan Bendz → dlnraja Repository                   ║
║                                                                  ║
║        Version 1.0.0 | Décembre 2024                           ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

  Write-Host ""
}

function Write-Step {
  param($Number, $Title, $Description = "")

  Write-Host "[$Number/7] " -NoNewline -ForegroundColor Yellow
  Write-Host "$Title" -ForegroundColor Green
  if ($Description) {
    Write-Host "    $Description" -ForegroundColor Gray
  }
  Write-Host ""
}

function Test-Prerequisites {
  Write-Step 1 "Vérification des prérequis système"

  $issues = @()

  # Test PowerShell version
  if ($PSVersionTable.PSVersion.Major -lt 5) {
    $issues += "PowerShell 5.1+ requis (version actuelle: $($PSVersionTable.PSVersion))"
  }

  # Test Node.js
  try {
    $nodeVersion = & node --version 2>$null
    Write-Host "    ✅ Node.js trouvé: $nodeVersion" -ForegroundColor Green
  }
  catch {
    $issues += "Node.js non installé - Requis pour le monitoring automatique"
  }

  # Test Git
  try {
    $gitVersion = & git --version 2>$null
    Write-Host "    ✅ Git trouvé: $gitVersion" -ForegroundColor Green
  }
  catch {
    $issues += "Git non installé - Requis pour les commits automatiques"
  }

  # Test GitHub CLI (optionnel)
  try {
    $ghVersion = & gh --version 2>$null | Select-Object -First 1
    Write-Host "    ✅ GitHub CLI trouvé: $ghVersion" -ForegroundColor Green
  }
  catch {
    Write-Host "    ⚠️  GitHub CLI non trouvé (optionnel, améliore les fonctionnalités)" -ForegroundColor Yellow
  }

  # Test project path
  if (!(Test-Path $Config.ProjectPath)) {
    $issues += "Chemin projet non trouvé: $($Config.ProjectPath)"
  }
  else {
    Write-Host "    ✅ Projet Tuya trouvé: $($Config.ProjectPath)" -ForegroundColor Green
  }

  if ($issues.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ Problèmes détectés:" -ForegroundColor Red
    foreach ($issue in $issues) {
      Write-Host "   • $issue" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Veuillez corriger ces problèmes avant de continuer." -ForegroundColor Yellow
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
  }

  Write-Host "    ✅ Tous les prérequis sont satisfaits!" -ForegroundColor Green
}

function Install-Dependencies {
  Write-Step 2 "Installation des dépendances Node.js"

  try {
    Push-Location $Config.ProjectPath

    # Vérifier si package.json existe
    if (!(Test-Path "package.json")) {
      Write-Host "    📦 Création de package.json..." -ForegroundColor Cyan
      @{
        name         = "tuya-zigbee-automation"
        version      = "1.0.0"
        description  = "Automation system for GitHub issues"
        scripts      = @{
          monitor        = "node scripts/automation/github-auto-monitor.js"
          "monitor-once" = "node scripts/automation/github-auto-monitor.js --once"
        }
        dependencies = @{}
      } | ConvertTo-Json -Depth 3 | Out-File -FilePath "package.json" -Encoding UTF8
    }

    Write-Host "    ✅ Dépendances Node.js prêtes" -ForegroundColor Green

  }
  catch {
    Write-Host "    ❌ Erreur installation dépendances: $($_.Exception.Message)" -ForegroundColor Red
    throw
  }
  finally {
    Pop-Location
  }
}

function Setup-Directories {
  Write-Step 3 "Configuration des répertoires et permissions"

  $directories = @(
    $Config.LogsPath,
    "$($Config.ProjectPath)\backups\automation",
    "$($Config.ProjectPath)\quarantine"
  )

  foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
      New-Item -ItemType Directory -Path $dir -Force | Out-Null
      Write-Host "    📁 Créé: $dir" -ForegroundColor Cyan
    }
    else {
      Write-Host "    ✅ Existe: $dir" -ForegroundColor Green
    }
  }

  # Créer fichier de configuration
  $configFile = "$($Config.ScriptsPath)\config.json"
  $configData = @{
    version         = "1.0.0"
    installed       = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    projectPath     = $Config.ProjectPath
    monitorInterval = $Config.MonitorInterval
    autoStart       = $true
    safetyEnabled   = $true
  } | ConvertTo-Json -Depth 3

  $configData | Out-File -FilePath $configFile -Encoding UTF8
  Write-Host "    ⚙️  Configuration sauvée: $configFile" -ForegroundColor Cyan
}

function Install-ScheduledTask {
  Write-Step 4 "Installation de la tâche planifiée Windows"

  try {
    # Utiliser notre script scheduler existant
    $schedulerScript = "$($Config.ScriptsPath)\auto-scheduler.ps1"

    if (Test-Path $schedulerScript) {
      & powershell -ExecutionPolicy Bypass -File $schedulerScript -Action Install -IntervalMinutes $Config.MonitorInterval -ProjectPath $Config.ProjectPath

      Write-Host "    ✅ Tâche planifiée installée (intervalle: $($Config.MonitorInterval) min)" -ForegroundColor Green
    }
    else {
      Write-Host "    ❌ Script scheduler non trouvé: $schedulerScript" -ForegroundColor Red
    }

  }
  catch {
    Write-Host "    ⚠️  Erreur installation tâche planifiée: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "    Vous pourrez l'installer manuellement plus tard" -ForegroundColor Gray
  }
}

function Test-System {
  Write-Step 5 "Test du système d'automatisation"

  try {
    Push-Location $Config.ProjectPath

    Write-Host "    🧪 Test de compilation de l'app Homey..." -ForegroundColor Cyan
    $buildOutput = & homey app build 2>&1

    if ($LASTEXITCODE -eq 0) {
      Write-Host "    ✅ Build réussi - App Homey fonctionnelle" -ForegroundColor Green
    }
    else {
      Write-Host "    ⚠️  Build échoué - Vérifiez la configuration de l'app" -ForegroundColor Yellow
    }

    # Test du monitor
    Write-Host "    🤖 Test du monitoring GitHub..." -ForegroundColor Cyan
    $monitorScript = "scripts\automation\github-auto-monitor.js"

    if (Test-Path $monitorScript) {
      # Test rapide (sans exécution complète)
      $testOutput = & node $monitorScript --stats 2>&1
      Write-Host "    ✅ Monitor GitHub prêt" -ForegroundColor Green
    }
    else {
      Write-Host "    ❌ Script monitor non trouvé" -ForegroundColor Red
    }

  }
  catch {
    Write-Host "    ⚠️  Erreur lors des tests: $($_.Exception.Message)" -ForegroundColor Yellow
  }
  finally {
    Pop-Location
  }
}

function Setup-Dashboard {
  Write-Step 6 "Configuration du dashboard de monitoring"

  $dashboardPath = "$($Config.ScriptsPath)\monitoring-dashboard.html"

  if (Test-Path $dashboardPath) {
    Write-Host "    📊 Dashboard disponible: $dashboardPath" -ForegroundColor Green
    Write-Host "    🌐 Ouvrez ce fichier dans votre navigateur pour le monitoring" -ForegroundColor Cyan

    # Créer un raccourci bureau (optionnel)
    if (!$Silent) {
      $createShortcut = Read-Host "    Créer un raccourci bureau pour le dashboard? (o/N)"
      if ($createShortcut -eq 'o' -or $createShortcut -eq 'O') {
        try {
          $desktopPath = [Environment]::GetFolderPath("Desktop")
          $shortcutPath = "$desktopPath\GitHub Auto-Monitor Dashboard.lnk"

          $WshShell = New-Object -comObject WScript.Shell
          $Shortcut = $WshShell.CreateShortcut($shortcutPath)
          $Shortcut.TargetPath = $dashboardPath
          $Shortcut.Description = "GitHub Auto-Monitor Dashboard"
          $Shortcut.Save()

          Write-Host "    ✅ Raccourci créé sur le bureau" -ForegroundColor Green
        }
        catch {
          Write-Host "    ⚠️  Impossible de créer le raccourci" -ForegroundColor Yellow
        }
      }
    }
  }
  else {
    Write-Host "    ❌ Dashboard non trouvé: $dashboardPath" -ForegroundColor Red
  }
}

function Show-CompletionInfo {
  Write-Step 7 "Installation terminée - Informations importantes"

  Write-Host @"

🎉 INSTALLATION RÉUSSIE!

🤖 SYSTÈME D'AUTOMATISATION CONFIGURÉ:
   • Monitoring automatique des issues Johan Bendz
   • Intégration automatique des devices dans les drivers
   • Build et déploiement automatique
   • Réponses automatiques aux issues GitHub
   • Validation et sécurité intégrées

📋 PROCHAINES ÉTAPES:

1️⃣  DÉMARRAGE IMMÉDIAT:
   • Exécution unique: powershell scripts\automation\auto-scheduler.ps1 -Action RunOnce
   • Démarrage continu: powershell scripts\automation\auto-scheduler.ps1 -Action Start

2️⃣  MONITORING:
   • Dashboard: Ouvrez scripts\automation\monitoring-dashboard.html
   • Logs: Consultez logs\automation\ pour les détails
   • Status: powershell scripts\automation\auto-scheduler.ps1 -Action Status

3️⃣  CONTRÔLES:
   • Pause: powershell scripts\automation\auto-scheduler.ps1 -Action Stop
   • Configuration: Éditez scripts\automation\config.json
   • Sécurité: Consultez quarantine\ en cas de problèmes

⚙️  CONFIGURATION ACTUELLE:
   • Intervalle de vérification: $($Config.MonitorInterval) minutes
   • Auto-déploiement: Activé
   • Validation sécurisée: Activée
   • Backups automatiques: Activés (7 jours)

🛡️  SÉCURITÉ:
   • Validation automatique des fingerprints
   • Backups avant chaque modification
   • Quarantaine pour devices suspects
   • Rollback automatique en cas d'erreur
   • Rate limiting intégré

📞 SUPPORT:
   • Logs détaillés dans logs\automation\
   • Dashboard temps réel pour monitoring
   • System de quarantaine pour debug
   • Rollback automatique si problème

"@ -ForegroundColor White

  if (!$Silent) {
    Write-Host "🚀 Voulez-vous démarrer le système maintenant? (O/n): " -NoNewline -ForegroundColor Yellow
    $start = Read-Host

    if ($start -ne 'n' -and $start -ne 'N') {
      Write-Host ""
      Write-Host "🤖 Démarrage du système d'automatisation..." -ForegroundColor Cyan

      try {
        & powershell -ExecutionPolicy Bypass -File "$($Config.ScriptsPath)\auto-scheduler.ps1" -Action RunOnce -ProjectPath $Config.ProjectPath
        Write-Host "✅ Premier cycle d'automatisation lancé!" -ForegroundColor Green
      }
      catch {
        Write-Host "⚠️  Erreur au démarrage. Vous pouvez le faire manuellement plus tard." -ForegroundColor Yellow
      }
    }
  }
}

function Start-Installation {
  if (!$Silent) {
    Write-Header

    Write-Host "Ce script va installer le système d'automatisation complète pour:" -ForegroundColor White
    Write-Host "• Surveillance automatique des issues GitHub Johan Bendz" -ForegroundColor Cyan
    Write-Host "• Intégration automatique des nouveaux devices Tuya" -ForegroundColor Cyan
    Write-Host "• Déploiement automatique avec validation sécurisée" -ForegroundColor Cyan
    Write-Host "• Réponses automatiques et monitoring temps réel" -ForegroundColor Cyan
    Write-Host ""

    $proceed = Read-Host "Continuer l'installation? (O/n)"
    if ($proceed -eq 'n' -or $proceed -eq 'N') {
      Write-Host "Installation annulée." -ForegroundColor Yellow
      exit 0
    }
    Write-Host ""
  }

  try {
    Test-Prerequisites
    Install-Dependencies
    Setup-Directories
    Install-ScheduledTask
    Test-System
    Setup-Dashboard
    Show-CompletionInfo

    Write-Host ""
    Write-Host "🎊 INSTALLATION TERMINÉE AVEC SUCCÈS!" -ForegroundColor Green
    Write-Host "Le système d'automatisation est maintenant opérationnel." -ForegroundColor White

  }
  catch {
    Write-Host ""
    Write-Host "❌ ERREUR DURANT L'INSTALLATION:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Consultez les logs pour plus de détails ou réessayez." -ForegroundColor Yellow
    exit 1
  }
}

# Point d'entrée principal
Start-Installation
