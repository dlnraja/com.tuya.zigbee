# Script de push intelligent avec auto-rebase

param(
    [string]$Message = "",
    [switch]$Force,
    [switch]$NoCommit
)

Write-Host "🚀 SMART PUSH - Auto-Rebase & Push" -ForegroundColor Cyan
Write-Host ""

$hasChanges = $false

# Vérifier s'il y a des changements
$status = git status --porcelain
if ($status) {
    $hasChanges = $true
    Write-Host "📝 Changements détectés" -ForegroundColor Yellow
    
    if (-not $NoCommit) {
        # Add all
        git add -A
        
        # Commit
        if ($Message) {
            Write-Host "   Commit: $Message" -ForegroundColor Gray
            git commit -m "$Message" 2>&1 | Out-Null
        }
        else {
            Write-Host "   Commit avec message auto..." -ForegroundColor Gray
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            git commit -m "chore: auto-commit $timestamp" 2>&1 | Out-Null
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Commit échoué" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✅ Commit réussi" -ForegroundColor Green
    }
}

# Push avec auto-rebase
Write-Host ""
Write-Host "📤 Push vers origin/master..." -ForegroundColor Cyan

$maxRetries = 3
$retry = 0
$success = $false

while (-not $success -and $retry -lt $maxRetries) {
    if ($retry -gt 0) {
        Write-Host "   Tentative $($retry + 1)/$maxRetries..." -ForegroundColor Yellow
    }
    
    if ($Force) {
        # Force push
        git push --force origin master 2>&1 | Out-Null
    }
    else {
        # Normal push
        git push origin master 2>&1 | Out-Null
    }
    
    if ($LASTEXITCODE -eq 0) {
        $success = $true
        Write-Host "✅ Push réussi!" -ForegroundColor Green
    }
    else {
        # Rejected, try rebase
        Write-Host "⚠️  Push rejeté, rebase automatique..." -ForegroundColor Yellow
        
        # Fetch
        git fetch origin 2>&1 | Out-Null
        
        # Rebase
        git rebase origin/master 2>&1 | Out-Null
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Rebase échoué, vérification manuelle requise" -ForegroundColor Red
            git rebase --abort 2>&1 | Out-Null
            exit 1
        }
        
        Write-Host "   Rebase OK, re-tentative push..." -ForegroundColor Gray
        $retry++
    }
}

if (-not $success) {
    Write-Host "❌ Push échoué après $maxRetries tentatives" -ForegroundColor Red
    exit 1
}

# Afficher dernier commit
Write-Host ""
Write-Host "📋 Dernier commit:" -ForegroundColor Cyan
$lastCommit = git log -1 --oneline
Write-Host "   $lastCommit" -ForegroundColor Gray

Write-Host ""
Write-Host "🎉 TERMINÉ!" -ForegroundColor Green
Write-Host ""
