# TRIGGER GITHUB ACTIONS PUBLISH WORKFLOW
# Requires: GitHub Personal Access Token with workflow permissions

param(
    [string]$Token = $env:GITHUB_TOKEN
)

Write-Host "🚀 GITHUB ACTIONS PUBLISH TRIGGER" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Configuration
$owner = "dlnraja"
$repo = "com.tuya.zigbee"
$workflow = "publish.yml"
$branch = "master"

if (-not $Token) {
    Write-Host "❌ ERROR: GitHub token not found!" -ForegroundColor Red
    Write-Host "`nPlease provide token via:" -ForegroundColor Yellow
    Write-Host "  1. Environment variable: `$env:GITHUB_TOKEN = 'your_token'" -ForegroundColor Gray
    Write-Host "  2. Script parameter: .\TRIGGER_GITHUB_PUBLISH.ps1 -Token 'your_token'`n" -ForegroundColor Gray
    Write-Host "📖 Get token from: https://github.com/settings/tokens`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Configuration:" -ForegroundColor Green
Write-Host "   Repository: $owner/$repo" -ForegroundColor Gray
Write-Host "   Workflow: $workflow" -ForegroundColor Gray
Write-Host "   Branch: $branch`n" -ForegroundColor Gray

# Trigger workflow dispatch
$url = "https://api.github.com/repos/$owner/$repo/actions/workflows/$workflow/dispatches"

$headers = @{
    "Accept" = "application/vnd.github+json"
    "Authorization" = "Bearer $Token"
    "X-GitHub-Api-Version" = "2022-11-28"
}

$body = @{
    ref = $branch
} | ConvertTo-Json

try {
    Write-Host "🔄 Triggering publish workflow..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body -ContentType "application/json"
    
    Write-Host "✅ Publish workflow triggered successfully!`n" -ForegroundColor Green
    
    Write-Host "📊 MONITOR PROGRESS:" -ForegroundColor Cyan
    Write-Host "   → https://github.com/$owner/$repo/actions`n" -ForegroundColor White
    
    Write-Host "⏱️  Expected timeline:" -ForegroundColor Yellow
    Write-Host "   1. Checkout code (30s)" -ForegroundColor Gray
    Write-Host "   2. Publish to Homey App Store (2-5 min)" -ForegroundColor Gray
    Write-Host "   3. Total: ~3-6 minutes`n" -ForegroundColor Gray
    
    Write-Host "🎯 NEXT STEPS:" -ForegroundColor Green
    Write-Host "   1. Wait for workflow completion (~5 min)" -ForegroundColor White
    Write-Host "   2. Check Homey Developer Dashboard" -ForegroundColor White
    Write-Host "   3. Verify app appears in Homey App Store`n" -ForegroundColor White
    
    Write-Host "🔗 USEFUL LINKS:" -ForegroundColor Cyan
    Write-Host "   GitHub Actions: https://github.com/$owner/$repo/actions" -ForegroundColor White
    Write-Host "   Homey Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee" -ForegroundColor White
    Write-Host "   App Store Page: https://homey.app/app/com.dlnraja.tuya.zigbee`n" -ForegroundColor White
    
    Write-Host "✨ v4.9.275 publication initiated!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ ERROR: Failed to trigger workflow" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "   Message: $($_.Exception.Message)`n" -ForegroundColor Red
    
    Write-Host "💡 TROUBLESHOOTING:" -ForegroundColor Yellow
    Write-Host "   1. Verify token has 'workflow' permission" -ForegroundColor Gray
    Write-Host "   2. Check repository access rights" -ForegroundColor Gray
    Write-Host "   3. Confirm workflow file exists: .github/workflows/$workflow`n" -ForegroundColor Gray
    
    Write-Host "🔧 MANUAL ALTERNATIVE:" -ForegroundColor Cyan
    Write-Host "   1. Go to: https://github.com/$owner/$repo/actions" -ForegroundColor White
    Write-Host "   2. Select 'Homey App Publish' workflow" -ForegroundColor White
    Write-Host "   3. Click 'Run workflow' → Select '$branch' → Run`n" -ForegroundColor White
    
    exit 1
}
