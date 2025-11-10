# SIMPLE PUBLISH TRIGGER - Uses GitHub CLI
# Install gh: winget install GitHub.cli

Write-Host "`n🚀 HOMEY APP PUBLISH - SIMPLE METHOD`n" -ForegroundColor Cyan

# Check if gh CLI is available
$ghAvailable = Get-Command gh -ErrorAction SilentlyContinue

if ($ghAvailable) {
    Write-Host "✅ GitHub CLI detected`n" -ForegroundColor Green
    
    try {
        Write-Host "🔄 Triggering publish workflow via gh CLI...`n" -ForegroundColor Yellow
        
        gh workflow run publish.yml --ref master
        
        Write-Host "`n✅ Workflow triggered successfully!`n" -ForegroundColor Green
        Write-Host "📊 View progress: gh run list --workflow=publish.yml`n" -ForegroundColor Cyan
        Write-Host "🌐 Or visit: https://github.com/dlnraja/com.tuya.zigbee/actions`n" -ForegroundColor White
        
    } catch {
        Write-Host "❌ gh CLI trigger failed: $($_.Exception.Message)`n" -ForegroundColor Red
        Write-Host "💡 Try: gh auth login`n" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "⚠️  GitHub CLI not found`n" -ForegroundColor Yellow
    Write-Host "📥 INSTALL OPTIONS:`n" -ForegroundColor Cyan
    Write-Host "   Option 1 (Recommended): winget install GitHub.cli" -ForegroundColor White
    Write-Host "   Option 2: choco install gh" -ForegroundColor White
    Write-Host "   Option 3: https://cli.github.com/`n" -ForegroundColor White
    
    Write-Host "🔧 MANUAL METHOD:`n" -ForegroundColor Cyan
    Write-Host "   1. Go to: https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor White
    Write-Host "   2. Click Homey App Publish" -ForegroundColor White
    Write-Host "   3. Click Run workflow button" -ForegroundColor White
    Write-Host "   4. Select branch: master" -ForegroundColor White
    Write-Host "   5. Click green Run workflow button`n" -ForegroundColor White
}

Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
