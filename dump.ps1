#!/usr/bin/env pwsh

param(
    [int]$RunSeconds = 300
)

Write-Host "🚀 HOMEY DUMP BUNDLE - BRIEF 'BÉTON'" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green

# Créer le dossier de dump
$timestamp = Get-Date -Format "yyyyMMdd-HHmm"
$dumpDir = "dumps/$timestamp"
$dumpPath = "dumps/dump-$timestamp"

if (!(Test-Path "dumps")) {
    New-Item -ItemType Directory -Path "dumps" | Out-Null
}

New-Item -ItemType Directory -Path $dumpDir | Out-Null

Write-Host "📁 Dossier de dump créé: $dumpDir" -ForegroundColor Yellow

# 1. Capture de l'environnement
Write-Host "🔍 Capture de l'environnement..." -ForegroundColor Cyan
$env = @"
=== ENVIRONNEMENT ===
Date: $(Get-Date)
PWD: $(Get-Location)
Node: $(node --version 2>$null || "Non installé")
NPM: $(npm --version 2>$null || "Non installé")
Homey CLI: $(homey --version 2>$null || "Non installé")
Git: $(git --version 2>$null || "Non installé")
"@

$env | Out-File -FilePath "$dumpDir/env.txt" -Encoding UTF8
Write-Host "✅ Environnement capturé" -ForegroundColor Green

# 2. Copie app.json
if (Test-Path "app.json") {
    Copy-Item "app.json" "$dumpDir/app.json"
    Write-Host "✅ app.json copié" -ForegroundColor Green
} else {
    Write-Host "❌ app.json non trouvé" -ForegroundColor Red
}

# 3. Strip BOM des JSON
Write-Host "🧹 Nettoyage BOM des JSON..." -ForegroundColor Cyan
$bomLog = @()
$jsonFiles = Get-ChildItem -Recurse -Include "*.json" | Where-Object { $_.FullName -notlike "*node_modules*" }

foreach ($file in $jsonFiles) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        if ($content.StartsWith([char]0xFEFF)) {
            $cleanContent = $content.Substring(1)
            Set-Content $file.FullName -Value $cleanContent -Encoding UTF8 -NoNewline
            $bomLog += "✅ BOM retiré: $($file.FullName)"
        }
    } catch {
        $bomLog += "❌ Erreur: $($file.FullName) - $($_.Exception.Message)"
    }
}

$bomLog | Out-File -FilePath "$dumpDir/strip-bom.log" -Encoding UTF8
Write-Host "✅ BOM nettoyé sur $($jsonFiles.Count) fichiers" -ForegroundColor Green

# 4. Lint JSON
Write-Host "🔍 Validation JSON..." -ForegroundColor Cyan
$lintLog = @()
$invalidJson = @()

foreach ($file in $jsonFiles) {
    try {
        $null = Get-Content $file.FullName | ConvertFrom-Json
        $lintLog += "✅ $($file.FullName)"
    } catch {
        $lintLog += "❌ $($file.FullName) - $($_.Exception.Message)"
        $invalidJson += $file.FullName
    }
}

$lintLog | Out-File -FilePath "$dumpDir/lint-json.log" -Encoding UTF8
Write-Host "✅ JSON validé: $($jsonFiles.Count - $invalidJson.Count)/$($jsonFiles.Count) valides" -ForegroundColor Green

# 5. Tree de l'arborescence
Write-Host "🌳 Génération de l'arborescence..." -ForegroundColor Cyan
$tree = @()
$tree += "=== ARBORESCENCE PROJET ==="
$tree += "Date: $(Get-Date)"
$tree += ""

function Get-TreeStructure {
    param([string]$path, [int]$level = 0)
    
    $indent = "  " * $level
    $items = Get-ChildItem $path | Sort-Object Name
    
    foreach ($item in $items) {
        if ($item.Name -notlike "node_modules" -and $item.Name -notlike ".git" -and $item.Name -notlike "dumps") {
            $tree += "$indent$($item.Name)/"
            if ($item.PSIsContainer) {
                Get-TreeStructure $item.FullName ($level + 1)
            }
        }
    }
}

Get-TreeStructure "."
$tree | Out-File -FilePath "$dumpDir/tree.txt" -Encoding UTF8
Write-Host "✅ Arborescence générée" -ForegroundColor Green

