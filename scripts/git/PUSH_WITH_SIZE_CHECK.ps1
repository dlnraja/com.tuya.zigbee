#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Git Push with Automatic Size Checks and Optimizations
    
.DESCRIPTION
    Enhanced git push with:
    - Pre-push huge file detection
    - Automatic .homeycompose sync
    - Large file handling
    - Smart retry on failures
    
.EXAMPLE
    .\PUSH_WITH_SIZE_CHECK.ps1
#>

param(
    [string]$Branch = "master",
    [switch]$Force = $false,
    [switch]$SkipSizeCheck = $false
)

Write-Host "`n🚀 ENHANCED GIT PUSH WITH SIZE CHECK`n" -ForegroundColor Cyan

$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $rootDir

# ============================================================================
# 1. Check for uncommitted changes in .homeycompose/
# ============================================================================

Write-Host "1️⃣  Checking .homeycompose/ sync status...`n" -ForegroundColor Yellow

if (Test-Path ".homeycompose") {
    Write-Host "   ✅ .homeycompose/ exists (gitignored intentionally)" -ForegroundColor Green
    
    # Rebuild app.json from .homeycompose/
    Write-Host "   🔄 Syncing app.json from .homeycompose/..." -ForegroundColor Gray
    
    try {
        node scripts/sync/SYNC_HOMEYCOMPOSE.js
        if ($LASTEXITCODE -ne 0) {
            Write-Host "   ⚠️  Sync had warnings but continuing..." -ForegroundColor Yellow
        } else {
            Write-Host "   ✅ app.json synced successfully" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ⚠️  Sync script not found, skipping..." -ForegroundColor Yellow
    }
} else {
    Write-Host "   ℹ️  .homeycompose/ not found (may not exist yet)" -ForegroundColor Gray
}

Write-Host ""

# ============================================================================
# 2. Check for huge files (unless skipped)
# ============================================================================

if (-not $SkipSizeCheck) {
    Write-Host "2️⃣  Checking for huge files...`n" -ForegroundColor Yellow
    
    try {
        node scripts/git/CHECK_HUGE_FILES.js
        
        if ($LASTEXITCODE -eq 1) {
            Write-Host "`n❌ HUGE FILES DETECTED (> 100MB)" -ForegroundColor Red
            Write-Host "   Files over 100MB will be REJECTED by GitHub" -ForegroundColor Red
            Write-Host ""
            Write-Host "   Options:" -ForegroundColor Yellow
            Write-Host "   1. Add files to .gitignore" -ForegroundColor White
            Write-Host "   2. Remove with: git rm --cached <file>" -ForegroundColor White
            Write-Host "   3. Use Git LFS: git lfs track ""*.zip""" -ForegroundColor White
            Write-Host "   4. Skip check: .\PUSH_WITH_SIZE_CHECK.ps1 -SkipSizeCheck" -ForegroundColor White
            Write-Host ""
            exit 1
        } elseif ($LASTEXITCODE -eq 0 -and $?) {
            Write-Host "   ✅ No huge files detected" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Size check completed with warnings" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ⚠️  Size check script not found, skipping..." -ForegroundColor Yellow
    }
} else {
    Write-Host "2️⃣  Size check SKIPPED (as requested)`n" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 3. Check git status
# ============================================================================

Write-Host "3️⃣  Checking git status...`n" -ForegroundColor Yellow

$status = git status --short
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "   ℹ️  No changes to commit" -ForegroundColor Gray
    Write-Host "   Proceeding with push of existing commits..." -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  Uncommitted changes detected:" -ForegroundColor Yellow
    Write-Host ""
    git status --short
    Write-Host ""
    Write-Host "   Commit these changes first or they won't be pushed" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 4. Attempt push
# ============================================================================

Write-Host "4️⃣  Pushing to origin/$Branch...`n" -ForegroundColor Yellow

$pushArgs = @("push", "origin", $Branch)
if ($Force) {
    Write-Host "   ⚠️  FORCE PUSH enabled" -ForegroundColor Yellow
    $pushArgs += "--force"
}

try {
    git @pushArgs 2>&1 | Tee-Object -Variable pushOutput
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ PUSH SUCCESSFUL!`n" -ForegroundColor Green
        
        # Show what was pushed
        $latestCommit = git log -1 --oneline
        Write-Host "📦 Latest commit: $latestCommit" -ForegroundColor Cyan
        
        exit 0
        
    } else {
        # Check error type
        $errorText = $pushOutput -join "`n"
        
        if ($errorText -match "non-fast-forward") {
            Write-Host "`n⚠️  NON-FAST-FORWARD: Need to pull first`n" -ForegroundColor Yellow
            
            Write-Host "Attempting git pull --rebase..." -ForegroundColor Gray
            git pull --rebase origin $Branch
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Rebase successful, retrying push..." -ForegroundColor Green
                git push origin $Branch
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "`n✅ PUSH SUCCESSFUL (after rebase)!`n" -ForegroundColor Green
                    exit 0
                }
            } else {
                Write-Host "❌ Rebase failed, manual intervention needed" -ForegroundColor Red
                exit 1
            }
            
        } elseif ($errorText -match "large|size|100|MB") {
            Write-Host "`n❌ PUSH REJECTED: File size limit exceeded`n" -ForegroundColor Red
            Write-Host "Run: node scripts/git/CHECK_HUGE_FILES.js" -ForegroundColor Yellow
            exit 1
            
        } elseif ($errorText -match "authentication|permission") {
            Write-Host "`n❌ AUTHENTICATION FAILED`n" -ForegroundColor Red
            Write-Host "Check your Git credentials" -ForegroundColor Yellow
            exit 1
            
        } else {
            Write-Host "`n❌ PUSH FAILED (unknown error)`n" -ForegroundColor Red
            Write-Host $errorText -ForegroundColor Red
            exit 1
        }
    }
    
} catch {
    Write-Host "`n❌ PUSH FAILED: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
}
