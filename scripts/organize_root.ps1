#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Réorganisation intelligente des fichiers à la racine du projet
.DESCRIPTION
    Crée une structure propre avec dossiers docs/, scripts/, logs/, .archive/
#>

param(
  [switch]$DryRun = $false,
  [switch]$Force = $false
)

$ErrorActionPreference = 'Stop'

Write-Host "🗂️  RÉORGANISATION INTELLIGENTE DU PROJET`n" -ForegroundColor Cyan

# Définir la structure cible
$structure = @{
  'scripts'       = @{
    'description' = 'Scripts d''automatisation et corrections'
    'patterns'    = @('fix_*.js', 'fix_*.py', 'fix_*.ps1', 'apply_*.js', 'generate_*.py', 'analyze_*.py', 'extract_*.py', 'extract_*.js', 'enrich_*.js', 'reorganize_*.ps1', 'check-*.ps1')
  }
  'scripts/batch' = @{
    'description' = 'Scripts batch pour debug et installation'
    'patterns'    = @('*.bat')
  }
  'docs'          = @{
    'description' = 'Documentation du projet'
    'patterns'    = @('*_REPORT*.md', '*_STATUS*.md', '*_SUMMARY*.md', '*_GUIDE*.md', 'FINAL_*.md', 'SESSION_*.md', 'RAPPORT_*.md', 'PROJECT_*.md', 'DIAGNOSTIC_*.md', 'PDF_*.md', 'BATTERY_*.md', 'ENRICHMENT_*.md', 'ISSUES_*.md', 'PUBLICATION_*.md', 'ROOT_*.md', 'RELEASE_NOTES_*.md', 'USB_*.md', 'TEST_*.md', 'PLAN_*.md', 'GOOGLE_*.md')
  }
  'logs'          = @{
    'description' = 'Logs et rapports d''erreurs'
    'patterns'    = @('*.log', '*.txt', '!README.txt', '!LICENSE')
  }
  '.archive'      = @{
    'description' = 'Anciens fichiers de fix (historique)'
    'patterns'    = @('*_FIX_*.js', 'EMERGENCY_*.js', 'CRITICAL_*.js', 'ULTRA_*.js', 'MASSIVE_*.js', 'INTELLIGENT_*.js')
  }
}

# Fichiers à garder à la racine (essentiels)
$keepAtRoot = @(
  'app.js',
  'jest.config.js',
  'README.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'README.txt'
)

# Créer les dossiers
Write-Host "📁 Création des dossiers...`n" -ForegroundColor Yellow

foreach ($folder in $structure.Keys) {
  if (-not (Test-Path $folder)) {
    if (-not $DryRun) {
      New-Item -ItemType Directory -Path $folder -Force | Out-Null
    }
    Write-Host "  ✅ Créé: $folder/" -ForegroundColor Green
  }
  else {
    Write-Host "  ℹ️  Existe: $folder/" -ForegroundColor Gray
  }
}

# Fonction pour déplacer un fichier
function Move-FileToFolder {
  param(
    [string]$File,
    [string]$TargetFolder
  )

  $fileName = Split-Path $File -Leaf
  $target = Join-Path $TargetFolder $fileName

  if ($keepAtRoot -contains $fileName) {
    return $false
  }

  if (Test-Path $target) {
    Write-Host "  ⚠️  Existe déjà: $TargetFolder/$fileName" -ForegroundColor Yellow
    if (-not $Force) {
      return $false
    }
  }

  if (-not $DryRun) {
    Move-Item -Path $File -Destination $target -Force
  }

  Write-Host "  ✅ Déplacé: $fileName → $TargetFolder/" -ForegroundColor Green
  return $true
}

# Déplacer les fichiers selon les patterns
Write-Host "`n📦 Déplacement des fichiers...`n" -ForegroundColor Yellow

$movedCount = 0
$skippedCount = 0

foreach ($folder in $structure.Keys) {
  $config = $structure[$folder]
  Write-Host "  📂 $folder/ - $($config.description)" -ForegroundColor Cyan

  foreach ($pattern in $config.patterns) {
    # Gérer les patterns négatifs (!)
    if ($pattern.StartsWith('!')) {
      continue
    }

    $files = Get-ChildItem -File -Filter $pattern -ErrorAction SilentlyContinue

    foreach ($file in $files) {
      # Vérifier exclusions
      $excluded = $false
      foreach ($excludePattern in $config.patterns) {
        if ($excludePattern.StartsWith('!')) {
          $excludeName = $excludePattern.Substring(1)
          if ($file.Name -like $excludeName) {
            $excluded = $true
            break
          }
        }
      }

      if ($excluded) {
        continue
      }

      if (Move-FileToFolder -File $file.FullName -TargetFolder $folder) {
        $movedCount++
      }
      else {
        $skippedCount++
      }
    }
  }

  Write-Host ""
}

