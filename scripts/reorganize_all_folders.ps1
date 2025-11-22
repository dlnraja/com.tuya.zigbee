#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Réorganisation COMPLÈTE de tous les dossiers du projet
.DESCRIPTION
    Consolide ~100 dossiers en une structure logique de ~15 dossiers
#>

param(
  [switch]$DryRun = $false
)

Write-Host "🗂️  RÉORGANISATION COMPLÈTE DES DOSSIERS`n" -ForegroundColor Cyan

# Dossiers à garder à la racine (essentiels Homey)
$keepFolders = @(
  'drivers',
  'lib',
  'locales',
  'assets',
  '.github',
  'node_modules',
  '.homeybuild',
  '.vscode',
  'tests'
)

# Dossiers créés par notre réorganisation (à garder)
$ourFolders = @(
  'scripts',
  'docs',
  'logs',
  '.archive'
)

# Nouvelle structure cible
$consolidation = @{
  '.archive/old-structure' = @(
    'archive',
    'backup',
    'lib_backup_*',
    '.backup-*',
    'v3'
  )

  'docs/analysis'          = @(
    'analysis',
    'diagnostic_analysis',
    'diagnostic-reports',
    'diagnostics',
    'pdf_analysis',
    'pdfhomey',
    'github-analysis',
    'github-issues',
    'research'
  )

  'docs/planning'          = @(
    'planning',
    'planning_v5',
    'project-status',
    'sessions'
  )

  'docs/reports'           = @(
    'reports',
    'summaries',
    'achievements',
    'releases'
  )

  'docs/community'         = @(
    'community',
    'forum',
    'forum_requests',
    'forum-responses',
    'contributions',
    'users'
  )

  'docs/guides'            = @(
    'guides',
    'instructions',
    'references',
    'readme-variants'
  )

  'scripts/automation'     = @(
    'automation',
    'workflow',
    'orchestrator',
    'run-everything',
    'ultimate_system'
  )

  'scripts/tools'          = @(
    'tools',
    'utils',
    'conversion',
    'compatibility'
  )

  '.dev'                   = @(
    'debug',
    'test',
    'validation',
    'audit',
    'audits'
  )

  'data'                   = @(
    'data',
    'matrix',
    'stats',
    'project-data',
    'scraped_data'
  )

  '.archive/old-code'      = @(
    'api',
    'sdk3',
    'finalization',
    'implementation',
    'organized'
  )

  'settings'               = @(
    'settings',
    'communication'
  )

  'support'                = @(
    'support',
    'troubleshooting',
    'technical'
  )

  'misc'                   = @(
    'misc',
    'templates',
    'commits',
    'deployments',
    '.githooks',
    'pairing',
    'flow',
    'enrichment',
    'fixes'
  )
}

# Créer les dossiers cibles
Write-Host "📁 Création des dossiers cibles...`n" -ForegroundColor Yellow

foreach ($target in $consolidation.Keys) {
  if (-not (Test-Path $target)) {
    if (-not $DryRun) {
      New-Item -ItemType Directory -Path $target -Force | Out-Null
    }
    Write-Host "  ✅ Créé: $target/" -ForegroundColor Green
  }
}

# Déplacer les dossiers
Write-Host "`n📦 Consolidation des dossiers...`n" -ForegroundColor Yellow

$movedCount = 0
$skippedCount = 0

