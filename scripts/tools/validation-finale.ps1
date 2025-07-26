# VALIDATION FINALE - Tuya Zigbee Project
# Script de validation finale et push avec timeouts

param(
    [switch]$Force = $false,
    [switch]$DryRun = $false,
    [int]$TimeoutSeconds = 300
)

# Import du module timeout
$timeoutModulePath = Join-Path $PSScriptRoot "timeout-utils.ps1"
if (Test-Path $timeoutModulePath) {
    . $timeoutModulePath
    Set-TimeoutConfiguration -Environment "Development"
} else {
    Write-Host "⚠️ Module timeout non trouvé, utilisation des timeouts par défaut" -ForegroundColor Yellow
}

Write-Host "VALIDATION FINALE DU PROJET" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

# Statistiques de timeout
$timeoutStats = @{
    "GitOperations" = 0
    "ScriptTests" = 0
    "FileOperations" = 0
    "ValidationChecks" = 0
}

# 1) Vérification de l'état Git avec timeout
Write-Host "1. VÉRIFICATION ÉTAT GIT" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

try {
    $gitStatus = Invoke-GitWithTimeout -GitCommand "status --porcelain" -TimeoutSeconds 30 -OperationName "Git Status"
    $currentBranch = Invoke-GitWithTimeout -GitCommand "branch --show-current" -TimeoutSeconds 15 -OperationName "Git Branch"
    
    $modifiedFiles = ($gitStatus | Measure-Object).Count
    
    Write-Host "Branche actuelle: $currentBranch" -ForegroundColor White
    Write-Host "Fichiers modifiés: $modifiedFiles" -ForegroundColor White
    
    if ($modifiedFiles -gt 0) {
        Write-Host "⚠️ Fichiers non commités détectés" -ForegroundColor Yellow
        Invoke-GitWithTimeout -GitCommand "status --short" -TimeoutSeconds 15 -OperationName "Git Status Short"
    } else {
        Write-Host "✅ Aucun fichier modifié" -ForegroundColor Green
    }
    
    $timeoutStats.GitOperations++
} catch {
    Write-Host "❌ ERREUR Git: $($_.Exception.Message)" -ForegroundColor Red
    if (-not $ContinueOnTimeout) {
        throw
    }
}

# 2) Test des scripts avec timeout
Write-Host "`n2. TEST DES SCRIPTS" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow

$scripts = @("update-readme.ps1", "setup-auto-readme.ps1", "sync-drivers.ps1", "diagnostic-complet.ps1")
$allScriptsOK = $true

foreach ($script in $scripts) {
    $scriptPath = Join-Path $PSScriptRoot $script
    if (Test-Path $scriptPath) {
        try {
            $result = Invoke-ScriptWithTimeout -ScriptPath $scriptPath -Arguments @("-DryRun") -TimeoutSeconds 60 -OperationName "Test $script"
            Write-Host "✅ $script - OK" -ForegroundColor Green
            $timeoutStats.ScriptTests++
        } catch {
            Write-Host "❌ $script - ERREUR: $($_.Exception.Message)" -ForegroundColor Red
            $allScriptsOK = $false
        }
    } else {
        Write-Host "❌ $script - MANQUANT" -ForegroundColor Red
        $allScriptsOK = $false
    }
}

# 3) Validation des métriques avec timeout
Write-Host "`n3. VALIDATION DES MÉTRIQUES" -ForegroundColor Yellow
Write-Host "===========================" -ForegroundColor Yellow

