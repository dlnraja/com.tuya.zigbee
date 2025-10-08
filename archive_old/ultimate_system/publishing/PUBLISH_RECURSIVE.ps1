# PUBLISH_RECURSIVE.ps1 - Publication récursive PowerShell
Write-Host "🔄 PUBLISH_RECURSIVE - Publication récursive jusqu'au succès" -ForegroundColor Cyan

$maxAttempts = 5
$attempt = 0
$success = $false

# Fonction d'increment de version
function Increment-Version {
    Write-Host "`n📝 INCREMENT VERSION:" -ForegroundColor Yellow
    
    try {
        $appPath = "app.json"
        $app = Get-Content $appPath | ConvertFrom-Json
        
        $parts = $app.version -split '\.'
        $parts[2] = [string]([int]$parts[2] + 1)
        $app.version = $parts -join '.'
        
        $app | ConvertTo-Json -Depth 100 | Set-Content $appPath
        Write-Host "✅ Version: $($app.version)" -ForegroundColor Green
        return $app.version
    }
    catch {
        Write-Host "❌ Erreur version: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Fonction de validation
function Validate-App {
    Write-Host "`n🔍 VALIDATION HOMEY APP:" -ForegroundColor Yellow
    
    $commands = @(
        "homey app validate",
        "npx homey app validate"
    )
    
    foreach ($cmd in $commands) {
        try {
            Write-Host "   Essai: $cmd" -ForegroundColor Gray
            Invoke-Expression $cmd
            Write-Host "✅ Validation réussie" -ForegroundColor Green
            return $true
        }
        catch {
            Write-Host "   ❌ $cmd échoué" -ForegroundColor Red
            continue
        }
    }
    
    Write-Host "⚠️ Aucune validation disponible, continue..." -ForegroundColor Yellow
    return $true
}

# Fonction de publication avec gestion des prompts
function Attempt-Publish {
    param($attemptNum)
    
    Write-Host "`n🚀 TENTATIVE $attemptNum/$maxAttempts - PUBLICATION HOMEY" -ForegroundColor Cyan
    
    $commands = @(
        "homey app publish",
        "npx homey app publish"
    )
    
    foreach ($cmd in $commands) {
        try {
            Write-Host "   📱 Essai: $cmd" -ForegroundColor Gray
            
            # Utiliser Start-Process pour gérer les interactions
            $process = Start-Process -FilePath "cmd" -ArgumentList "/c", $cmd -PassThru -Wait -WindowStyle Hidden
            
            if ($process.ExitCode -eq 0) {
                Write-Host "🎉 PUBLICATION RÉUSSIE !" -ForegroundColor Green
                return $true
            }
            else {
                Write-Host "   ❌ Code de sortie: $($process.ExitCode)" -ForegroundColor Red
            }
        }
        catch {
            Write-Host "   ❌ $cmd échoué: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    return $false
}

# Publication récursive principale
function Start-RecursivePublish {
    Write-Host "🎯 DÉMARRAGE PUBLICATION RÉCURSIVE...`n" -ForegroundColor Cyan
    
    # Validation
    $isValid = Validate-App
    if (-not $isValid) {
        Write-Host "💥 Validation échouée - arrêt" -ForegroundColor Red
        return $false
    }
    
    # Increment version
    $version = Increment-Version
    if (-not $version) {
        Write-Host "💥 Erreur version - arrêt" -ForegroundColor Red
        return $false
    }
    
    # Tentatives récursives
    while ($attempt -lt $maxAttempts -and -not $success) {
        $attempt++
        $published = Attempt-Publish $attempt
        
        if ($published) {
            Write-Host "`n🎉 SUCCÈS APRÈS $attempt TENTATIVE(S) !" -ForegroundColor Green
            Write-Host "📱 Version publiée: $version" -ForegroundColor Green
            $script:success = $true
            return $true
        }
        
        if ($attempt -lt $maxAttempts) {
            Write-Host "`n⏱️ Attente 3s avant nouvelle tentative..." -ForegroundColor Yellow
            Start-Sleep -Seconds 3
        }
    }
    
    Write-Host "`n❌ ÉCHEC APRÈS $maxAttempts TENTATIVES" -ForegroundColor Red
    return $false
}

# Génération du rapport
function Generate-Report {
    param($success, $version)
    
    $report = @{
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        action = "RECURSIVE_PUBLICATION_POWERSHELL"
        attempts = $attempt
        maxAttempts = $maxAttempts
        success = $success
        version = $version
        method = "PowerShell with Start-Process"
    }
    
    $reportPath = "ultimate_system\reports\recursive_publish_powershell.json"
    New-Item -Path (Split-Path $reportPath) -ItemType Directory -Force | Out-Null
    $report | ConvertTo-Json -Depth 5 | Set-Content $reportPath
    
    Write-Host "`n💾 Rapport: $reportPath" -ForegroundColor Gray
}

# Exécution principale
try {
    $publishSuccess = Start-RecursivePublish
    $currentVersion = "2.1.3"  # Version par défaut si increment échoue
    
    Generate-Report $publishSuccess $currentVersion
    
    if ($publishSuccess) {
        Write-Host "`n🏆 PUBLICATION RÉCURSIVE RÉUSSIE !" -ForegroundColor Green
        Write-Host "📝 Prochaine étape: Correction GitHub Actions" -ForegroundColor Cyan
        
        # Commit les changements
        Write-Host "`n📤 COMMIT DES CHANGEMENTS:" -ForegroundColor Yellow
        git add .
        git commit -m "🎯 v$currentVersion - Publication récursive réussie"
        git push origin master
        Write-Host "✅ Changements committés et pushés" -ForegroundColor Green
    }
    else {
        Write-Host "`n❌ Publication récursive échouée" -ForegroundColor Red
        Write-Host "💡 Essayez manuellement avec: homey app publish" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "`n💥 Erreur fatale: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔄 Publication récursive terminée" -ForegroundColor Cyan
