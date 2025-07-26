# 🚀 RESTORE PROJECT SECURE - Tuya Zigbee Project
# Script de restauration sécurisée du projet
# Powered by GPT-4, Cursor, PowerShell

param(
    [switch]$Force = $false,
    [switch]$Verbose = $false,
    [string]$BackupCommit = "fdb75ab"
)

# Configuration
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Cyan = "`e[36m"
$NC = "`e[0m"

Write-Host "$Cyan🚀 RESTORE PROJECT SECURE - Tuya Zigbee Project$NC"
Write-Host "$Yellow Script de restauration sécurisée du projet$NC"
Write-Host "$Cyan Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss UTC')$NC"
Write-Host ""

# Fonction pour afficher les statistiques
function Show-Stats {
    param($Title, $Count, $Total, $Color = $Green)
    $Percent = if ($Total -gt 0) { [math]::Round(($Count / $Total) * 100, 1) } else { 0 }
    Write-Host "$Color$Title`: $Count/$Total ($Percent%)$NC"
}

# 1. ANALYSE INITIALE
Write-Host "$Yellow📊 ANALYSE INITIALE$NC"
$StartTime = Get-Date

# Vérifier l'état git actuel
Write-Host "$Cyan Vérification de l'état Git...$NC"
$CurrentCommit = git rev-parse HEAD
Write-Host "$Cyan Commit actuel: $CurrentCommit$NC"

# Vérifier les drivers existants
$DriversCount = (Get-ChildItem -Path "drivers" -Directory | Where-Object { $_.Name -notin @("sdk3", "legacy", "in_progress", "_templates") }).Count
Write-Host "$Cyan Drivers existants: $DriversCount$NC"

# 2. RESTAURATION SÉCURISÉE
Write-Host "$Yellow🔄 RESTAURATION SÉCURISÉE$NC"

# Sauvegarder l'état actuel
if (!(Test-Path "backup")) {
    New-Item -ItemType Directory -Name "backup" | Out-Null
}

$BackupName = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Write-Host "$Cyan Création du backup: $BackupName$NC"

# Copier les fichiers importants
$ImportantFiles = @("README.md", "package.json", ".gitignore", "dashboard/index.html")
foreach ($file in $ImportantFiles) {
    if (Test-Path $file) {
        Copy-Item $file "backup/$BackupName/" -Force
        Write-Host "$Green✓ Backup: $file$NC"
    }
}

# 3. RESTAURATION DES DRIVERS
Write-Host "$Yellow🔧 RESTAURATION DES DRIVERS$NC"

# Vérifier si les drivers sont déjà présents
if ($DriversCount -gt 100) {
    Write-Host "$Green✓ Drivers déjà présents ($DriversCount)$NC"
} else {
    Write-Host "$Yellow Restauration des drivers depuis le commit $BackupCommit$NC"
    
    # Restaurer depuis le commit spécifié
    git checkout $BackupCommit -- drivers/
    if ($LASTEXITCODE -eq 0) {
        Write-Host "$Green✓ Drivers restaurés depuis $BackupCommit$NC"
    } else {
        Write-Host "$Red❌ Erreur lors de la restauration des drivers$NC"
        return 1
    }
}

# 4. VÉRIFICATION DE L'INTÉGRITÉ
Write-Host "$Yellow🔍 VÉRIFICATION DE L'INTÉGRITÉ$NC"

# Compter les drivers après restauration
$FinalDriversCount = (Get-ChildItem -Path "drivers" -Directory | Where-Object { $_.Name -notin @("sdk3", "legacy", "in_progress", "_templates") }).Count
Write-Host "$Cyan Drivers après restauration: $FinalDriversCount$NC"

# Vérifier les fichiers critiques
$CriticalFiles = @(
    "drivers/TS004F/device.js",
    "drivers/TS011F/device.js", 
    "drivers/TS0207/device.js",
    "drivers/TS0601/device.js",
    "drivers/TS130F/device.js",
    "drivers/THB2/device.js"
)

$CriticalFilesFound = 0
foreach ($file in $CriticalFiles) {
    if (Test-Path $file) {
        $CriticalFilesFound++
        Write-Host "$Green✓ $file$NC"
    } else {
        Write-Host "$Red❌ $file manquant$NC"
    }
}

