# ============================================================================
# TEST_ALL_SCRIPTS.ps1
# ============================================================================
# Description: Tests automatisés de tous les scripts PowerShell
# Author: Universal Tuya Zigbee Project
# Version: 1.0.0
# Date: 2025-01-15
# ============================================================================

$ErrorActionPreference = "Continue"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    TESTS AUTOMATISÉS DES SCRIPTS                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Fonction: Test syntaxe PowerShell
function Test-ScriptSyntax {
    param([string]$ScriptPath)
    
    try {
        $errors = $null
        $null = [System.Management.Automation.PSParser]::Tokenize((Get-Content $ScriptPath -Raw), [ref]$errors)
        
        if ($errors.Count -eq 0) {
            return @{ success = $true; errors = @() }
        } else {
            return @{ success = $false; errors = $errors }
        }
    } catch {
        return @{ success = $false; errors = @($_.Exception.Message) }
    }
}

# Fonction: Analyser les dépendances
function Get-ScriptDependencies {
    param([string]$ScriptPath)
    
    $content = Get-Content $ScriptPath -Raw
    $dependencies = @{
        externalCommands = @()
        requiredModules = @()
        fileReferences = @()
    }
    
    # Détecter modules requis
    if ($content -match '#Requires -Modules? (.+)') {
        $dependencies.requiredModules += $Matches[1] -split ','
    }
    
    # Détecter commandes externes (git, node, etc.)
    $externalCmds = @('git', 'node', 'npm', 'homey')
    foreach ($cmd in $externalCmds) {
        if ($content -match "\b$cmd\b") {
            $dependencies.externalCommands += $cmd
        }
    }
    
    return $dependencies
}

# Fonction: Évaluer la qualité du code
function Test-CodeQuality {
    param([string]$ScriptPath)
    
    $content = Get-Content $ScriptPath -Raw
    $quality = @{
        score = 100
        issues = @()
        recommendations = @()
    }
    
    # Vérifier header
    if ($content -notmatch '# ={70,}') {
        $quality.score -= 5
        $quality.issues += "Missing standard header"
    }
    
    # Vérifier documentation
    if ($content -notmatch '# Description:') {
        $quality.score -= 10
        $quality.issues += "Missing description"
    }
    
    # Vérifier error handling
    if ($content -notmatch '\$ErrorActionPreference') {
        $quality.score -= 5
        $quality.recommendations += "Consider setting ErrorActionPreference"
    }
    
    # Vérifier functions
    $functionCount = ([regex]::Matches($content, 'function\s+\w+')).Count
    if ($functionCount -eq 0 -and $content.Length -gt 5000) {
        $quality.score -= 10
        $quality.recommendations += "Large script should be modularized with functions"
    }
    
    # Vérifier commentaires
    $lines = $content -split "`n"
    $commentLines = ($lines | Where-Object { $_ -match '^\s*#' }).Count
    $commentRatio = $commentLines / $lines.Count
    
    if ($commentRatio -lt 0.1) {
        $quality.score -= 10
        $quality.recommendations += "Add more comments (current: $([math]::Round($commentRatio*100, 1))%)"
    }
    
    return $quality
}

# Scanner tous les scripts
$scripts = Get-ChildItem $PSScriptRoot -Filter "*.ps1" | 
    Where-Object { $_.Name -ne "TEST_ALL_SCRIPTS.ps1" }

Write-Host "📋 Scripts trouvés: $($scripts.Count)" -ForegroundColor Cyan
Write-Host ""

$results = @()

