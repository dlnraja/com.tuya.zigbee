
---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
# RUN UNIVERSAL - Tuya Zigbee Project
# Script de lancement universel avec détection automatique du shell (PowerShell version)

# Variables
$ScriptName = ""
$DryRun = $false
$Force = $false

# Fonction d'aide
function Show-Help {
    Write-Host "Usage: $($MyInvocation.MyCommand.Name) [SCRIPT] [OPTIONS]" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Scripts disponibles:" -ForegroundColor Yellow
    Write-Host "  update-readme     Mise à jour automatique du README" -ForegroundColor White
    Write-Host "  cleanup-repo      Nettoyage du repository" -ForegroundColor White
    Write-Host "  sync-drivers      Synchronisation des drivers" -ForegroundColor White
    Write-Host "  setup-auto-readme Configuration auto README" -ForegroundColor White
    Write-Host "  diagnostic        Diagnostic complet du projet" -ForegroundColor White
    Write-Host "  validation        Validation finale du projet" -ForegroundColor White
    Write-Host "  compatibilite     Test de compatibilité PowerShell/Bash" -ForegroundColor White
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -d, --dry-run     Mode dry-run" -ForegroundColor White
    Write-Host "  -f, --force       Mode force" -ForegroundColor White
    Write-Host "  -h, --help        Afficher cette aide" -ForegroundColor White
    Write-Host ""
    Write-Host "Exemples:" -ForegroundColor Yellow
    Write-Host "  $($MyInvocation.MyCommand.Name) update-readme --dry-run" -ForegroundColor White
    Write-Host "  $($MyInvocation.MyCommand.Name) cleanup-repo --force" -ForegroundColor White
    Write-Host "  $($MyInvocation.MyCommand.Name) diagnostic" -ForegroundColor White
}

# Fonction de détection du shell
function Get-ShellType {
    if (Get-Command pwsh -ErrorAction SilentlyContinue) {
        return "powershell"
    }
    elseif (Get-Command powershell -ErrorAction SilentlyContinue) {
        return "powershell"
    }
    elseif (Get-Command bash -ErrorAction SilentlyContinue) {
        return "bash"
    }
    elseif (Get-Command sh -ErrorAction SilentlyContinue) {
        return "sh"
    }
    else {
        return "unknown"
    }
}

# Fonction de lancement de script
function Invoke-Script {
    param(
        [string]$ScriptName,
        [string]$ShellType,
        [string]$Args
    )
    
    switch ($ShellType) {
        "powershell" {
            $psScriptPath = "scripts/$ScriptName.ps1"
            if (Test-Path $psScriptPath) {
                Write-Host "Lancement avec PowerShell: $ScriptName.ps1" -ForegroundColor Green
                Write-Host ""
                & pwsh -File $psScriptPath $Args
                $exitCode = $LASTEXITCODE
                Write-Host ""
                return $exitCode
            }
            else {
                Write-Host "Script PowerShell non trouvé: $ScriptName.ps1" -ForegroundColor Red
                Write-Host ""
                return 1
            }
        }
        "bash" {
            $shScriptPath = "scripts/$ScriptName.sh"
            if (Test-Path $shScriptPath) {
                Write-Host "Lancement avec Bash: $ScriptName.sh" -ForegroundColor Green
                Write-Host ""
                & bash $shScriptPath $Args
                $exitCode = $LASTEXITCODE
                Write-Host ""
                return $exitCode
            }
            else {
                Write-Host "Script Bash non trouvé: $ScriptName.sh" -ForegroundColor Red
                Write-Host ""
                return 1
            }
        }
        "sh" {
            $shScriptPath = "scripts/$ScriptName.sh"
            if (Test-Path $shScriptPath) {
                Write-Host "Lancement avec Sh: $ScriptName.sh" -ForegroundColor Green
                Write-Host ""
                & sh $shScriptPath $Args
                $exitCode = $LASTEXITCODE
                Write-Host ""
                return $exitCode
            }
            else {
                Write-Host "Script Sh non trouvé: $ScriptName.sh" -ForegroundColor Red
                Write-Host ""
                return 1
            }
        }
        default {
            Write-Host "Shell non supporté: $ShellType" -ForegroundColor Red
            Write-Host ""
            return 1
        }
    }
}

# Parsing des arguments
for ($i = 0; $i -lt $args.Count; $i++) {
    switch ($args[$i]) {
        "-d" { $DryRun = $true }
        "--dry-run" { $DryRun = $true }
        "-f" { $Force = $true }
        "--force" { $Force = $true }
        "-h" { Show-Help; exit 0 }
        "--help" { Show-Help; exit 0 }
        "update-readme" { $ScriptName = "update-readme" }
        "cleanup-repo" { $ScriptName = "cleanup-repo" }
        "sync-drivers" { $ScriptName = "sync-drivers" }
        "setup-auto-readme" { $ScriptName = "setup-auto-readme" }
        "diagnostic" { $ScriptName = "diagnostic-complet" }
        "validation" { $ScriptName = "validation-finale" }
        "compatibilite" { $ScriptName = "test-compatibilite" }
        default {
            Write-Host "Option inconnue: $($args[$i])" -ForegroundColor Red
            Write-Host ""
            Show-Help
            exit 1
        }
    }
}

# Vérification du script demandé
if ([string]::IsNullOrEmpty($ScriptName)) {
    Write-Host "❌ Aucun script spécifié" -ForegroundColor Red
    Write-Host ""
    Show-Help
    exit 1
}

Write-Host "LANCEMENT UNIVERSEL - Tuya Zigbee Project" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Détection du shell
$ShellType = Get-ShellType
Write-Host "Shell détecté: $ShellType" -ForegroundColor White
Write-Host ""

# Construction des arguments
$Args = ""
if ($DryRun) {
    $Args += " --dry-run"
}
if ($Force) {
    $Args += " --force"
}

Write-Host "Script demandé: $ScriptName" -ForegroundColor White
Write-Host "Arguments: $Args" -ForegroundColor White
Write-Host ""

# Lancement du script
Write-Host "Lancement en cours..." -ForegroundColor Yellow
Write-Host ""
Start-Sleep -Milliseconds 100

$ExitCode = Invoke-Script -ScriptName $ScriptName -ShellType $ShellType -Args $Args

Write-Host ""
if ($ExitCode -eq 0) {
    Write-Host "✅ Script exécuté avec succès" -ForegroundColor Green
    Write-Host ""
    exit 0
}
else {
    Write-Host "❌ Erreur lors de l'exécution du script" -ForegroundColor Red
    Write-Host ""
    exit 1
} 

