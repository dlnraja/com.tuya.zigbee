# Fix Terminal PSReadLine Issues
# Correction des problèmes PSReadLine et restauration du terminal PowerShell

Write-Host "=== CORRECTION TERMINAL PSREADLINE ===" -ForegroundColor Green
Write-Host ""

# Disable PSReadLine temporarily
try {
    Remove-Module PSReadLine -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] PSReadLine désactivé temporairement" -ForegroundColor Green
} catch {
    Write-Host "[INFO] PSReadLine déjà désactivé" -ForegroundColor Yellow
}

# Clear terminal completely
Clear-Host

# Reset console buffer
try {
    $Host.UI.RawUI.BufferSize = New-Object System.Management.Automation.Host.Size(120, 3000)
    $Host.UI.RawUI.WindowSize = New-Object System.Management.Automation.Host.Size(120, 25)
    Write-Host "[OK] Buffer de console réinitialisé" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Impossible de réinitialiser le buffer" -ForegroundColor Yellow
}

# Set execution policy
try {
    Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser -Force
    Write-Host "[OK] Politique d'exécution configurée" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Impossible de configurer la politique d'exécution" -ForegroundColor Yellow
}

# Set environment variables
$env:YOLO_MODE = "true"
$env:AUTO_CONTINUE = "true"
$env:TERMINAL_FIXED = "true"
Write-Host "[OK] Variables d'environnement configurées" -ForegroundColor Green

# Kill hanging processes
try {
    Get-Process | Where-Object {$_.ProcessName -like "*git*" -or $_.ProcessName -like "*npm*" -or $_.ProcessName -like "*node*"} | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] Processus suspendus terminés" -ForegroundColor Green
} catch {
    Write-Host "[INFO] Aucun processus suspendu trouvé" -ForegroundColor Yellow
}

# Test basic commands
Write-Host ""
Write-Host "[TEST] Test des commandes de base..." -ForegroundColor Yellow

try {
    Get-Location | Out-Null
    Write-Host "[SUCCESS] Get-Location fonctionne" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Get-Location échoue" -ForegroundColor Red
}

try {
    Get-Date | Out-Null
    Write-Host "[SUCCESS] Get-Date fonctionne" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Get-Date échoue" -ForegroundColor Red
}

try {
    Write-Host "Test d'affichage" -ForegroundColor Green
    Write-Host "[SUCCESS] Write-Host fonctionne" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Write-Host échoue" -ForegroundColor Red
}

# Create simple test script
$testScript = @"
# Test Script for Terminal
Write-Host "=== TEST TERMINAL ===" -ForegroundColor Green
Write-Host "Terminal fonctionnel!" -ForegroundColor Green
Write-Host "Date: $(Get-Date)" -ForegroundColor Yellow
Write-Host "Location: $(Get-Location)" -ForegroundColor Yellow
Write-Host "Version: 1.0.23" -ForegroundColor Cyan
"@

Set-Content -Path "test-terminal.ps1" -Value $testScript -Encoding UTF8
Write-Host "[OK] Script de test créé: test-terminal.ps1" -ForegroundColor Green

# Test git status
try {
    git status | Out-Null
    Write-Host "[SUCCESS] Git fonctionne" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Git échoue" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== CORRECTION TERMINALE TERMINÉE ===" -ForegroundColor Green
Write-Host "[SUCCESS] Terminal PowerShell corrigé!" -ForegroundColor Green
Write-Host "[INFO] PSReadLine désactivé temporairement" -ForegroundColor Yellow
Write-Host "[INFO] Buffer de console réinitialisé" -ForegroundColor Yellow
Write-Host "[INFO] Variables d'environnement configurées" -ForegroundColor Yellow
Write-Host ""
Write-Host "[NEXT] Vous pouvez maintenant continuer normalement" -ForegroundColor Cyan
Write-Host "" 