foreach ($script in $scripts) {
    Write-Host "🔍 Test: $($script.Name)" -ForegroundColor Yellow
    
    $result = @{
        name = $script.Name
        path = $script.FullName
        size = $script.Length
        lastModified = $script.LastWriteTime
        syntaxCheck = $null
        dependencies = $null
        quality = $null
        overallStatus = "UNKNOWN"
    }
    
    # Test syntaxe
    Write-Host "  └─ Syntaxe... " -NoNewline
    $syntaxTest = Test-ScriptSyntax -ScriptPath $script.FullName
    $result.syntaxCheck = $syntaxTest
    
    if ($syntaxTest.success) {
        Write-Host "✅" -ForegroundColor Green
    } else {
        Write-Host "❌" -ForegroundColor Red
        foreach ($error in $syntaxTest.errors) {
            Write-Host "     └─ $error" -ForegroundColor Red
        }
    }
    
    # Analyser dépendances
    Write-Host "  └─ Dépendances... " -NoNewline
    $deps = Get-ScriptDependencies -ScriptPath $script.FullName
    $result.dependencies = $deps
    
    $depsCount = $deps.externalCommands.Count + $deps.requiredModules.Count
    Write-Host "📦 $depsCount" -ForegroundColor Cyan
    
    # Qualité du code
    Write-Host "  └─ Qualité... " -NoNewline
    $quality = Test-CodeQuality -ScriptPath $script.FullName
    $result.quality = $quality
    
    $scoreColor = if ($quality.score -ge 80) { "Green" } 
                  elseif ($quality.score -ge 60) { "Yellow" } 
                  else { "Red" }
    Write-Host "$($quality.score)/100" -ForegroundColor $scoreColor
    
    # Status global
    if ($syntaxTest.success -and $quality.score -ge 60) {
        $result.overallStatus = "PASS"
    } elseif ($syntaxTest.success) {
        $result.overallStatus = "WARNING"
    } else {
        $result.overallStatus = "FAIL"
    }
    
    $results += $result
    Write-Host ""
}

# Résumé
Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                        RÉSUMÉ DES TESTS                            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

$passed = ($results | Where-Object { $_.overallStatus -eq "PASS" }).Count
$warnings = ($results | Where-Object { $_.overallStatus -eq "WARNING" }).Count
$failed = ($results | Where-Object { $_.overallStatus -eq "FAIL" }).Count

Write-Host "📊 Résultats:" -ForegroundColor Cyan
Write-Host "  • PASS:    $passed" -ForegroundColor Green
Write-Host "  • WARNING: $warnings" -ForegroundColor Yellow
Write-Host "  • FAIL:    $failed" -ForegroundColor Red
Write-Host ""

# Scripts avec problèmes
$problematicScripts = $results | Where-Object { $_.overallStatus -ne "PASS" }
if ($problematicScripts.Count -gt 0) {
    Write-Host "⚠️  Scripts nécessitant attention:" -ForegroundColor Yellow
    foreach ($script in $problematicScripts) {
        Write-Host "  • $($script.name) [$($script.overallStatus)]" -ForegroundColor Yellow
        
        if ($script.quality.issues.Count -gt 0) {
            foreach ($issue in $script.quality.issues) {
                Write-Host "    └─ $issue" -ForegroundColor Gray
            }
        }
    }
    Write-Host ""
}

# Top scripts par qualité
$topScripts = $results | Sort-Object { $_.quality.score } -Descending | Select-Object -First 3
Write-Host "🏆 Top 3 scripts par qualité:" -ForegroundColor Cyan
foreach ($script in $topScripts) {
    Write-Host "  • $($script.name): $($script.quality.score)/100" -ForegroundColor Green
}
Write-Host ""

# Recommandations globales
Write-Host "💡 Recommandations:" -ForegroundColor Cyan
$allRecommendations = $results | ForEach-Object { $_.quality.recommendations } | 
    Group-Object | Sort-Object Count -Descending | Select-Object -First 3

foreach ($rec in $allRecommendations) {
    Write-Host "  • $($rec.Name) ($($rec.Count) scripts)" -ForegroundColor White
}
Write-Host ""

# Export rapport
$reportPath = Join-Path $PSScriptRoot "SCRIPT_TEST_REPORT_$timestamp.json"
$reportData = @{
    timestamp = $timestamp
    summary = @{
        totalScripts = $scripts.Count
        passed = $passed
        warnings = $warnings
        failed = $failed
    }
    results = $results
}

$reportData | ConvertTo-Json -Depth 10 | Set-Content $reportPath
Write-Host "✅ Rapport exporté: $reportPath" -ForegroundColor Green
Write-Host ""
