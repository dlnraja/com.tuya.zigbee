# Script d'optimisation et de réorganisation des logs
# Mode enrichissement additif

Write-Host "OPTIMISATION ET REORGANISATION DES LOGS - Mode enrichissement" -ForegroundColor Green

# Créer le dossier d'archive si besoin
$archiveDir = "docs/reports/analysis/logs_archive"
if (!(Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir -Force
    Write-Host "Dossier d'archive créé : $archiveDir" -ForegroundColor Green
}

# Déplacer les logs importants (>100 Ko) dans l'archive
$logFiles = Get-ChildItem -Recurse -Include *.log,*.txt -File | Where-Object { $_.Length -gt 102400 }
foreach ($log in $logFiles) {
    Move-Item $log.FullName $archiveDir -Force
    Write-Host "Log archivé : $($log.Name)" -ForegroundColor Yellow
}

# Supprimer les logs temporaires, backups, fichiers inutiles
$patterns = @("*.log", "*.tmp", "*.bak", "*.old", "*.temp")
foreach ($pattern in $patterns) {
    Get-ChildItem -Recurse -Include $pattern -File | Remove-Item -Force -ErrorAction SilentlyContinue
}

# Supprimer les dossiers inutiles
$dossiers = @("logs", "backup", "temp", "archives")
foreach ($dossier in $dossiers) {
    if (Test-Path $dossier) {
        Remove-Item -Recurse -Force $dossier -ErrorAction SilentlyContinue
        Write-Host "Dossier supprimé : $dossier" -ForegroundColor Yellow
    }
}

Write-Host "\nOPTIMISATION ET REORGANISATION DES LOGS TERMINEE" -ForegroundColor Green 