foreach ($target in $consolidation.Keys) {
  $patterns = $consolidation[$target]
  Write-Host "  📂 $target/" -ForegroundColor Cyan

  foreach ($pattern in $patterns) {
    # Gérer wildcards
    $folders = Get-ChildItem -Directory -Filter $pattern -ErrorAction SilentlyContinue

    foreach ($folder in $folders) {
      # Vérifier si à garder
      if ($keepFolders -contains $folder.Name -or $ourFolders -contains $folder.Name) {
        Write-Host "    ⏭️  Gardé: $($folder.Name)/" -ForegroundColor Gray
        $skippedCount++
        continue
      }

      # Vérifier si déjà dans le bon dossier
      if ($folder.FullName.Contains($target)) {
        continue
      }

      $destination = Join-Path $target $folder.Name

      if (Test-Path $destination) {
        Write-Host "    ⚠️  Existe: $($folder.Name)/" -ForegroundColor Yellow
        $skippedCount++
        continue
      }

      if (-not $DryRun) {
        try {
          Move-Item -Path $folder.FullName -Destination $destination -Force -ErrorAction Stop
          Write-Host "    ✅ Déplacé: $($folder.Name)/ → $target/" -ForegroundColor Green
          $movedCount++
        }
        catch {
          Write-Host "    ❌ Erreur: $($folder.Name)/ - $($_.Exception.Message)" -ForegroundColor Red
          $skippedCount++
        }
      }
      else {
        Write-Host "    [DRY] Déplacerait: $($folder.Name)/ → $target/" -ForegroundColor Cyan
        $movedCount++
      }
    }
  }
  Write-Host ""
}

# Résumé
Write-Host "═" * 70 -ForegroundColor Cyan
Write-Host "`n📊 RÉSUMÉ`n" -ForegroundColor Cyan
Write-Host "  Dossiers déplacés: $movedCount" -ForegroundColor Green
Write-Host "  Dossiers ignorés: $skippedCount" -ForegroundColor Yellow

# Créer README dans nouveaux dossiers
Write-Host "`n📝 Création des README...`n" -ForegroundColor Yellow

$readmes = @{
  'docs/analysis/README.md'          = "# Analyses`n`nAnalyses diagnostiques, PDFs, et rapports de problèmes."
  'docs/planning/README.md'          = "# Planning`n`nPlanning, sessions de travail, et statuts projet."
  'docs/reports/README.md'           = "# Rapports`n`nRapports, résumés, achievements, et releases."
  'docs/community/README.md'         = "# Community`n`nContenu communauté, forum, et contributions utilisateurs."
  'docs/guides/README.md'            = "# Guides`n`nGuides, instructions, références, et variantes README."
  'scripts/automation/README.md'     = "# Automation`n`nScripts d'automatisation et workflows."
  'scripts/tools/README.md'          = "# Tools`n`nOutils, utilitaires, et scripts de conversion."
  '.dev/README.md'                   = "# Dev Tools`n`nOutils de développement, debug, et validation."
  'data/README.md'                   = "# Data`n`nDonnées du projet, stats, matrices."
  'settings/README.md'               = "# Settings`n`nConfiguration et communication."
  'support/README.md'                = "# Support`n`nSupport technique et troubleshooting."
  'misc/README.md'                   = "# Misc`n`nFichiers divers et templates."
  '.archive/old-structure/README.md' = "# Old Structure`n`nAncienne structure de dossiers (archive)."
  '.archive/old-code/README.md'      = "# Old Code`n`nAncien code et implémentations (archive)."
}

foreach ($readme in $readmes.Keys) {
  if (-not $DryRun) {
    $readmes[$readme] | Out-File -FilePath $readme -Encoding UTF8
  }
  Write-Host "  ✅ Créé: $readme" -ForegroundColor Green
}

# Afficher structure finale
Write-Host "`n═" * 70 -ForegroundColor Cyan
Write-Host "`n📁 STRUCTURE FINALE`n" -ForegroundColor Cyan

if (-not $DryRun) {
  Get-ChildItem -Directory | Where-Object { $_.Name -notlike "node_modules" } |
  Select-Object Name | Sort-Object Name | Format-Table -HideTableHeaders
}

if ($DryRun) {
  Write-Host "`n⚠️  MODE DRY-RUN - Aucun dossier déplacé" -ForegroundColor Yellow
  Write-Host "Relancez sans -DryRun pour appliquer les changements`n" -ForegroundColor Yellow
}
else {
  Write-Host "`n✅ RÉORGANISATION COMPLÈTE TERMINÉE!`n" -ForegroundColor Green
  Write-Host "⏭️  Prochaines étapes:" -ForegroundColor Cyan
  Write-Host "  1. Tester: npx homey app validate" -ForegroundColor White
  Write-Host "  2. Vérifier que l'app fonctionne" -ForegroundColor White
  Write-Host "  3. Commit les changements`n" -ForegroundColor White
}
