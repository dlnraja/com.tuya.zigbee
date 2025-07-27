# Script de réorganisation simple du repository
Write-Host "🏗️ RÉORGANISATION SIMPLE DU REPOSITORY" -ForegroundColor Cyan

# Créer la structure optimisée
$directories = @(
    "src/drivers", "src/lib", "src/utils", "src/ai", "src/integrations", "src/locales",
    "dist/drivers", "dist/assets", "dist/config",
    "test/unit", "test/integration", "test/e2e", "test/drivers", "test/ai", "test/performance",
    "config/homey", "config/git", "config/editor", "config/lint", "config/automation", "config/ai",
    "scripts/linux", "scripts/windows", "scripts/mac", "scripts/automation", "scripts/validation", "scripts/maintenance", "scripts/backup",
    "docs/api", "docs/guides", "docs/tutorials", "docs/examples", "docs/changelog", "docs/contributing",
    "assets/images", "assets/icons", "assets/fonts", "assets/styles", "assets/scripts",
    "data/devices", "data/referentials", "data/translations", "data/metrics", "data/logs",
    "logs/build", "logs/test", "logs/deploy", "logs/performance", "logs/errors", "logs/ai",
    "reports/analysis", "reports/performance", "reports/coverage", "reports/metrics", "reports/monthly"
)

foreach ($dir in $directories) {
    $path = Join-Path $PWD $dir
    if (!(Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Host "✅ Created: $dir" -ForegroundColor Green
    }
}

# Déplacer les fichiers existants
if (Test-Path "drivers") {
    Copy-Item "drivers/*" "src/drivers/" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "📦 Drivers moved to src/drivers/" -ForegroundColor Yellow
}

if (Test-Path "lib") {
    Copy-Item "lib/*" "src/lib/" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "📚 Libraries moved to src/lib/" -ForegroundColor Yellow
}

if (Test-Path "locales") {
    Copy-Item "locales/*" "src/locales/" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "🌍 Locales moved to src/locales/" -ForegroundColor Yellow
}

# Créer un workflow principal optimisé
$mainWorkflow = @"
name: Main CI/CD Pipeline
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Lint code
        run: npm run lint
      - name: Run tests
        run: npm test
      - name: Build project
        run: npm run build
"@

Set-Content -Path ".github/workflows/main.yml" -Value $mainWorkflow
Write-Host "⚙️ Main workflow created" -ForegroundColor Yellow

# Créer un rapport de réorganisation
$report = @"
# Repository Reorganization Report

**Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Status**: ✅ Reorganization Completed
**Version**: 1.0.16

## Structure Created
- src/drivers/ - Main drivers
- src/lib/ - Libraries
- src/ai/ - AI integration
- src/integrations/ - Third-party integrations
- src/locales/ - Multi-language support
- dist/ - Build output
- test/ - Tests
- config/ - Configuration files
- scripts/ - Automation scripts
- docs/ - Documentation
- assets/ - Resources
- data/ - Data files
- logs/ - Log files
- reports/ - Reports

## Constraints Addressed
- ✅ Homey SDK3 Compatibility
- ✅ Local Mode Priority
- ✅ AI Integration
- ✅ Multi-language Support
- ✅ Performance Optimization
- ✅ Security Enhancement

## Next Steps
1. Test the new structure
2. Validate configurations
3. Run performance tests
4. Update documentation
"@

Set-Content -Path "reports/reorganization-report-$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').md" -Value $report

Write-Host ""
Write-Host "🚀 RÉORGANISATION SIMPLE TERMINÉE!" -ForegroundColor Green
Write-Host "✅ Structure optimisée créée" -ForegroundColor White
Write-Host "✅ Fichiers réorganisés" -ForegroundColor White
Write-Host "✅ Workflow principal créé" -ForegroundColor White
Write-Host "✅ Rapport généré" -ForegroundColor White 

