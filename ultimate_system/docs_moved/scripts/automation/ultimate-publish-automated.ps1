# 🎯 ULTIMATE HOMEY PUBLISH AUTOMATION v1.0.36+
# Gestion automatique des prompts interactifs avec retry

param(
    [string]$MaxRetries = "10",
    [string]$RetryDelay = "30"
)

Write-Host "🚀 DÉBUT PUBLICATION AUTOMATISÉE Ultimate Zigbee Hub v1.0.36+" -ForegroundColor Green

# Variables
$LogFile = "project-data\ultimate-publish-$(Get-Date -Format 'yyyy-MM-dd-HH-mm-ss').log"
$ErrorCount = 0
$SuccessFlag = $false

for ($i = 1; $i -le [int]$MaxRetries; $i++) {
    Write-Host "🔄 TENTATIVE $i/$MaxRetries" -ForegroundColor Yellow
    
    # Étape 1: Nettoyage et commit
    try {
        Write-Host "📦 Git add et commit..." -ForegroundColor Cyan
        git add -A
        $commitMsg = "🎯 AUTO-PUBLISH v1.0.3$((Get-Random -Min 6 -Max 9)) - Tentative $i"
        git commit -m $commitMsg 2>&1 | Out-Null
        
        Write-Host "📤 Git push..." -ForegroundColor Cyan  
        git push origin master 2>&1 | Out-Null
    }
    catch {
        Write-Host "⚠️ Git operations skipped" -ForegroundColor Yellow
    }
    
    # Étape 2: Publication avec automation des réponses
    try {
        Write-Host "🎯 Homey App Publish avec automation..." -ForegroundColor Cyan
        
        # Créer processus avec input automation
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "homey"
        $psi.Arguments = "app publish"
        $psi.UseShellExecute = $false
        $psi.RedirectStandardInput = $true
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.WorkingDirectory = $PWD
        
        $process = [System.Diagnostics.Process]::Start($psi)
        
        # Automation des réponses après délai
        Start-Sleep -Seconds 2
        $process.StandardInput.WriteLine("y")  # Continue with uncommitted changes
        Start-Sleep -Seconds 1
        $process.StandardInput.WriteLine("y")  # Update version number
        Start-Sleep -Seconds 1
        $process.StandardInput.WriteLine("")   # Patch version (default)
        
        # Attendre completion avec timeout
        if ($process.WaitForExit(300000)) { # 5 minutes timeout
            $output = $process.StandardOutput.ReadToEnd()
            $errors = $process.StandardError.ReadToEnd()
            
            if ($process.ExitCode -eq 0 -and $output -match "Successfully published") {
                Write-Host "✅ PUBLICATION RÉUSSIE !" -ForegroundColor Green
                $SuccessFlag = $true
                break
            }
            else {
                Write-Host "❌ Erreur publication: $errors" -ForegroundColor Red
                $ErrorCount++
            }
        }
        else {
            Write-Host "⏰ Timeout publication" -ForegroundColor Red
            $process.Kill()
            $ErrorCount++
        }
    }
    catch {
        Write-Host "❌ Exception: $($_.Exception.Message)" -ForegroundColor Red
        $ErrorCount++
    }
    
    if (-not $SuccessFlag -and $i -lt [int]$MaxRetries) {
        Write-Host "⏳ Attente $RetryDelay secondes avant retry..." -ForegroundColor Yellow
        Start-Sleep -Seconds [int]$RetryDelay
    }
}

# Résultat final
if ($SuccessFlag) {
    Write-Host "🎉 SUCCÈS TOTAL ! Publication Ultimate Zigbee Hub terminée" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "💥 ÉCHEC après $MaxRetries tentatives. Erreurs: $ErrorCount" -ForegroundColor Red
    exit 1
}
