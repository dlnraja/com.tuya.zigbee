# UNIVERSAL PRE-PUBLISH CLEANUP SCRIPT
# CRITICAL: Run before EVERY push/publish to prevent cache issues & security leaks
# Part of CYCLE 2/10 - HOMEY REJECTION EMERGENCY RESPONSE

param(
    [string]$Action = "full",
    [switch]$Verbose = $true
)

Write-Host "🧹 PRE-PUBLISH CLEANUP STARTING - $Action mode..." -ForegroundColor Magenta

# 1. CLEAN .HOMEYCOMPOSE (CACHE PREVENTION)
if (Test-Path ".homeycompose") {
    Remove-Item ".homeycompose" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Cleaned .homeycompose cache directory" -ForegroundColor Green
} else {
    Write-Host "ℹ️ .homeycompose already clean" -ForegroundColor Cyan
}

# 2. CLEAN BUILD DIRECTORIES
$buildDirs = @(".homeybuild", "build", "dist", "*.homeybuild")
foreach ($dir in $buildDirs) {
    if (Test-Path $dir) {
        Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Cleaned build directory: $dir" -ForegroundColor Green
    }
}

# 3. SECURITY CLEANUP - REMOVE POTENTIAL CREDENTIALS
if ($Action -eq "full" -or $Action -eq "security") {
    Write-Host "🔒 SECURITY CLEANUP PHASE..." -ForegroundColor Red
    
    $securityPatterns = @(
        "*.env*", "*credential*", "*secret*", "*password*", "*token*", "*key*",
        "*.auth", ".credentials", "*api_key*", "*access_token*", "bearer*"
    )
    
    foreach ($pattern in $securityPatterns) {
        Get-ChildItem -Path "." -Recurse -Force -Name $pattern -ErrorAction SilentlyContinue | ForEach-Object {
            if (Test-Path $_ -and $_ -notlike "*node_modules*" -and $_ -notlike "*test*") {
                Remove-Item $_ -Force -ErrorAction SilentlyContinue
                Write-Host "🗑️ SECURITY: Removed $pattern file: $_" -ForegroundColor Yellow
            }
        }
    }
    
    # Remove backup directories that may contain sensitive data
    $backupDirs = @("project-archive", "backup*", "temp*", "*cache*", ".backup")
    foreach ($dir in $backupDirs) {
        Get-ChildItem -Path "." -Directory -Name $dir -ErrorAction SilentlyContinue | ForEach-Object {
            Remove-Item $_ -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "🗑️ SECURITY: Removed backup directory: $_" -ForegroundColor Yellow
        }
    }
}

# 4. TEMP FILE CLEANUP
$tempPatterns = @("*.tmp", "*.temp", "*.log", "*~", "*.swp", "*.swo")
foreach ($pattern in $tempPatterns) {
    Get-ChildItem -Path "." -Recurse -Force -Name $pattern -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_ -notlike "*node_modules*") {
            Remove-Item $_ -Force -ErrorAction SilentlyContinue
            Write-Host "🧹 Cleaned temp file: $_" -ForegroundColor Blue
        }
    }
}

# 5. VERIFY CRITICAL FILES EXIST
$criticalFiles = @("app.json", "app.js", "package.json")
$missingFiles = @()

foreach ($file in $criticalFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
        Write-Host "❌ CRITICAL: Missing file $file" -ForegroundColor Red
    } else {
        Write-Host "✅ Critical file verified: $file" -ForegroundColor Green
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "🚨 CRITICAL ERROR: Missing files detected!" -ForegroundColor Red
    Write-Host "Missing: $($missingFiles -join ', ')" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎯 PRE-PUBLISH CLEANUP COMPLETE" -ForegroundColor Green
Write-Host "📝 Safe to proceed with publish/push operations" -ForegroundColor Cyan
