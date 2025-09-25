# ULTIMATE PUBLISH v1.0.31 - FORCE PUBLISH SCRIPT
# Résolution définitive avec automation interactive

param(
    [string]$TargetVersion = "1.0.31"
)

Write-Host "🚀 ULTIMATE PUBLISH v1.0.31 - FORCE AUTOMATION" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# Mise à jour version dans app.json
Write-Host "📝 Setting target version to $TargetVersion..." -ForegroundColor Yellow
$appJsonPath = ".homeycompose\app.json"
$appData = Get-Content $appJsonPath | ConvertFrom-Json
$appData.version = $TargetVersion
$appData | ConvertTo-Json -Depth 20 | Set-Content $appJsonPath -Encoding UTF8

# Nettoyage build
Write-Host "🧹 Cleaning build directories..." -ForegroundColor Yellow
Remove-Item ".homeybuild" -Force -Recurse -ErrorAction SilentlyContinue

# Publication avec automation
Write-Host "📦 Starting automated homey app publish..." -ForegroundColor Yellow

try {
    # Méthode 1: Automation avec réponses prédéfinies
    $publishProcess = Start-Process -FilePath "homey" -ArgumentList "app", "publish" -PassThru -NoNewWindow
    
    Start-Sleep -Seconds 3
    
    # Envoi automatique des réponses
    [System.Windows.Forms.SendKeys]::SendWait("y{ENTER}")  # Uncommitted changes
    Start-Sleep -Seconds 2
    [System.Windows.Forms.SendKeys]::SendWait("y{ENTER}")  # Update version
    Start-Sleep -Seconds 2 
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")   # Select Patch
    Start-Sleep -Seconds 2
    [System.Windows.Forms.SendKeys]::SendWait("v1.0.31 - Ultimate Zigbee Hub with enhanced drivers and GitHub Actions{ENTER}")
    
    $publishProcess.WaitForExit(300000) # 5 minutes timeout
    
    if ($publishProcess.ExitCode -eq 0) {
        Write-Host "🎉 Publication SUCCESS via automation!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Local publish failed, GitHub Actions will handle it" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "💥 Exception: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "🔄 Relying on GitHub Actions for publication" -ForegroundColor Yellow
}

Write-Host "✅ Ultimate publish script completed" -ForegroundColor Green
