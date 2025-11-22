#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script de réorganisation automatique du projet Homey App
.DESCRIPTION
    Consolide 80+ dossiers en une structure propre et maintenable
.NOTES
    Exécuter uniquement après validation et backup!
#>

param(
  [switch]$DryRun = $false,
  [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🗂️  RÉORGANISATION DU PROJET HOMEY APP" -ForegroundColor Cyan
Write-Host ""

# Vérifier que nous sommes dans le bon répertoire
if (-not (Test-Path "app.json")) {
  Write-Host "❌ app.json introuvable! Mauvais répertoire." -ForegroundColor Red
  exit 1
}

# Mode dry-run
if ($DryRun) {
  Write-Host "🔍 MODE DRY-RUN: Aucune modification ne sera effectuée" -ForegroundColor Yellow
  Write-Host ""
}

# Sécurité: Vérifier backup
if (-not $Force -and -not $DryRun) {
  Write-Host "⚠️  ATTENTION: Cette opération va déplacer de nombreux dossiers!" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Avez-vous fait un backup? (git commit + git tag)" -ForegroundColor Yellow
  $response = Read-Host "Continuer? (oui/non)"
  if ($response -ne "oui") {
    Write-Host "❌ Opération annulée" -ForegroundColor Red
    exit 0
  }
}

Write-Host "📋 PHASE 1: Création de la structure cible" -ForegroundColor Green
Write-Host ""

$targetDirs = @(
  ".archive",
  ".archive/backups",
  ".archive/old-docs",
  ".archive/old-scripts",
  ".archive/research",
  ".archive/temp",
  ".analysis",
  ".analysis/pdfs",
  ".analysis/github",
  ".analysis/diagnostics",
  ".analysis/reports",
  "scripts",
  "scripts/enrichment",
  "scripts/validation",
  "scripts/automation"
)

foreach ($dir in $targetDirs) {
  if ($DryRun) {
    Write-Host "  [DRY-RUN] Créerait: $dir"
  }
  else {
    if (-not (Test-Path $dir)) {
      New-Item -ItemType Directory -Path $dir -Force | Out-Null
      Write-Host "  ✅ Créé: $dir" -ForegroundColor Green
    }
    else {
      Write-Host "  ℹ️  Existe déjà: $dir" -ForegroundColor Gray
    }
  }
}

Write-Host ""
Write-Host "📋 PHASE 2: Déplacement des archives" -ForegroundColor Green
Write-Host ""

# Fonction de déplacement sécurisé
function Move-SafeDirectory {
  param(
    [string]$Source,
    [string]$Destination,
    [string]$Description
  )

  if (Test-Path $Source) {
    if ($DryRun) {
      Write-Host "  [DRY-RUN] $Description"
      Write-Host "           $Source → $Destination"
    }
    else {
      try {
        Move-Item -Path $Source -Destination $Destination -Force
        Write-Host "  ✅ $Description" -ForegroundColor Green
      }
      catch {
        Write-Host "  ⚠️  Erreur: $Description - $($_.Exception.Message)" -ForegroundColor Yellow
      }
    }
  }
  else {
    Write-Host "  ⊗  Skip (introuvable): $Source" -ForegroundColor Gray
  }
}

# Backups
Move-SafeDirectory ".backup-enrichment" ".archive/backups/enrichment" "Backup enrichissement"
Move-SafeDirectory "backup" ".archive/backups/misc" "Backup misc"
Move-SafeDirectory "lib_backup_1762217200536" ".archive/backups/lib" "Backup lib"

# Anciennes docs
Move-SafeDirectory "archive" ".archive/old-docs/archive" "Archive docs"
Move-SafeDirectory "references" ".archive/old-docs/references" "References"
Move-SafeDirectory "readme-variants" ".archive/old-docs/readme-variants" "Readme variants"
Move-SafeDirectory "instructions" ".archive/old-docs/instructions" "Instructions"
Move-SafeDirectory "pairing" ".archive/old-docs/pairing" "Pairing docs"
Move-SafeDirectory "releases" ".archive/old-docs/releases" "Releases docs"
Move-SafeDirectory "troubleshooting" ".archive/old-docs/troubleshooting" "Troubleshooting"

# Recherches
Move-SafeDirectory "research" ".archive/research/research" "Research"
Move-SafeDirectory "github-analysis" ".archive/research/github" "GitHub analysis"
Move-SafeDirectory "github-issues" ".archive/research/issues" "GitHub issues"
Move-SafeDirectory "scraped_data" ".archive/research/scraped" "Scraped data"
Move-SafeDirectory "project-data" ".archive/research/project-data" "Project data"
Move-SafeDirectory "data" ".archive/research/data" "Data"

# Temporaires
if (Test-Path ".dev") {
  Write-Host "  ⚠️  .dev est très volumineux (249 MB) - archivage..." -ForegroundColor Yellow
  Move-SafeDirectory ".dev" ".archive/temp/dev" "Dev temporaire"
}
Move-SafeDirectory "test" ".archive/temp/test" "Tests"
Move-SafeDirectory "tests" ".archive/temp/tests" "Tests 2"

Write-Host ""
Write-Host "📋 PHASE 3: Consolidation des analyses" -ForegroundColor Green
Write-Host ""

Move-SafeDirectory "pdf_analysis" ".analysis/pdfs/analysis" "Analyse PDFs"
Move-SafeDirectory "pdfhomey" ".analysis/pdfs/sources" "Sources PDFs"
Move-SafeDirectory "diagnostic-reports" ".analysis/diagnostics/reports" "Rapports diagnostics"
Move-SafeDirectory "diagnostics" ".analysis/diagnostics/data" "Données diagnostics"
Move-SafeDirectory "reports" ".analysis/reports/general" "Rapports généraux"
Move-SafeDirectory "audit" ".analysis/reports/audit" "Audits"
Move-SafeDirectory "audits" ".analysis/reports/audits" "Audits 2"
Move-SafeDirectory "stats" ".analysis/reports/stats" "Statistiques"

Write-Host ""
Write-Host "📋 PHASE 4: Organisation des scripts" -ForegroundColor Green
Write-Host ""

Move-SafeDirectory "enrichment" "scripts/enrichment/old" "Scripts enrichissement"
Move-SafeDirectory "automation" "scripts/automation/old" "Scripts automation"
Move-SafeDirectory "workflow" "scripts/automation/workflow" "Workflows"
Move-SafeDirectory "orchestrator" "scripts/automation/orchestrator" "Orchestrator"
Move-SafeDirectory "validation" "scripts/validation/old" "Scripts validation"

# Déplacer scripts individuels
if (Test-Path "extract_pdfs.py") {
  if ($DryRun) {
    Write-Host "  [DRY-RUN] Déplacerait: extract_pdfs.py → scripts/enrichment/"
  }
  else {
    Move-Item "extract_pdfs.py" "scripts/enrichment/" -Force
    Write-Host "  ✅ Script PDF Python déplacé" -ForegroundColor Green
  }
}

if (Test-Path "enrich_from_pdfs.js") {
  if ($DryRun) {
    Write-Host "  [DRY-RUN] Déplacerait: enrich_from_pdfs.js → scripts/enrichment/"
  }
  else {
    Move-Item "enrich_from_pdfs.js" "scripts/enrichment/" -Force
    Write-Host "  ✅ Script enrichissement JS déplacé" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "📋 PHASE 5: Nettoyage dossiers obsolètes" -ForegroundColor Green
Write-Host ""

$obsoleteDirs = @(
  "achievements",
  "analysis",
  "compatibility",
  "contributions",
  "conversion",
  "debug",
  "deployments",
  "finalization",
  "forum",
  "forum_requests",
  "forum-responses",
  "implementation",
  "matrix",
  "misc",
  "organized",
  "planning",
  "planning_v5",
  "project-status",
  "run-everything",
  "sdk3",
  "sessions",
  "summaries",
  "technical",
  "templates",
  "ultimate_system",
  "users",
  "v3"
)

foreach ($dir in $obsoleteDirs) {
  if (Test-Path $dir) {
    $dest = ".archive/temp/$dir"
    if ($DryRun) {
      Write-Host "  [DRY-RUN] Archiverait: $dir → $dest"
    }
    else {
      try {
        Move-Item -Path $dir -Destination $dest -Force
        Write-Host "  ✅ Archivé: $dir" -ForegroundColor Green
      }
      catch {
        Write-Host "  ⚠️  Erreur archivage: $dir" -ForegroundColor Yellow
      }
    }
  }
}

Write-Host ""
Write-Host "📋 PHASE 6: Suppression dossiers temporaires" -ForegroundColor Green
Write-Host ""

if (Test-Path ".homeybuild") {
  if ($DryRun) {
    Write-Host "  [DRY-RUN] Supprimerait: .homeybuild"
  }
  else {
    Remove-Item ".homeybuild" -Recurse -Force
    Write-Host "  ✅ Supprimé: .homeybuild (sera regénéré)" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "📋 PHASE 7: Consolidation des commits" -ForegroundColor Green
Write-Host ""

$commitDirs = @("commits", "communication", "community")
foreach ($dir in $commitDirs) {
  Move-SafeDirectory $dir ".archive/old-docs/$dir" "Docs $dir"
}

Write-Host ""
Write-Host "📋 PHASE 8: Consolidation guides & docs" -ForegroundColor Green
Write-Host ""

Move-SafeDirectory "guides" ".archive/old-docs/guides" "Guides"
Move-SafeDirectory "fixes" ".archive/old-scripts/fixes" "Fixes"
Move-SafeDirectory "flow" ".archive/old-docs/flow" "Flow docs"
Move-SafeDirectory "tools" "scripts/automation/tools" "Tools"
Move-SafeDirectory "utils" "scripts/automation/utils" "Utils"

# Nettoyage final du dossier support
if (Test-Path "support") {
  Write-Host "  ⚠️  Support contient 133 MB - vérification nécessaire avant archivage" -ForegroundColor Yellow
  Write-Host "     Conservé temporairement pour vérification manuelle" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=" -repeat 60 -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
  Write-Host "🔍 DRY-RUN TERMINÉ" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Pour exécuter réellement:" -ForegroundColor White
  Write-Host "  .\reorganize_project.ps1 -Force" -ForegroundColor Cyan
}
else {
  Write-Host "✅ RÉORGANISATION TERMINÉE!" -ForegroundColor Green
  Write-Host ""
  Write-Host "📊 PROCHAINES ÉTAPES:" -ForegroundColor White
  Write-Host "  1. Vérifier: git status" -ForegroundColor Cyan
  Write-Host "  2. Valider: homey app validate --level publish" -ForegroundColor Cyan
  Write-Host "  3. Tester: homey app build" -ForegroundColor Cyan
  Write-Host "  4. Si OK: git add . && git commit" -ForegroundColor Cyan
}

Write-Host ""
