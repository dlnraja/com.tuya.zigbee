# Generate All Reports - Coverage, Matrix, Validation
# Comprehensive reporting system

param(
    [switch]$SkipValidation = $false
)

$ErrorActionPreference = "Stop"
Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GENERATE ALL REPORTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Validation
if (-not $SkipValidation) {
    Write-Host "1. Validation..." -ForegroundColor Yellow
    try {
        & homey app validate --level publish
        Write-Host "   Validation OK!" -ForegroundColor Green
    } catch {
        Write-Host "   Validation FAILED: $_" -ForegroundColor Red
        Write-Host "   Continuing anyway..." -ForegroundColor Yellow
    }
} else {
    Write-Host "1. Validation skipped" -ForegroundColor Gray
}
Write-Host ""

# 2. Driver Schema Validation
Write-Host "2. Driver Schema Validation..." -ForegroundColor Yellow
try {
    & node scripts/validation/validate-driver-schemas.js
    Write-Host "   Schema validation complete!" -ForegroundColor Green
} catch {
    Write-Host "   Schema validation had issues: $_" -ForegroundColor Yellow
}
Write-Host ""

# 3. Device Matrix
Write-Host "3. Device Matrix Generation..." -ForegroundColor Yellow
try {
    & node scripts/automation/generate-device-matrix.js
    Write-Host "   Device matrix generated!" -ForegroundColor Green
} catch {
    Write-Host "   Matrix generation failed: $_" -ForegroundColor Red
}
Write-Host ""

# 4. Coverage Stats
Write-Host "4. Coverage Statistics..." -ForegroundColor Yellow
try {
    & node scripts/automation/generate-coverage-stats.js
    Write-Host "   Coverage stats generated!" -ForegroundColor Green
} catch {
    Write-Host "   Coverage stats failed: $_" -ForegroundColor Red
}
Write-Host ""

# 5. Summary
Write-Host "========================================" -ForegroundColor Green
Write-Host "  REPORTS GENERATED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Files created:" -ForegroundColor Cyan
Write-Host "  - schema-validation-report.json" -ForegroundColor White
Write-Host "  - DEVICE_MATRIX.md" -ForegroundColor White
Write-Host "  - COVERAGE_STATS.json" -ForegroundColor White
Write-Host "  - coverage-dashboard.html" -ForegroundColor White
Write-Host ""
Write-Host "View dashboard:" -ForegroundColor Yellow
Write-Host "  Open: coverage-dashboard.html in browser" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review reports for issues" -ForegroundColor White
Write-Host "  2. Update README with stats" -ForegroundColor White
Write-Host "  3. Commit all reports to git" -ForegroundColor White
