# Comprehensive Verification and Fix Script for Tuya Zigbee Project

# Set error action preference
$ErrorActionPreference = "Stop"

# Create log file
$logFile = "verification_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
Start-Transcript -Path $logFile -Append

function Write-Status {
    param($message, $status = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = if ($status -eq "SUCCESS") { "Green" } elseif ($status -eq "ERROR") { "Red" } else { "Yellow" }
    Write-Host "[$timestamp] [$status] $message" -ForegroundColor $color
    Add-Content -Path $logFile -Value "[$timestamp] [$status] $message"
}

# 1. Verify Project Structure
Write-Status "1. Verifying project structure..."
$requiredDirs = @("drivers", "assets", "locales")
foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Write-Status "✅ Directory exists: $dir" "SUCCESS"
    } else {
        Write-Status "❌ Missing directory: $dir" "ERROR"
        New-Item -ItemType Directory -Path $dir | Out-Null
        Write-Status "✅ Created directory: $dir" "SUCCESS"
    }
}

# 2. Check and Fix JSON Files
Write-Status "2. Validating JSON files..."
Get-ChildItem -Recurse -Filter *.json | ForEach-Object {
    try {
        $content = Get-Content $_.FullName -Raw
        $null = $content | ConvertFrom-Json
        Write-Status "✅ Valid JSON: $($_.FullName)" "SUCCESS"
    } catch {
        Write-Status "❌ Invalid JSON: $($_.FullName)" "ERROR"
        try {
            $fixedContent = $content -replace '(?<!\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})', '\\'
            $fixedContent | Set-Content -Path $_.FullName -NoNewline
            Write-Status "✅ Fixed JSON: $($_.FullName)" "SUCCESS"
        } catch {
            Write-Status "❌ Failed to fix JSON: $($_.FullName)" "ERROR"
        }
    }
}

# 3. Verify Driver Configurations
Write-Status "3. Verifying driver configurations..."
Get-ChildItem -Path "drivers" -Directory | ForEach-Object {
    $driver = $_.Name
    $composeFile = Join-Path $_.FullName "driver.compose.json"
    $driverFile = Join-Path $_.FullName "driver.js"
    $iconFile = Join-Path $_.FullName "assets\icon.svg"
    
    # Check driver.compose.json
    if (Test-Path $composeFile) {
        try {
            $compose = Get-Content $composeFile -Raw | ConvertFrom-Json
            Write-Status "✅ Valid driver.compose.json: $driver" "SUCCESS"
            
            # Verify required fields
            $requiredFields = @("name", "class", "icon")
            foreach ($field in $requiredFields) {
                if (-not $compose.PSObject.Properties[$field]) {
                    Write-Status "❌ Missing field '$field' in: $composeFile" "ERROR"
                }
            }
        } catch {
            Write-Status "❌ Invalid driver.compose.json: $driver" "ERROR"
        }
    } else {
        Write-Status "❌ Missing driver.compose.json: $driver" "ERROR"
    }
    
    # Check driver.js
    if (-not (Test-Path $driverFile)) {
        Write-Status "❌ Missing driver.js: $driver" "ERROR"
    }
    
    # Check icon
    if (-not (Test-Path $iconFile)) {
        Write-Status "⚠️  Missing icon: $driver" "WARNING"
    }
}

# 4. Run Linter
Write-Status "4. Running linter..."
try {
    if (Get-Command "eslint" -ErrorAction SilentlyContinue) {
        $lintResult = eslint . --ext .js,.ts --format json 2>&1
        $lintIssues = $lintResult | ConvertFrom-Json -ErrorAction SilentlyContinue
        
        if ($lintIssues) {
            $lintIssues | ForEach-Object {
                $_.messages | ForEach-Object {
                    $level = if ($_.severity -eq 2) { "ERROR" } else { "WARNING" }
                    Write-Status "$($level) $($_.message) in $($_.filePath) (line $($_.line), col $($_.column))" $level
                }
            }
            Write-Status "❌ Lint issues found" "ERROR"
        } else {
            Write-Status "✅ No lint issues found" "SUCCESS"
        }
    } else {
        Write-Status "⚠️  ESLint not found, skipping linting" "WARNING"
    }
} catch {
    Write-Status "❌ Error running linter: $_" "ERROR"
}

# 5. Run Tests
Write-Status "5. Running tests..."
try {
    if (Test-Path "package.json") {
        $testResult = npm test 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Status "✅ All tests passed" "SUCCESS"
        } else {
            Write-Status "❌ Tests failed: $testResult" "ERROR"
        }
    } else {
        Write-Status "⚠️  package.json not found, skipping tests" "WARNING"
    }
} catch {
    Write-Status "❌ Error running tests: $_" "ERROR"
}

# 6. Generate Report
$report = @"
# Tuya Zigbee Project Verification Report
## Generated on $(Get-Date)

## Summary
- Project Structure: $(if ((Get-ChildItem -Directory).Count -gt 0) { '✅' } else { '❌' })
- JSON Validation: $(if (Get-ChildItem -Recurse -Filter *.json | Select-String -Pattern "Invalid JSON" -List) { '❌' } else { '✅' })
- Driver Configurations: $(if (Get-Content $logFile | Select-String -Pattern "Missing driver\.compose\.json" -List) { '❌' } else { '✅' })
- Linting: $(if (Get-Content $logFile | Select-String -Pattern "Lint issues found" -List) { '❌' } else { '✅' })
- Tests: $(if (Get-Content $logFile | Select-String -Pattern "Tests failed" -List) { '❌' } else { '✅' })

## Details
$(Get-Content $logFile -Raw)
"@

$report | Out-File "verification_report.md"

Write-Status "Verification complete. Report saved to verification_report.md" "SUCCESS"
Write-Host "`n=== VERIFICATION COMPLETE ==="
Write-Host "Report saved to: $(Resolve-Path $logFile)"
Write-Host "Summary report: $(Resolve-Path verification_report.md)"

Stop-Transcript