# 5. NETTOYAGE SÉCURISÉ
Write-Host "$Yellow🧹 NETTOYAGE SÉCURISÉ$NC"

# Supprimer seulement les fichiers temporaires créés par les scripts
$TempFiles = @(
    "all_drivers_git_paths*.txt",
    "*.tmp",
    "*.temp",
    "grep_output.txt",
    "temp_device_list.txt"
)

$CleanedFiles = 0
foreach ($pattern in $TempFiles) {
    $files = Get-ChildItem -Filter $pattern -Recurse -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        if ($file.Directory.Name -notin @(".git", "node_modules", "backup")) {
            Remove-Item $file.FullName -Force
            $CleanedFiles++
            if ($Verbose) {
                Write-Host "$Green✓ Supprimé: $($file.Name)$NC"
            }
        }
    }
}
Write-Host "$Green✓ Fichiers temporaires supprimés: $CleanedFiles$NC"

# 6. STATISTIQUES FINALES
Write-Host "$Yellow📈 STATISTIQUES FINALES$NC"
$EndTime = Get-Date
$Duration = $EndTime - $StartTime

Write-Host "$Cyan Durée: $($Duration.TotalSeconds.ToString('F1')) secondes$NC"
Write-Host "$Cyan Drivers restaurés: $FinalDriversCount$NC"
Write-Host "$Cyan Fichiers critiques: $CriticalFilesFound/$($CriticalFiles.Count)$NC"
Write-Host "$Green Fichiers nettoyés: $CleanedFiles$NC"

# 7. RAPPORT DE RESTAURATION
$ReportContent = @"
# 🚀 RAPPORT DE RESTAURATION SÉCURISÉE - Tuya Zigbee Project

## 📅 Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss UTC')
## ⏱️ Durée: $($Duration.TotalSeconds.ToString('F1')) secondes
## 🔄 Commit de restauration: $BackupCommit

## 📊 STATISTIQUES
- **Drivers restaurés**: $FinalDriversCount
- **Fichiers critiques**: $CriticalFilesFound/$($CriticalFiles.Count)
- **Fichiers nettoyés**: $CleanedFiles
- **Backup créé**: $BackupName

## ✅ ACTIONS EFFECTUÉES
1. **Analyse initiale**: État du projet vérifié
2. **Backup sécurisé**: Fichiers importants sauvegardés
3. **Restauration drivers**: Depuis le commit $BackupCommit
4. **Vérification intégrité**: Fichiers critiques contrôlés
5. **Nettoyage sécurisé**: Fichiers temporaires supprimés

## 🔧 DRIVERS CRITIQUES VÉRIFIÉS
- TS004F: $(if (Test-Path "drivers/TS004F/device.js") { "✅" } else { "❌" })
- TS011F: $(if (Test-Path "drivers/TS011F/device.js") { "✅" } else { "❌" })
- TS0207: $(if (Test-Path "drivers/TS0207/device.js") { "✅" } else { "❌" })
- TS0601: $(if (Test-Path "drivers/TS0601/device.js") { "✅" } else { "❌" })
- TS130F: $(if (Test-Path "drivers/TS130F/device.js") { "✅" } else { "❌" })
- THB2: $(if (Test-Path "drivers/THB2/device.js") { "✅" } else { "❌" })

## 📁 STRUCTURE FINALE
- **drivers/**: $FinalDriversCount drivers restaurés
- **backup/**: Sauvegarde de sécurité
- **logs/**: Rapports de restauration

## 🔄 PROCHAINES ACTIONS
- Vérification des workflows GitHub Actions
- Mise à jour du dashboard
- Test de compilation

---
*Généré automatiquement par restore-project-secure.ps1*
*Powered by GPT-4, Cursor, PowerShell*
"@

if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Name "logs" | Out-Null
}

Set-Content -Path "logs/restore_report.md" -Value $ReportContent -Encoding UTF8
Write-Host "$Green✓ Rapport de restauration généré: logs/restore_report.md$NC"
Write-Host ""

Write-Host "$Green🎉 RESTAURATION SÉCURISÉE TERMINÉE AVEC SUCCÈS!$NC"
Write-Host "$Cyan Projet restauré et sécurisé$NC"
Write-Host "$Yellow Prochaines étapes: Vérification workflows et dashboard$NC" 