# 6. Validation Homey (debug)
Write-Host "🔍 Validation Homey (debug)..." -ForegroundColor Cyan
try {
    $validateOutput = homey app validate -l debug 2>&1 | Out-String
    $validateOutput | Out-File -FilePath "$dumpDir/validate.log" -Encoding UTF8
    
    if ($validateOutput -like "*✓*") {
        Write-Host "✅ Validation Homey réussie" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Validation Homey avec avertissements" -ForegroundColor Yellow
    }
} catch {
    $errorMsg = "❌ Erreur validation: $($_.Exception.Message)"
    $errorMsg | Out-File -FilePath "$dumpDir/validate.log" -Encoding UTF8
    Write-Host $errorMsg -ForegroundColor Red
}

# 7. Lancement Homey app run
Write-Host "🚀 Lancement Homey app run..." -ForegroundColor Cyan
Write-Host "⏱️ Durée: $RunSeconds secondes" -ForegroundColor Yellow
Write-Host "🛑 Arrêt automatique dans $RunSeconds secondes (Ctrl+C pour arrêt manuel)" -ForegroundColor Yellow

$runLog = @()
$runLog += "=== LOGS HOMEY APP RUN ==="
$runLog += "Date: $(Get-Date)"
$runLog += "Durée: $RunSeconds secondes"
$runLog += ""

# Timer pour arrêt automatique
$timer = [System.Diagnostics.Stopwatch]::StartNew()

try {
    # Lancer homey app run en arrière-plan
    $job = Start-Job -ScriptBlock {
        param($dumpDir)
        try {
            homey app run 2>&1 | Tee-Object -FilePath "$dumpDir/run.log" -Append
        } catch {
            "❌ Erreur: $($_.Exception.Message)" | Out-File -FilePath "$dumpDir/run.log" -Append
        }
    } -ArgumentList $dumpDir
    
    # Attendre la fin du timer ou interruption
    while ($timer.Elapsed.TotalSeconds -lt $RunSeconds) {
        Start-Sleep -Seconds 1
        
        # Afficher le temps restant
        $remaining = $RunSeconds - [int]$timer.Elapsed.TotalSeconds
        Write-Host "⏱️ Temps restant: $remaining secondes" -NoNewline -ForegroundColor Yellow
        Write-Host "`r" -NoNewline
        
        # Vérifier si le job est terminé
        if ($job.State -eq "Completed") {
            Write-Host "✅ Homey app run terminé" -ForegroundColor Green
            break
        }
    }
    
    # Arrêter le job si nécessaire
    if ($job.State -eq "Running") {
        Write-Host "🛑 Arrêt automatique du job..." -ForegroundColor Yellow
        Stop-Job $job
        Remove-Job $job
    }
    
} catch {
    $errorMsg = "❌ Erreur lors du lancement: $($_.Exception.Message)"
    $errorMsg | Out-File -FilePath "$dumpDir/run.log" -Encoding UTF8 -Append
    Write-Host $errorMsg -ForegroundColor Red
}

# 8. Création du ZIP final
Write-Host "📦 Création du ZIP final..." -ForegroundColor Cyan
try {
    if (Get-Command "Compress-Archive" -ErrorAction SilentlyContinue) {
        Compress-Archive -Path $dumpDir -DestinationPath "$dumpPath.zip" -Force
        Write-Host "✅ ZIP créé: $dumpPath.zip" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Compress-Archive non disponible, copie simple" -ForegroundColor Yellow
        Copy-Item $dumpDir $dumpPath -Recurse
    }
} catch {
    Write-Host "❌ Erreur création ZIP: $($_.Exception.Message)" -ForegroundColor Red
}

# 9. Rapport final
Write-Host "`n🎉 DUMP COMPLET TERMINÉ !" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green
Write-Host "📁 Dossier: $dumpDir" -ForegroundColor Yellow
Write-Host "📦 Archive: $dumpPath.zip" -ForegroundColor Yellow
Write-Host "⏱️ Durée totale: $([int]$timer.Elapsed.TotalSeconds) secondes" -ForegroundColor Yellow

Write-Host "`n📋 CONTENU DU DUMP:" -ForegroundColor Cyan
Get-ChildItem $dumpDir | ForEach-Object {
    Write-Host "  📄 $($_.Name)" -ForegroundColor White
}

Write-Host "`n🚀 PROCHAINES ÉTAPES:" -ForegroundColor Cyan
Write-Host "1. Analyser les logs dans $dumpDir" -ForegroundColor White
Write-Host "2. Corriger les erreurs JSON si nécessaire" -ForegroundColor White
Write-Host "3. Relancer la validation si besoin" -ForegroundColor White
Write-Host "4. Tester l'appairage des devices" -ForegroundColor White

$timer.Stop()
