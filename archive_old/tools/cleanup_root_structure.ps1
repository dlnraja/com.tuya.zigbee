# ============================================================================
# CLEANUP ROOT STRUCTURE - Organisation Professionnelle
# ============================================================================

Write-Host "🧹 NETTOYAGE STRUCTURE RACINE - DEBUT" -ForegroundColor Cyan

$rootPath = "c:\Users\HP\Desktop\tuya_repair"
$cleaned = 0

# Créer dossiers de destination si nécessaire
$destinations = @(
    "references/documentation",
    "references/reports", 
    "tools/scripts",
    "project-data/logs"
)

foreach ($dest in $destinations) {
    $destPath = Join-Path $rootPath $dest
    if (-not (Test-Path $destPath)) {
        New-Item -Path $destPath -ItemType Directory -Force | Out-Null
        Write-Host "✅ Dossier créé: $dest" -ForegroundColor Green
    }
}

# Fichiers nécessaires à la racine (à NE PAS déplacer)
$essentialFiles = @(
    ".gitignore",
    ".homeychangelog.json",
    ".homeyignore",
    ".prettierignore",
    ".prettierrc",
    "README.md",
    "app.json",
    "package.json",
    "package-lock.json"
)

# Définir les déplacements
$moves = @{
    # Documentation vers references/documentation
    "ADDON_ENRICHMENT_QUICKSTART.md" = "references/documentation/"
    "README_SCRIPTS.md" = "references/documentation/"
    "README.txt" = "references/documentation/"
    
    # Rapports vers references/reports
    "FINAL_SUMMARY.md" = "references/reports/"
    "INVESTIGATION_REPORT.md" = "references/reports/"
    "PUBLICATION_READY.md" = "references/reports/"
    "STATUS_FINAL_22h10.md" = "references/reports/"
    "VALIDATION_FINALE.md" = "references/reports/"
    "forum_analysis.json" = "references/reports/"
    
    # Scripts vers tools/scripts
    "CLEANUP_PERMANENT.ps1" = "tools/scripts/"
    "TURBO.bat" = "tools/scripts/"
    "TURBO_PUBLISH.bat" = "tools/scripts/"
    "clean_cache.bat" = "tools/scripts/"
    "fix_build.bat" = "tools/scripts/"
    
    # Logs vers project-data/logs
    "validation_log.txt" = "project-data/logs/"
}

# Déplacer les fichiers
foreach ($file in $moves.Keys) {
    $sourcePath = Join-Path $rootPath $file
    $destPath = Join-Path $rootPath $moves[$file]
    
    if (Test-Path $sourcePath) {
        try {
            Move-Item -Path $sourcePath -Destination $destPath -Force
            Write-Host "✅ Déplacé: $file → $($moves[$file])" -ForegroundColor Green
            $cleaned++
        } catch {
            Write-Host "⚠️ Erreur déplacement: $file" -ForegroundColor Yellow
        }
    }
}

# Supprimer fichiers temporaires
$tempFiles = @(".FullName", ".nojekyll")
foreach ($file in $tempFiles) {
    $filePath = Join-Path $rootPath $file
    if (Test-Path $filePath) {
        Remove-Item -Path $filePath -Force
        Write-Host "🗑️ Supprimé: $file" -ForegroundColor Magenta
        $cleaned++
    }
}

# Créer README propre pour la racine
$readmeContent = @'
# Universal Tuya Zigbee Device Hub

Professional Zigbee device integration for Homey - 550+ devices supported locally.

## Project Structure

```
tuya_repair/
├── drivers/          # 164 Zigbee device drivers (organized by function)
├── tools/            # Development and automation scripts
├── references/       # Documentation, reports, and enrichment data
├── project-data/     # Build artifacts, logs, and analysis results
├── ultimate_system/  # Advanced automation and orchestration
├── .github/          # CI/CD workflows and automation
└── settings/         # App configuration UI
```

## Quick Start

```bash
# Install dependencies
npm install

# Validate app
homey app validate --level=publish

# Run app
homey app run
```

## Documentation

- [Scripts Documentation](./references/documentation/README_SCRIPTS.md)
- [Addon Enrichment Guide](./references/documentation/ADDON_ENRICHMENT_QUICKSTART.md)
- [Final Reports](./references/reports/)

## Development

All development scripts are located in `tools/` and `ultimate_system/`.

## Statistics

- **164 drivers** organized by device function
- **550+ Zigbee devices** supported
- **100% local** - no cloud dependencies
- **SDK3 compliant** - latest Homey standards

---

*Organized according to UNBRANDED principles - devices categorized by FUNCTION, not brand.*
'@

$readmePath = Join-Path $rootPath "README.md"
Set-Content -Path $readmePath -Value $readmeContent -Encoding UTF8
Write-Host "README.md mis a jour avec structure propre" -ForegroundColor Cyan

Write-Host "`n🎉 NETTOYAGE TERMINÉ - $cleaned fichiers traités" -ForegroundColor Green
Write-Host "✅ Structure racine professionnelle établie" -ForegroundColor Green