# Résumé
Write-Host "═" * 70 -ForegroundColor Cyan
Write-Host "`n📊 RÉSUMÉ`n" -ForegroundColor Cyan
Write-Host "  Fichiers déplacés: $movedCount" -ForegroundColor Green
Write-Host "  Fichiers ignorés: $skippedCount" -ForegroundColor Yellow
Write-Host "  Dossiers créés: $($structure.Keys.Count)" -ForegroundColor Green

# Créer README dans chaque dossier
Write-Host "`n📝 Création des README...`n" -ForegroundColor Yellow

$readmes = @{
  'scripts/README.md'       = @"
# Scripts

Scripts d'automatisation, corrections et analyses du projet.

## Sous-dossiers

- **batch/** - Scripts batch Windows (.bat) pour debug et installation

## Types de scripts

- **fix_*.{js,py,ps1}** - Scripts de correction (ESLint, indentation, etc.)
- **analyze_*.py** - Scripts d'analyse (diagnostics, PDFs, etc.)
- **extract_*.{js,py}** - Scripts d'extraction de données
- **generate_*.py** - Scripts de génération de rapports
- **apply_*.js** - Scripts d'application de corrections
- **enrich_*.js** - Scripts d'enrichissement de données

Tous ces scripts sont documentés et réutilisables pour maintenance future.
"@
  'scripts/batch/README.md' = @"
# Scripts Batch

Scripts batch Windows pour développement et debug.

## Scripts disponibles

- **DEBUG_*.bat** - Scripts de débogage
- **INSTALL_LOCAL.bat** - Installation locale de l'app
- **LIVE_DEBUG.bat** - Debug en temps réel
- **git_push.bat** - Push rapide vers Git
- **SHOW_STATUS.bat** - Afficher statut du projet

Ces scripts facilitent le développement quotidien sous Windows.
"@
  'docs/README.md'          = @"
# Documentation

Documentation complète du projet : rapports, guides, analyses.

## Organisation

### Rapports de session
- **SESSION_REPORT_*.md** - Rapports détaillés des sessions de travail
- **FINAL_SESSION_*.md** - Résumés finaux de sessions

### Documentation technique
- **MASTER_SYSTEM_GUIDE.md** - Guide système complet
- **BATTERY_*.md** - Documentation gestion batterie
- **PROJECT_*.md** - Documentation projet

### Analyses et diagnostics
- **DIAGNOSTIC_*.md** - Analyses des diagnostics
- **PDF_*.md** - Analyses des PDFs
- **ISSUES_*.md** - Problèmes résolus

### Notes de release
- **RELEASE_NOTES_*.md** - Notes de version

Voir README.md à la racine pour documentation générale.
"@
  'logs/README.md'          = @"
# Logs

Logs et rapports d'erreurs du projet.

## Types de logs

- **lint_report.txt** - Rapports ESLint complets
- **publish.log** - Logs de publication
- **PARSING_ERRORS_*.txt** - Erreurs de parsing détaillées
- **DIAGNOSTIC_FIXES_TODO.txt** - TODO list corrections

Ces fichiers sont générés automatiquement et servent au débogage.
"@
  '.archive/README.md'      = @"
# Archive

Anciens scripts de fix et emergency patches (historique).

## Contenu

Scripts historiques de corrections d'urgence :
- **EMERGENCY_FIX_*.js** - Fixes d'urgence
- **CRITICAL_FIX_*.js** - Corrections critiques
- **ULTRA_FIX_*.js** - Mega fixes
- **MASSIVE_FIX_*.js** - Fixes massifs
- **INTELLIGENT_*.js** - Enrichissements intelligents

Ces scripts sont conservés pour référence historique mais ne sont plus utilisés.
Les solutions ont été intégrées dans le code principal.
"@
}

foreach ($readme in $readmes.Keys) {
  if (-not $DryRun) {
    $readmes[$readme] | Out-File -FilePath $readme -Encoding UTF8
  }
  Write-Host "  ✅ Créé: $readme" -ForegroundColor Green
}

Write-Host "`n═" * 70 -ForegroundColor Cyan

if ($DryRun) {
  Write-Host "`n⚠️  MODE DRY-RUN - Aucun fichier déplacé" -ForegroundColor Yellow
  Write-Host "Relancez avec -Force pour appliquer les changements`n" -ForegroundColor Yellow
}
else {
  Write-Host "`n✅ RÉORGANISATION TERMINÉE!`n" -ForegroundColor Green
  Write-Host "⏭️  Prochaines étapes:" -ForegroundColor Cyan
  Write-Host "  1. Vérifier les chemins dans .github/workflows/*.yml" -ForegroundColor White
  Write-Host "  2. Tester: npx homey app validate" -ForegroundColor White
  Write-Host "  3. Commit les changements`n" -ForegroundColor White
}
