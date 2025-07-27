
---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
# Script de Correction Terminal - Eviter les Blocages Cursor

Write-Host "Debut de la correction des problemes de terminal..." -ForegroundColor Green

# Configuration pour eviter les blocages
$env:TERM = "xterm-256color"
$env:COLUMNS = 120
$env:LINES = 30

# Configuration PowerShell
$PSDefaultParameterValues['Out-Default:OutVariable'] = 'LastResult'
$PSDefaultParameterValues['*:Verbose'] = $true

Write-Host "Configuration terminal optimisee" -ForegroundColor Green

# Fonction pour executer des commandes avec timeout
function Invoke-CommandWithTimeout {
    param(
        [string]$Command,
        [int]$TimeoutSeconds = 30
    )
    
    Write-Host "Execution: $Command" -ForegroundColor Yellow
    
    try {
        $job = Start-Job -ScriptBlock { param($cmd) Invoke-Expression $cmd } -ArgumentList $Command
        
        if (Wait-Job $job -Timeout $TimeoutSeconds) {
            $result = Receive-Job $job
            Remove-Job $job
            return $result
        } else {
            Write-Host "Timeout atteint pour: $Command" -ForegroundColor Red
            Stop-Job $job
            Remove-Job $job
            return $null
        }
    } catch {
        Write-Host "Erreur lors de l'execution: $Command" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        return $null
    }
}

# Fonction pour verifier l'etat du repository
function Test-RepositoryState {
    Write-Host "Verification de l'etat du repository..." -ForegroundColor Cyan
    
    $status = git status --porcelain
    $branches = git branch -a
    
    Write-Host "Etat du repository:" -ForegroundColor Green
    Write-Host "- Modifications: $($status.Count)" -ForegroundColor White
    Write-Host "- Branches: $($branches.Count)" -ForegroundColor White
    
    return @{
        Status = $status
        Branches = $branches
    }
}

# Fonction pour nettoyer les processus bloques
function Clear-BlockedProcesses {
    Write-Host "Nettoyage des processus bloques..." -ForegroundColor Cyan
    
    $blockedProcesses = Get-Process | Where-Object { 
        $_.ProcessName -like "*git*" -or 
        $_.ProcessName -like "*powershell*" -or
        $_.ProcessName -like "*cursor*"
    }
    
    foreach ($process in $blockedProcesses) {
        try {
            if ($process.Responding -eq $false) {
                Write-Host "Redemarrage du processus: $($process.ProcessName)" -ForegroundColor Yellow
                Stop-Process -Id $process.Id -Force
            }
        } catch {
            Write-Host "Impossible de redemarrer: $($process.ProcessName)" -ForegroundColor Yellow
        }
    }
}

# Fonction pour optimiser les commandes Git
function Optimize-GitCommands {
    Write-Host "Optimisation des commandes Git..." -ForegroundColor Cyan
    
    # Configuration Git pour eviter les blocages
    git config --global core.pager "less -R"
    git config --global core.editor "code --wait"
    git config --global init.defaultBranch master
    
    Write-Host "Configuration Git optimisee" -ForegroundColor Green
}

# Execution des corrections
Write-Host "Debut des corrections..." -ForegroundColor Green

# 1. Nettoyer les processus bloques
Clear-BlockedProcesses

# 2. Optimiser les commandes Git
Optimize-GitCommands

# 3. Verifier l'etat du repository
$repoState = Test-RepositoryState

# 4. Test des commandes avec timeout
Write-Host "Test des commandes avec timeout..." -ForegroundColor Cyan

$testCommands = @(
    "git status",
    "git branch -a",
    "git log --oneline -3"
)

foreach ($cmd in $testCommands) {
    $result = Invoke-CommandWithTimeout -Command $cmd -TimeoutSeconds 10
    if ($result) {
        Write-Host "Succes: $cmd" -ForegroundColor Green
    } else {
        Write-Host "Echec: $cmd" -ForegroundColor Red
    }
}

Write-Host "Corrections terminees!" -ForegroundColor Green
Write-Host "Resume:" -ForegroundColor Cyan
Write-Host "- Terminal optimise" -ForegroundColor White
Write-Host "- Processus nettoyes" -ForegroundColor White
Write-Host "- Git configure" -ForegroundColor White
Write-Host "- Timeout active" -ForegroundColor White

Write-Host "Terminal pret pour Cursor!" -ForegroundColor Green 




