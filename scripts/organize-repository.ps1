# Organisation du Repository - Tuya Zigbee Project
Write-Host "Organisation du Repository - Tuya Zigbee Project" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Créer les dossiers d'organisation
$Folders = @(
    "scripts/build",
    "scripts/workflow",
    "scripts/driver",
    "scripts/optimization",
    "scripts/maintenance",
    "scripts/testing",
    "scripts/backup",
    "scripts/cleanup",
    "scripts/automation",
    "scripts/tools"
)

foreach ($Folder in $Folders) {
    if (!(Test-Path $Folder)) {
        New-Item -ItemType Directory -Path $Folder -Force
        Write-Host "Created folder: $Folder" -ForegroundColor Yellow
    }
}

Write-Host "`nOrganisation des scripts..." -ForegroundColor Cyan

# Scripts de build
$BuildScripts = @(
    "build-fixed.ps1",
    "build-full.ps1",
    "universal.tuya.zigbee.device-master\build-fixed.ps1",
    "universal.tuya.zigbee.device-master\build-full.ps1"
)

foreach ($Script in $BuildScripts) {
    if (Test-Path $Script) {
        $Destination = "scripts/build/$(Split-Path $Script -Leaf)"
        Move-Item $Script $Destination -Force
        Write-Host "Moved build script: $Script -> $Destination" -ForegroundColor Green
    }
}

# Scripts de workflow
$WorkflowScripts = @(
    "scripts/analyze-improve-workflows.ps1",
    "scripts/improve-workflows-automatically.ps1",
    "scripts/simple-workflow-improver.ps1",
    "scripts/test-improved-workflows.ps1",
    "scripts/update-workflows.ps1",
    "scripts/simple-workflow-updater.ps1"
)

foreach ($Script in $WorkflowScripts) {
    if (Test-Path $Script) {
        $Destination = "scripts/workflow/$(Split-Path $Script -Leaf)"
        Move-Item $Script $Destination -Force
        Write-Host "Moved workflow script: $Script -> $Destination" -ForegroundColor Green
    }
}

# Scripts de driver
$DriverScripts = @(
    "scripts/analyze-remaining-drivers.ps1",
    "scripts/driver-analyzer.ps1",
    "scripts/migrate-drivers.ps1",
    "scripts/migrate-priority-drivers.ps1",
    "scripts/migrate-sdk3-drivers.ps1"
)

foreach ($Script in $DriverScripts) {
    if (Test-Path $Script) {
        $Destination = "scripts/driver/$(Split-Path $Script -Leaf)"
        Move-Item $Script $Destination -Force
        Write-Host "Moved driver script: $Script -> $Destination" -ForegroundColor Green
    }
}

# Scripts d'optimisation
$OptimizationScripts = @(
    "scripts/optimization-complete.ps1",
    "scripts/optimization-master-plan.ps1",
    "scripts/optimize-project.ps1",
    "scripts/weekly-optimization.ps1",
    "scripts/simple-weekly-optimization.ps1"
)

foreach ($Script in $OptimizationScripts) {
    if (Test-Path $Script) {
        $Destination = "scripts/optimization/$(Split-Path $Script -Leaf)"
        Move-Item $Script $Destination -Force
        Write-Host "Moved optimization script: $Script -> $Destination" -ForegroundColor Green
    }
}

# Scripts de maintenance
$MaintenanceScripts = @(
    "scripts/continuous-monitoring.ps1",
    "scripts/task-tracker.ps1",
    "scripts/intelligent-commit.ps1"
)

foreach ($Script in $MaintenanceScripts) {
    if (Test-Path $Script) {
        $Destination = "scripts/maintenance/$(Split-Path $Script -Leaf)"
        Move-Item $Script $Destination -Force
        Write-Host "Moved maintenance script: $Script -> $Destination" -ForegroundColor Green
    }
}

# Scripts de test
$TestingScripts = @(
    "scripts/test-improved-workflows.ps1"
)

foreach ($Script in $TestingScripts) {
    if (Test-Path $Script) {
        $Destination = "scripts/testing/$(Split-Path $Script -Leaf)"
        Move-Item $Script $Destination -Force
        Write-Host "Moved testing script: $Script -> $Destination" -ForegroundColor Green
    }
}

# Scripts de backup
$BackupScripts = @(
    "MegaRestore_old.ps1"
)

foreach ($Script in $BackupScripts) {
    if (Test-Path $Script) {
        $Destination = "scripts/backup/$(Split-Path $Script -Leaf)"
        Move-Item $Script $Destination -Force
        Write-Host "Moved backup script: $Script -> $Destination" -ForegroundColor Green
    }
}

# Scripts de cleanup
$CleanupScripts = @(
    "cleanup-repo.ps1"
)

foreach ($Script in $CleanupScripts) {
    if (Test-Path $Script) {
        $Destination = "scripts/cleanup/$(Split-Path $Script -Leaf)"
        Move-Item $Script $Destination -Force
        Write-Host "Moved cleanup script: $Script -> $Destination" -ForegroundColor Green
    }
}