try {
    $metricsScript = {
        $repoSize = (Get-ChildItem -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
        $driverCount = (Get-ChildItem -Path "drivers" -Filter "*.js" -Recurse -ErrorAction SilentlyContinue | Measure-Object).Count
        $languageCount = (Get-ChildItem -Path "locales" -Include "*.json", "*.md" -Recurse -ErrorAction SilentlyContinue | Measure-Object).Count
        
        return @{
            "RepoSize" = $repoSize
            "DriverCount" = $driverCount
            "LanguageCount" = $languageCount
        }
    }
    
    $metrics = Invoke-WithTimeout -ScriptBlock $metricsScript -TimeoutSeconds 60 -OperationName "Calcul métriques"
    
    Write-Host "Taille repo: $([math]::Round($metrics.RepoSize, 2)) MB" -ForegroundColor White
    Write-Host "Drivers: $($metrics.DriverCount)" -ForegroundColor White
    Write-Host "Langues: $($metrics.LanguageCount)" -ForegroundColor White
    
    $timeoutStats.ValidationChecks++
} catch {
    Write-Host "❌ ERREUR métriques: $($_.Exception.Message)" -ForegroundColor Red
    if (-not $ContinueOnTimeout) {
        throw
    }
}

# 4) Validation des fichiers critiques avec timeout
Write-Host "`n4. VALIDATION FICHIERS CRITIQUES" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow

$criticalFiles = @("app.json", "package.json", "README.md", ".gitignore")
$allFilesOK = $true

try {
    $fileCheckScript = {
        param($files)
        $results = @{}
        foreach ($file in $files) {
            if (Test-Path $file) {
                $size = (Get-Item $file).Length
                $results[$file] = @{ "Exists" = $true; "Size" = $size }
            } else {
                $results[$file] = @{ "Exists" = $false; "Size" = 0 }
            }
        }
        return $results
    }
    
    $fileResults = Invoke-WithTimeout -ScriptBlock $fileCheckScript -TimeoutSeconds 30 -OperationName "Vérification fichiers" -ArgumentList $criticalFiles
    
    foreach ($file in $criticalFiles) {
        if ($fileResults[$file].Exists) {
            $size = $fileResults[$file].Size
            Write-Host "✅ $file ($size bytes)" -ForegroundColor Green
        } else {
            Write-Host "❌ $file - MANQUANT" -ForegroundColor Red
            $allFilesOK = $false
        }
    }
    
    $timeoutStats.FileOperations++
} catch {
    Write-Host "❌ ERREUR fichiers: $($_.Exception.Message)" -ForegroundColor Red
    if (-not $ContinueOnTimeout) {
        throw
    }
}

# 5) Validation des workflows avec timeout
Write-Host "`n5. VALIDATION WORKFLOWS" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow

try {
    $workflowScript = {
        $workflowFiles = Get-ChildItem -Path ".github/workflows" -Filter "*.yml" -ErrorAction SilentlyContinue
        return $workflowFiles
    }
    
    $workflowFiles = Invoke-WithTimeout -ScriptBlock $workflowScript -TimeoutSeconds 30 -OperationName "Vérification workflows"
    $workflowCount = $workflowFiles.Count
    
    Write-Host "Workflows trouvés: $workflowCount" -ForegroundColor White
    foreach ($workflow in $workflowFiles) {
        Write-Host "- $($workflow.Name)" -ForegroundColor White
    }
    
    $timeoutStats.ValidationChecks++
} catch {
    Write-Host "❌ ERREUR workflows: $($_.Exception.Message)" -ForegroundColor Red
    if (-not $ContinueOnTimeout) {
        throw
    }
}

# 6) Rapport de validation avec timeout
Write-Host "`n6. RAPPORT DE VALIDATION" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

try {
    $validationScript = {
        param($scriptsOK, $filesOK, $modifiedFiles)
        $validationOK = $scriptsOK -and $filesOK -and ($modifiedFiles -eq 0)
        return $validationOK
    }
    
    $validationOK = Invoke-WithTimeout -ScriptBlock $validationScript -TimeoutSeconds 15 -OperationName "Validation finale" -ArgumentList $allScriptsOK, $allFilesOK, $modifiedFiles
    
    if ($validationOK) {
        Write-Host "✅ VALIDATION RÉUSSIE" -ForegroundColor Green
        Write-Host "====================" -ForegroundColor Green
        Write-Host "Tous les tests sont passés avec succès!" -ForegroundColor White
        
        if (-not $DryRun) {
            Write-Host "`n🚀 PUSH VERS ORIGIN" -ForegroundColor Cyan
            Write-Host "===================" -ForegroundColor Cyan
            
            try {
                Invoke-GitWithTimeout -GitCommand "add ." -TimeoutSeconds 30 -OperationName "Git Add"
                Invoke-GitWithTimeout -GitCommand "commit -m 'VALIDATION FINALE: Projet validé et optimisé - Mode YOLO Intelligent activé'" -TimeoutSeconds 30 -OperationName "Git Commit"
                Invoke-GitWithTimeout -GitCommand "push origin master" -TimeoutSeconds 120 -OperationName "Git Push"
                
                Write-Host "✅ Push réussi vers origin/master" -ForegroundColor Green
            } catch {
                Write-Host "❌ ERREUR Push: $($_.Exception.Message)" -ForegroundColor Red
                if (-not $ContinueOnTimeout) {
                    throw
                }
            }
        } else {
            Write-Host "ℹ️ Mode DryRun - Pas de push effectué" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ VALIDATION ÉCHOUÉE" -ForegroundColor Red
        Write-Host "====================" -ForegroundColor Red
        Write-Host "Certains tests ont échoué. Vérifiez les erreurs ci-dessus." -ForegroundColor White
        exit 1
    }
    
    $timeoutStats.ValidationChecks++
} catch {
    Write-Host "❌ ERREUR validation: $($_.Exception.Message)" -ForegroundColor Red
    if (-not $ContinueOnTimeout) {
        throw
    }
}

# 7) Affichage des statistiques de timeout
Write-Host "`n7. STATISTIQUES TIMEOUT" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow

Show-TimeoutStats -Stats $timeoutStats

# 8) Nettoyage des jobs
Write-Host "`n8. NETTOYAGE" -ForegroundColor Yellow
Write-Host "=============" -ForegroundColor Yellow

Clear-TimeoutJobs

Write-Host "`n🎉 VALIDATION FINALE TERMINÉE" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host "Projet Tuya Zigbee validé avec succès!" -ForegroundColor White
Write-Host "Mode YOLO Intelligent activé - Optimisation continue" -ForegroundColor Cyan 
