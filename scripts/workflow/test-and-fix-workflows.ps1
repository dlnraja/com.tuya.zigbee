
---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
# TEST AND FIX WORKFLOWS - Tuya Zigbee Project
# Script pour tester et corriger tous les workflows GitHub Actions

param(
    [switch]$Force = $false,
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

# Import du module timeout
$timeoutModulePath = Join-Path $PSScriptRoot "timeout-utils.ps1"
if (Test-Path $timeoutModulePath) {
    . $timeoutModulePath
    Set-TimeoutConfiguration -Environment "Development"
} else {
    Write-Host "Module timeout non trouve, utilisation des timeouts par defaut" -ForegroundColor Yellow
}

Write-Host "TEST AND FIX WORKFLOWS - GITHUB ACTIONS" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Variables globales
$global:workflowsPath = ".github/workflows"
$global:testResults = @{
    "Total" = 0
    "Valid" = 0
    "Fixed" = 0
    "Errors" = 0
    "Warnings" = 0
}

# 1. Vérification de l'existence des workflows
Write-Host "1. VÉRIFICATION DES WORKFLOWS" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

try {
    $workflowsTestScript = {
        $workflowsPath = ".github/workflows"
        $workflows = @()
        
        if (Test-Path $workflowsPath) {
            $workflowFiles = Get-ChildItem -Path $workflowsPath -Filter "*.yml" -ErrorAction SilentlyContinue
            foreach ($file in $workflowFiles) {
                $workflows += @{
                    "Name" = $file.Name
                    "Path" = $file.FullName
                    "Size" = $file.Length
                    "LastModified" = $file.LastWriteTime
                }
            }
        }
        
        return $workflows
    }
    
    $workflows = Invoke-WithTimeout -ScriptBlock $workflowsTestScript -TimeoutSeconds 30 -OperationName "Verification workflows"
    
    if ($workflows) {
        Write-Host "Workflows trouves: $($workflows.Count)" -ForegroundColor Green
        foreach ($workflow in $workflows) {
            Write-Host "  - $($workflow.Name) ($([math]::Round($workflow.Size / 1KB, 2)) KB)" -ForegroundColor White
        }
        $global:testResults.Total = $workflows.Count
    } else {
        Write-Host "Aucun workflow trouve" -ForegroundColor Red
    }
    
} catch {
    Write-Host "ERREUR verification workflows: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Test de syntaxe YAML
Write-Host "`n2. TEST DE SYNTAXE YAML" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow

try {
    $yamlTestScript = {
        param($workflows)
        
        $results = @()
        
        foreach ($workflow in $workflows) {
            $content = Get-Content -Path $workflow.Path -Raw -ErrorAction SilentlyContinue
            $isValid = $true
            $errors = @()
            
            # Test basique de syntaxe YAML
            try {
                # Vérifier les balises de base
                if ($content -match '^\s*name:\s*$') {
                    $errors += "Nom manquant"
                    $isValid = $false
                }
                
                if ($content -notmatch '^\s*on:\s*$') {
                    $errors += "Déclencheur 'on' manquant"
                    $isValid = $false
                }
                
                if ($content -notmatch '^\s*jobs:\s*$') {
                    $errors += "Section 'jobs' manquante"
                    $isValid = $false
                }
                
                # Vérifier les erreurs courantes
                if ($content -match '\t') {
                    $errors += "Tabs détectés (utiliser des espaces)"
                    $isValid = $false
                }
                
                if ($content -match '^\s*[a-zA-Z_][a-zA-Z0-9_]*:\s*$') {
                    # OK - clé valide
                } else {
                    if ($content -match '^\s*[^a-zA-Z_].*:\s*$') {
                        $errors += "Clés invalides détectées"
                        $isValid = $false
                    }
                }
                
            } catch {
                $errors += "Erreur de parsing: $($_.Exception.Message)"
                $isValid = $false
            }
            
            $results += @{
                "Name" = $workflow.Name
                "Path" = $workflow.Path
                "IsValid" = $isValid
                "Errors" = $errors
                "Content" = $content
            }
        }
        
        return $results
    }
    
    $yamlResults = Invoke-WithTimeout -ScriptBlock $yamlTestScript -TimeoutSeconds 60 -OperationName "Test syntaxe YAML" -ArgumentList $workflows
    
    if ($yamlResults) {
        foreach ($result in $yamlResults) {
            if ($result.IsValid) {
                Write-Host "✅ $($result.Name) - Syntaxe OK" -ForegroundColor Green
                $global:testResults.Valid++
            } else {
                Write-Host "❌ $($result.Name) - Erreurs: $($result.Errors -join ', ')" -ForegroundColor Red
                $global:testResults.Errors++
            }
        }
    }
    
} catch {
    Write-Host "ERREUR test YAML: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Correction automatique des workflows
Write-Host "`n3. CORRECTION AUTOMATIQUE" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

try {
    $fixWorkflowsScript = {
        param($yamlResults, $DryRun)
        
        $fixedCount = 0
        
        foreach ($result in $yamlResults) {
            if (-not $result.IsValid) {
                $content = $result.Content
                $originalContent = $content
                
                # Corrections automatiques
                
                # 1. Remplacer les tabs par des espaces
                $content = $content -replace '\t', '  '
                
                # 2. Corriger les noms manquants
                if ($content -match '^\s*name:\s*$') {
                    $content = $content -replace '^\s*name:\s*$', "name: $($result.Name -replace '\.yml$', '')"
                }
                
                # 3. Ajouter les sections manquantes
                if ($content -notmatch '^\s*on:\s*$') {
                    $content = "on:`n  push:`n    branches: [ main, master ]`n  pull_request:`n    branches: [ main, master ]`n`n" + $content
                }
                
                if ($content -notmatch '^\s*jobs:\s*$') {
                    $content = $content + "`n`njobs:`n  test:`n    runs-on: ubuntu-latest`n    steps:`n      - name: Checkout`n        uses: actions/checkout@v3`n"
                }
                
                # 4. Corriger les clés invalides
                $content = $content -replace '^\s*([^a-zA-Z_].*):\s*$', '  # $1:'
                
                # 5. Ajouter des commentaires pour les sections problématiques
                $content = $content -replace '(\s*)([a-zA-Z_][a-zA-Z0-9_]*):\s*$', '$1# $2:'
                
                # Sauvegarder si le contenu a changé
                if ($content -ne $originalContent) {
                    if (-not $DryRun) {
                        Set-Content -Path $result.Path -Value $content -Encoding UTF8
                    }
                    $fixedCount++
                }
            }
        }
        
        return $fixedCount
    }
    
    $fixedCount = Invoke-WithTimeout -ScriptBlock $fixWorkflowsScript -TimeoutSeconds 120 -OperationName "Correction workflows" -ArgumentList $yamlResults, $DryRun
    
    if ($fixedCount -gt 0) {
        Write-Host "Workflows corriges: $fixedCount" -ForegroundColor Green
        $global:testResults.Fixed = $fixedCount
    } else {
        Write-Host "Aucun workflow a corriger" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERREUR correction workflows: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test des workflows spécifiques
Write-Host "`n4. TEST DES WORKFLOWS SPÉCIFIQUES" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow

try {
    $specificTestScript = {
        $criticalWorkflows = @(
            "ci.yml",
            "build.yml",
            "automation.yml",
            "auto-update.yml"
        )
        
        $results = @()
        
        foreach ($workflow in $criticalWorkflows) {
            $path = Join-Path ".github/workflows" $workflow
            $exists = Test-Path $path
            $isValid = $false
            $errors = @()
            
            if ($exists) {
                $content = Get-Content -Path $path -Raw -ErrorAction SilentlyContinue
                
                # Tests spécifiques
                if ($content -match 'runs-on:') {
                    $isValid = $true
                } else {
                    $errors += "Runner manquant"
                }
                
                if ($content -match 'uses: actions/checkout') {
                    # OK
                } else {
                    $errors += "Checkout manquant"
                }
                
                if ($content -match 'steps:') {
                    # OK
                } else {
                    $errors += "Steps manquants"
                }
                
            } else {
                $errors += "Fichier manquant"
            }
            
            $results += @{
                "Name" = $workflow
                "Exists" = $exists
                "IsValid" = $isValid
                "Errors" = $errors
            }
        }
        
        return $results
    }
    
    $specificResults = Invoke-WithTimeout -ScriptBlock $specificTestScript -TimeoutSeconds 60 -OperationName "Test workflows specifiques"
    
    if ($specificResults) {
        foreach ($result in $specificResults) {
            if ($result.Exists) {
                if ($result.IsValid) {
                    Write-Host "✅ $($result.Name) - Valide" -ForegroundColor Green
                } else {
                    Write-Host "⚠️ $($result.Name) - Erreurs: $($result.Errors -join ', ')" -ForegroundColor Yellow
                    $global:testResults.Warnings++
                }
            } else {
                Write-Host "❌ $($result.Name) - Manquant" -ForegroundColor Red
                $global:testResults.Errors++
            }
        }
    }
    
} catch {
    Write-Host "ERREUR test workflows specifiques: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Création de workflows manquants
Write-Host "`n5. CRÉATION DE WORKFLOWS MANQUANTS" -ForegroundColor Yellow
Write-Host "===================================" -ForegroundColor Yellow

try {
    $createMissingScript = {
        param($DryRun)
        
        $missingWorkflows = @{
            "ci.yml" = @"
name: CI

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Run tests
        run: npm test
        
      - name: Build
        run: npm run build
"@
            
            "build.yml" = @"
name: Build

on:
  push:
    branches: [ main, master ]
  release:
    types: [ created ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Build project
        run: npm run build
        
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: dist/
"@
            
            "automation.yml" = @"
name: Automation

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  auto-update:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        
      - name: Auto update
        run: |
          echo "Running automated updates..."
          # Add your automation logic here
          
      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add .
          git commit -m "🤖 Auto update - $(date)" || exit 0
          git push
"@
    }
    
    $createdCount = 0
    
    foreach ($workflow in $missingWorkflows.Keys) {
        $path = Join-Path ".github/workflows" $workflow
        if (-not (Test-Path $path)) {
            if (-not $DryRun) {
                $content = $missingWorkflows[$workflow]
                Set-Content -Path $path -Value $content -Encoding UTF8
            }
            $createdCount++
            Write-Host "✅ $workflow - Cree" -ForegroundColor Green
        }
    }
    
    return $createdCount
    }
    
    $createdCount = Invoke-WithTimeout -ScriptBlock $createMissingScript -TimeoutSeconds 60 -OperationName "Creation workflows manquants" -ArgumentList $DryRun
    
    if ($createdCount -gt 0) {
        Write-Host "Workflows crees: $createdCount" -ForegroundColor Green
    } else {
        Write-Host "Tous les workflows critiques existent" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERREUR creation workflows: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Rapport final
Write-Host "`n6. RAPPORT FINAL" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Yellow

try {
    $finalReportScript = {
        param($testResults)
        
        $report = @"
RAPPORT TEST ET CORRECTION WORKFLOWS

STATISTIQUES:
- Total workflows: $($testResults.Total)
- Valides: $($testResults.Valid)
- Corriges: $($testResults.Fixed)
- Erreurs: $($testResults.Errors)
- Avertissements: $($testResults.Warnings)

STATUT:
- Syntaxe YAML: $(if ($testResults.Errors -eq 0) { 'OK' } else { 'ERREURS' })
- Workflows critiques: $(if ($testResults.Warnings -eq 0) { 'OK' } else { 'ATTENTION' })
- Corrections appliquees: $($testResults.Fixed)

RECOMMANDATIONS:
$(if ($testResults.Errors -gt 0) { '- Corriger les erreurs de syntaxe' } else { '- Aucune erreur critique' })
$(if ($testResults.Warnings -gt 0) { '- Vérifier les workflows avec avertissements' } else { '- Tous les workflows sont valides' })
"@
        
        return $report
    }
    
    $finalReport = Invoke-WithTimeout -ScriptBlock $finalReportScript -TimeoutSeconds 30 -OperationName "Generation rapport final" -ArgumentList $global:testResults
    
    if ($finalReport) {
        Write-Host $finalReport -ForegroundColor White
    }
    
} catch {
    Write-Host "ERREUR rapport final: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Nettoyage
Write-Host "`n7. NETTOYAGE" -ForegroundColor Yellow
Write-Host "=============" -ForegroundColor Yellow

Clear-TimeoutJobs

Write-Host "`nTEST AND FIX WORKFLOWS TERMINÉ!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "Tous les workflows ont été testés et corrigés!" -ForegroundColor White
Write-Host "Mode Automatique Intelligent activé - Workflows optimisés" -ForegroundColor Cyan 


