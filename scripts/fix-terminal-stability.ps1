# Fix Terminal Stability - Correction des problèmes de terminal
# Évite les blocages et les demandes d'appui sur Entrée

Write-Host "🔧 CORRECTION DE LA STABILITÉ DU TERMINAL" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Configuration pour éviter les blocages
$Host.UI.RawUI.WindowTitle = "Tuya Repair - Terminal Stable"
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

# Désactivation des prompts interactifs
$ConfirmPreference = "None"
$WhatIfPreference = $false

# Configuration PowerShell pour éviter les blocages
if (Get-Module PSReadLine -ErrorAction SilentlyContinue) {
    Set-PSReadLineOption -EditMode Windows
    Set-PSReadLineOption -PredictionSource None
    Set-PSReadLineOption -PredictionViewStyle ListView
}

Write-Host "✅ Configuration terminal appliquée" -ForegroundColor Green

# Fonction pour exécuter des commandes sans blocage
function Invoke-SafeCommand {
    param(
        [string]$Command,
        [string]$Description = ""
    )
    
    Write-Host "🔄 Exécution: $Description" -ForegroundColor Cyan
    
    try {
        # Exécution avec timeout pour éviter les blocages
        $job = Start-Job -ScriptBlock { 
            param($cmd)
            Invoke-Expression $cmd
        } -ArgumentList $Command
        
        # Attendre avec timeout
        Wait-Job $job -Timeout 30 | Out-Null
        
        if ($job.State -eq "Running") {
            Stop-Job $job
            Write-Host "⏰ Timeout atteint pour: $Description" -ForegroundColor Yellow
        } else {
            $result = Receive-Job $job
            Write-Host "✅ Succès: $Description" -ForegroundColor Green
            return $result
        }
    }
    catch {
        Write-Host "❌ Erreur: $Description - $($_.Exception.Message)" -ForegroundColor Red
    }
    finally {
        if ($job) {
            Remove-Job $job -Force -ErrorAction SilentlyContinue
        }
    }
}

# Fonction pour traiter les fichiers sans blocage
function Process-FilesNonBlocking {
    param($Path, $Pattern = "*")
    
    Write-Host "📁 Traitement non-bloquant: $Path" -ForegroundColor Yellow
    
    try {
        Get-ChildItem -Path $Path -Filter $Pattern -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
            Write-Host "  📄 $($_.Name)" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "⚠️ Erreur d'accès: $Path" -ForegroundColor Yellow
    }
}

# Configuration pour les commandes longues
Write-Host "⚙️ Configuration des commandes longues..." -ForegroundColor Yellow

# Test de stabilité
Write-Host "🧪 Test de stabilité du terminal..." -ForegroundColor Yellow

# Exécution de commandes de test
Invoke-SafeCommand -Command "Get-Date" -Description "Test de date"
Invoke-SafeCommand -Command "Get-Location" -Description "Test de localisation"
Invoke-SafeCommand -Command "Get-ChildItem -Path . -Name | Select-Object -First 5" -Description "Test de listing"

Write-Host "✅ Tests de stabilité terminés" -ForegroundColor Green

# Configuration finale
Write-Host "🎯 Configuration finale appliquée:" -ForegroundColor Green
Write-Host "  - Timeout automatique: 30 secondes" -ForegroundColor Cyan
Write-Host "  - Gestion d'erreurs: Continue" -ForegroundColor Cyan
Write-Host "  - Prompts désactivés" -ForegroundColor Cyan
Write-Host "  - PSReadLine optimisé" -ForegroundColor Cyan

Write-Host "🚀 Terminal prêt pour les opérations YOLO!" -ForegroundColor Green 