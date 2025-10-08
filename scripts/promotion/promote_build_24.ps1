# Script to manually promote Build #24 to Test
# This is needed because the workflow failed after build creation

Write-Host "🚀 Manual Promotion: Build #24 → Test" -ForegroundColor Cyan
Write-Host ""

# Check if HOMEY_PAT is provided
$HOMEY_PAT = $env:HOMEY_PAT
if (-not $HOMEY_PAT) {
    Write-Host "❌ Error: HOMEY_PAT environment variable not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host '  $env:HOMEY_PAT = "your_token_here"' -ForegroundColor Yellow
    Write-Host "  .\scripts\promote_build_24.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Promoting Build #24 from Draft to Test..."
Write-Host ""

# API call to promote build
$headers = @{
    "Authorization" = "Bearer $HOMEY_PAT"
    "Content-Type" = "application/json"
}

$body = '{"target": "test"}'

try {
    $response = Invoke-WebRequest `
        -Uri "https://api.developer.homey.app/app/com.dlnraja.tuya.zigbee/build/24/promote" `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -UseBasicParsing
    
    $statusCode = $response.StatusCode
    $content = $response.Content
    
    Write-Host "HTTP Status: $statusCode" -ForegroundColor Green
    Write-Host "Response: $content"
    Write-Host ""
    
    if ($statusCode -eq 200 -or $statusCode -eq 201) {
        Write-Host "✅ Build #24 promoted to Test successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔗 Test URL: https://homey.app/a/com.dlnraja.tuya.zigbee/test/" -ForegroundColor Cyan
        Write-Host "🔗 Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/build/24" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  Unexpected status code: $statusCode" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "⚠️  Promotion may have failed" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual promotion:" -ForegroundColor Yellow
    Write-Host "1. Visit: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/build/24"
    Write-Host "2. Click 'Promote to Test'"
}

Write-Host ""
