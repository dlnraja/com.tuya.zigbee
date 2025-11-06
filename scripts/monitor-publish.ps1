# Monitor Homey App Store Publication
# Usage: .\scripts\monitor-publish.ps1

Write-Host "📊 MONITORING HOMEY APP STORE PUBLICATION" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Get current version
$version = (Get-Content "app.json" | ConvertFrom-Json).version
Write-Host "📌 Current Version: v$version" -ForegroundColor Green
Write-Host ""

# Check GitHub Actions status
Write-Host "🔍 GitHub Actions Status:" -ForegroundColor Yellow
gh run list --limit 5

Write-Host ""
Write-Host "🔗 Important Links:" -ForegroundColor Cyan
Write-Host "   App Store:     https://homey.app/a/com.dlnraja.tuya.zigbee/" -ForegroundColor White
Write-Host "   Test Version:  https://homey.app/a/com.dlnraja.tuya.zigbee/test/" -ForegroundColor White
Write-Host "   Build Status:  https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee" -ForegroundColor White
Write-Host "   GitHub:        https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor White
Write-Host ""

# Check for workflow failures
Write-Host "⚠️ Checking for failed workflows..." -ForegroundColor Yellow
$failures = gh run list --status failure --limit 5 --json name,conclusion,createdAt | ConvertFrom-Json

if ($failures.Count -gt 0) {
    Write-Host "❌ Found $($failures.Count) failed workflow(s):" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host "   - $($failure.name) ($(($failure.createdAt -as [DateTime]).ToString('yyyy-MM-dd HH:mm')))" -ForegroundColor Red
    }
} else {
    Write-Host "✅ No recent failures detected" -ForegroundColor Green
}

Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Wait 15-30 minutes for App Store processing" -ForegroundColor White
Write-Host "   2. Check build status at the link above" -ForegroundColor White
Write-Host "   3. Test the app after it's live" -ForegroundColor White
Write-Host "   4. Monitor diagnostic reports for user feedback" -ForegroundColor White