# Scripts d'automatisation
$AutomationScripts = @(
    "scripts/auto-commit-messages.ps1",
    "scripts/auto-commit-push-multi.ps1",
    "scripts/quick-start.ps1"
)

foreach ($Script in $AutomationScripts) {
    if (Test-Path $Script) {
        $Destination = "scripts/automation/$(Split-Path $Script -Leaf)"
        Move-Item $Script $Destination -Force
        Write-Host "Moved automation script: $Script -> $Destination" -ForegroundColor Green
    }
}

# Scripts de rapport
$ReportScripts = @(
    "scripts/final-completion-report.ps1",
    "scripts/final-summary.ps1",
    "scripts/generate-final-summary.ps1"
)

foreach ($Script in $ReportScripts) {
    if (Test-Path $Script) {
        $Destination = "scripts/tools/$(Split-Path $Script -Leaf)"
        Move-Item $Script $Destination -Force
        Write-Host "Moved report script: $Script -> $Destination" -ForegroundColor Green
    }
}

# Scripts de projet
$ProjectScripts = @(
    "complete-patch.ps1",
    "recreate-project.ps1",
    "resolve-conflicts.ps1",
    "universal.tuya.zigbee.device-master\complete-patch.ps1",
    "universal.tuya.zigbee.device-master\deploy.ps1",
    "universal.tuya.zigbee.device-master\recreate-project.ps1"
)

foreach ($Script in $ProjectScripts) {
    if (Test-Path $Script) {
        $Destination = "scripts/tools/$(Split-Path $Script -Leaf)"
        Move-Item $Script $Destination -Force
        Write-Host "Moved project script: $Script -> $Destination" -ForegroundColor Green
    }
}

# Organiser les scripts PowerShell
$PowerShellScripts = Get-ChildItem -Path "scripts/powershell" -Filter "*.ps1" -Recurse

foreach ($Script in $PowerShellScripts) {
    $Category = ""
    
    # Catégoriser les scripts PowerShell
    if ($Script.Name -match "build|compile") {
        $Category = "build"
    } elseif ($Script.Name -match "workflow|ci|cd") {
        $Category = "workflow"
    } elseif ($Script.Name -match "driver|device") {
        $Category = "driver"
    } elseif ($Script.Name -match "optimize|enhance") {
        $Category = "optimization"
    } elseif ($Script.Name -match "test|verify|validate") {
        $Category = "testing"
    } elseif ($Script.Name -match "backup|restore|recover") {
        $Category = "backup"
    } elseif ($Script.Name -match "clean|cleanup|remove") {
        $Category = "cleanup"
    } elseif ($Script.Name -match "auto|automation") {
        $Category = "automation"
    } else {
        $Category = "tools"
    }
    
    $Destination = "scripts/$Category/$(Split-Path $Script.Name -Leaf)"
    Move-Item $Script.FullName $Destination -Force
    Write-Host "Moved PowerShell script: $($Script.Name) -> $Destination" -ForegroundColor Green
}

# Supprimer les dossiers vides
$EmptyFolders = @(
    "scripts/powershell",
    "universal.tuya.zigbee.device-master"
)

foreach ($Folder in $EmptyFolders) {
    if (Test-Path $Folder) {
        $Items = Get-ChildItem $Folder -Recurse
        if ($Items.Count -eq 0) {
            Remove-Item $Folder -Force
            Write-Host "Removed empty folder: $Folder" -ForegroundColor Yellow
        }
    }
}

# Créer un fichier README pour chaque dossier
$ReadmeContent = @"
# Scripts $($Folder.Split('\')[-1].ToUpper())

Ce dossier contient les scripts de $($Folder.Split('\')[-1]) pour le projet Tuya Zigbee.

## Scripts disponibles

$(Get-ChildItem $Folder -Filter "*.ps1" | ForEach-Object { "- $($_.Name)" })

## Utilisation

Exécutez les scripts avec PowerShell :

```powershell
powershell -ExecutionPolicy Bypass -File "script-name.ps1"
```

---
*Généré automatiquement par le script d'organisation du repository*
"@

foreach ($Folder in $Folders) {
    if (Test-Path $Folder) {
        $FolderName = $Folder.Split('\')[-1]
        $ReadmePath = "$Folder/README.md"
        $ReadmeContent = $ReadmeContent -replace '\$\($Folder\.Split\(''\\''\)\[-1\]\.ToUpper\(\)\)', $FolderName.ToUpper()
        $ReadmeContent = $ReadmeContent -replace '\$\($Folder\.Split\(''\\''\)\[-1\]\)', $FolderName
        Set-Content -Path $ReadmePath -Value $ReadmeContent -Encoding UTF8
        Write-Host "Created README for: $Folder" -ForegroundColor Cyan
    }
}

Write-Host "`nOrganisation terminée!" -ForegroundColor Green
Write-Host "Repository nettoyé et structuré avec succès." -ForegroundColor Cyan 


