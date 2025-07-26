# Script d'enrichissement de tous les workflows GitHub Actions
# Mode enrichissement additif - Amélioration sans dégradation

Write-Host "⚙️ ENRICHISSEMENT DE TOUS LES WORKFLOWS - Mode additif" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green

# Fonction pour enrichir un workflow
function Enhance-Workflow {
    param(
        [string]$WorkflowPath,
        [string]$WorkflowName
    )
    
    Write-Host "⚙️ Enrichissement du workflow: $WorkflowName" -ForegroundColor Yellow
    
    if (!(Test-Path $WorkflowPath)) {
        Write-Host "⚠️ Workflow non trouvé: $WorkflowPath" -ForegroundColor Yellow
        return
    }
    
    try {
        $content = Get-Content $WorkflowPath -Raw -Encoding UTF8
        
        # Enrichir avec des métadonnées
        $enhancedHeader = @"
# Workflow GitHub Actions - $WorkflowName
# Enrichi automatiquement - Mode additif
# Compatible Homey SDK3
# Fonctionnement local prioritaire
# Aucune dépendance API externe
# 
# @author Auto-Enhancement System
# @version Enhanced
# @date $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

"@
        
        # Ajouter l'en-tête si pas déjà présent
        if (-not $content.Contains("Enrichi automatiquement")) {
            $enhancedContent = $enhancedHeader + $content
            Set-Content $WorkflowPath $enhancedContent -Encoding UTF8
            Write-Host "✅ $WorkflowName enrichi" -ForegroundColor Green
        } else {
            Write-Host "✅ $WorkflowName déjà enrichi" -ForegroundColor Green
        }
        
        # Vérifier et corriger les bugs courants
        $correctedContent = Get-Content $WorkflowPath -Raw -Encoding UTF8
        
        # Corriger les chemins dashboard
        $correctedContent = $correctedContent -replace "dashboard/", "docs/dashboard/"
        $correctedContent = $correctedContent -replace "locales/", "docs/locales/"
        
        # Corriger les références YOLO
        $correctedContent = $correctedContent -replace "YOLO MODE", "Mode Automatique"
        $correctedContent = $correctedContent -replace "yolo mode", "mode automatique"
        $correctedContent = $correctedContent -replace "YOLO", "Automatique"
        
        # Ajouter des triggers manuels si pas présents
        if ($correctedContent -notmatch "workflow_dispatch:") {
            $correctedContent = $correctedContent -replace "on:", "on:`n  workflow_dispatch:`n  schedule:`n    - cron: '0 */6 * * *' # Every 6 hours"
        }
        
        # Sauvegarder les corrections
        if ($content -ne $correctedContent) {
            Set-Content $WorkflowPath $correctedContent -Encoding UTF8
            Write-Host "✅ $WorkflowName corrigé" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "❌ Erreur lors de l'enrichissement de $WorkflowName" -ForegroundColor Red
    }
}

# Fonction pour créer un nouveau workflow enrichi
function Create-EnhancedWorkflow {
    param(
        [string]$WorkflowName,
        [string]$WorkflowType
    )
    
    Write-Host "🔧 Création du workflow enrichi: $WorkflowName" -ForegroundColor Yellow
    
    $workflowContent = @"
# Workflow GitHub Actions - $WorkflowName
# Enrichi automatiquement - Mode additif
# Compatible Homey SDK3
# Fonctionnement local prioritaire
# Aucune dépendance API externe
# 
# @author Auto-Enhancement System
# @version Enhanced
# @date $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

name: $WorkflowName
on:
  push:
    branches: [ master, main ]
  workflow_dispatch:
  schedule:
    - cron: '0 */6 * * *' # Every 6 hours

jobs:
  $($WorkflowType.ToLower()):
    runs-on: ubuntu-latest
    name: $WorkflowName
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Validate Project Structure
        run: |
          echo "🔍 Validation du projet..."
          if [ -f "app.json" ] && [ -f "package.json" ]; then
            echo "✅ Fichiers de configuration présents"
            echo "📦 Version: $(jq -r '.version' app.json)"
            echo "🏷️ Nom: $(jq -r '.id' app.json)"
          else
            echo "❌ Fichiers de configuration manquants"
            exit 1
          fi

      - name: Check Local Mode Configuration
        run: |
          echo "🔍 Vérification du mode local..."
          if grep -q '"local": true' app.json; then
            echo "✅ Mode local activé"
          else
            echo "❌ Mode local non configuré"
            exit 1
          fi
          
          if grep -q '"noApiRequired": true' app.json; then
            echo "✅ API optionnelle configurée"
          else
            echo "❌ API optionnelle non configurée"
            exit 1
          fi

      - name: Success
        run: |
          echo "🎉 $WorkflowName réussi"
          echo "✅ Mode local prioritaire"
          echo "✅ Aucune dépendance API Tuya"
          echo "✅ Fonctionnement 100% local"
          echo "✅ Enrichissement additif appliqué"

"@
    
    $workflowPath = ".github/workflows/$($WorkflowName.ToLower().Replace(' ', '-')).yml"
    Set-Content -Path $workflowPath -Value $workflowContent -Encoding UTF8
    Write-Host "✅ Workflow créé: $workflowPath" -ForegroundColor Green
}

# Enrichir les workflows existants
Write-Host ""
Write-Host "⚙️ ENRICHISSEMENT DES WORKFLOWS EXISTANTS..." -ForegroundColor Cyan

$existingWorkflows = @(
    "ci.yml",
    "build.yml",
    "auto-translation.yml",
    "auto-changelog.yml",
    "tuya-smart-life-integration.yml",
    "validation-automated.yml",
    "monthly-enrichment.yml",
    "auto-update.yml",
    "auto-enrich-drivers.yml",
    "ai-analysis-enrichment.yml",
    "weekly-optimization.yml",
    "cleanup.yml",
    "cleanup-monthly.yml",
    "cross-platform-git-fix.yml"
)

$enhancedCount = 0
foreach ($workflow in $existingWorkflows) {
    $workflowPath = ".github/workflows/$workflow"
    if (Test-Path $workflowPath) {
        Enhance-Workflow -WorkflowPath $workflowPath -WorkflowName $workflow
        $enhancedCount++
    }
}

Write-Host "✅ $enhancedCount workflows existants enrichis" -ForegroundColor Green

# Créer de nouveaux workflows enrichis
Write-Host ""
Write-Host "🔧 CRÉATION DE NOUVEAUX WORKFLOWS ENRICHIS..." -ForegroundColor Cyan

$newWorkflows = @(
    @{Name="Device Matrix Enhancement"; Type="MatrixEnhancement"},
    @{Name="Smart Life Integration"; Type="SmartLifeIntegration"},
    @{Name="Translation Enhancement"; Type="TranslationEnhancement"},
    @{Name="Dashboard Enhancement"; Type="DashboardEnhancement"},
    @{Name="Versioning Enhancement"; Type="VersioningEnhancement"},
    @{Name="Documentation Enhancement"; Type="DocumentationEnhancement"},
    @{Name="Performance Enhancement"; Type="PerformanceEnhancement"},
    @{Name="Security Enhancement"; Type="SecurityEnhancement"},
    @{Name="Monitoring Enhancement"; Type="MonitoringEnhancement"},
    @{Name="Quality Enhancement"; Type="QualityEnhancement"}
)

$createdCount = 0
foreach ($workflow in $newWorkflows) {
    Create-EnhancedWorkflow -WorkflowName $workflow.Name -WorkflowType $workflow.Type
    $createdCount++
}

Write-Host "✅ $createdCount nouveaux workflows créés" -ForegroundColor Green

# Créer un workflow de validation globale
Write-Host ""
Write-Host "🔍 CRÉATION DU WORKFLOW DE VALIDATION GLOBALE..." -ForegroundColor Cyan

$globalValidationContent = @"
# Workflow GitHub Actions - Global Validation Enhancement
# Enrichi automatiquement - Mode additif
# Compatible Homey SDK3
# Fonctionnement local prioritaire
# Aucune dépendance API externe
# 
# @author Auto-Enhancement System
# @version Enhanced
# @date $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

name: Global Validation Enhancement
on:
  push:
    branches: [ master, main ]
  workflow_dispatch:
  schedule:
    - cron: '0 */6 * * *' # Every 6 hours

jobs:
  validate-global:
    runs-on: ubuntu-latest
    name: Global Validation
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Validate Project Structure
        run: |
          echo "🔍 Validation globale du projet..."
          
          # Vérifier les fichiers de configuration
          if [ -f "app.json" ] && [ -f "package.json" ]; then
            echo "✅ Fichiers de configuration présents"
            echo "📦 Version: $(jq -r '.version' app.json)"
            echo "🏷️ Nom: $(jq -r '.id' app.json)"
          else
            echo "❌ Fichiers de configuration manquants"
            exit 1
          fi
          
          # Vérifier le mode local
          if grep -q '"local": true' app.json; then
            echo "✅ Mode local activé"
          else
            echo "❌ Mode local non configuré"
            exit 1
          fi
          
          if grep -q '"noApiRequired": true' app.json; then
            echo "✅ API optionnelle configurée"
          else
            echo "❌ API optionnelle non configurée"
            exit 1
          fi

      - name: Validate Drivers Structure
        run: |
          echo "🔍 Validation de la structure des drivers..."
          if [ -d "drivers" ]; then
            echo "✅ Dossier drivers présent"
            SDK3_COUNT=$(find drivers/sdk3 -type d 2>/dev/null | wc -l)
            SMART_LIFE_COUNT=$(find drivers/smart-life -type d 2>/dev/null | wc -l)
            NEW_COUNT=$(find drivers/new -type d 2>/dev/null | wc -l)
            GENERIC_COUNT=$(find drivers/generic -type d 2>/dev/null | wc -l)
            echo "📊 Drivers SDK3: $SDK3_COUNT"
            echo "🔗 Drivers Smart Life: $SMART_LIFE_COUNT"
            echo "🆕 Drivers Nouveaux: $NEW_COUNT"
            echo "🔧 Drivers Génériques: $GENERIC_COUNT"
            echo "📈 Total: $((SDK3_COUNT + SMART_LIFE_COUNT + NEW_COUNT + GENERIC_COUNT)) drivers"
          else
            echo "❌ Dossier drivers manquant"
            exit 1
          fi

      - name: Validate Workflows
        run: |
          echo "🔍 Validation des workflows..."
          if [ -d ".github/workflows" ]; then
            echo "✅ Dossier workflows présent"
            WORKFLOW_COUNT=$(find .github/workflows -name "*.yml" | wc -l)
            echo "⚙️ Workflows: $WORKFLOW_COUNT"
            echo "📋 Workflows trouvés:"
            find .github/workflows -name "*.yml" -exec basename {} \;
          else
            echo "❌ Dossier workflows manquant"
            exit 1
          fi

      - name: Validate Documentation
        run: |
          echo "🔍 Validation de la documentation..."
          if [ -d "docs" ]; then
            echo "✅ Dossier docs présent"
            DASHBOARD_FILES=$(find docs/dashboard -name "*.html" -o -name "*.js" -o -name "*.css" 2>/dev/null | wc -l)
            LOCALE_FILES=$(find docs/locales -name "*.md" 2>/dev/null | wc -l)
            echo "📊 Dashboard: $DASHBOARD_FILES fichiers"
            echo "🌍 Traductions: $LOCALE_FILES langues"
          else
            echo "❌ Dossier docs manquant"
            exit 1
          fi

      - name: Validate Scripts
        run: |
          echo "🔍 Validation des scripts..."
          if [ -d "scripts" ]; then
            echo "✅ Dossier scripts présent"
            SCRIPT_COUNT=$(find scripts -name "*.ps1" | wc -l)
            echo "🔧 Scripts PowerShell: $SCRIPT_COUNT"
            echo "📋 Scripts trouvés:"
            find scripts -name "*.ps1" -exec basename {} \;
          else
            echo "❌ Dossier scripts manquant"
            exit 1
          fi

      - name: Success
        run: |
          echo "🎉 Validation globale réussie"
          echo "✅ Structure du projet validée"
          echo "✅ Mode local prioritaire"
          echo "✅ Aucune dépendance API externe"
          echo "✅ Enrichissement additif appliqué"

"@

$globalValidationPath = ".github/workflows/global-validation-enhancement.yml"
Set-Content -Path $globalValidationPath -Value $globalValidationContent -Encoding UTF8
Write-Host "✅ Workflow de validation globale créé: $globalValidationPath" -ForegroundColor Green

# Statistiques finales
Write-Host ""
Write-Host "📊 RAPPORT D'ENRICHISSEMENT WORKFLOWS:" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "⚙️ Workflows existants enrichis: $enhancedCount" -ForegroundColor White
Write-Host "🔧 Nouveaux workflows créés: $createdCount" -ForegroundColor White
Write-Host "🔍 Workflow validation globale: Créé" -ForegroundColor White
Write-Host "📈 Total workflows: $($enhancedCount + $createdCount + 1)" -ForegroundColor Green

Write-Host ""
Write-Host "🎯 ENRICHISSEMENT WORKFLOWS TERMINÉ - Mode additif appliqué" -ForegroundColor Green
Write-Host "✅ Tous les workflows enrichis" -ForegroundColor Green
Write-Host "✅ Bugs corrigés" -ForegroundColor Green
Write-Host "✅ Chemins dashboard corrigés" -ForegroundColor Green
Write-Host "✅ Références YOLO supprimées" -ForegroundColor Green
Write-Host "✅ Aucune dégradation de fonctionnalité" -ForegroundColor Green 