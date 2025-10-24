# Script to promote all recent builds (24, 25) to Test
# Usage: $env:HOMEY_PAT = "your_token"; .\scripts\promote_all_builds.ps1

Write-Host "🚀 PROMOTION MASSIVE - Builds 24 & 25 vers Test" -ForegroundColor Cyan
Write-Host ""

# Check HOMEY_PAT
$HOMEY_PAT = $env:HOMEY_PAT
if (-not $HOMEY_PAT) {
    Write-Host "❌ Error: HOMEY_PAT environment variable not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host '  $env:HOMEY_PAT = "your_token_here"' -ForegroundColor Yellow
    Write-Host "  .\scripts\promote_all_builds.ps1" -ForegroundColor Yellow
    exit 1
}

$builds = @(24, 25)
$headers = @{
    "Authorization" = "Bearer $HOMEY_PAT"
    "Content-Type" = "application/json"
}
$body = '{"target": "test"}'

foreach ($buildId in $builds) {
    Write-Host "📋 Promoting Build #$buildId..." -ForegroundColor Cyan
    
    try {
        $response = Invoke-WebRequest `
            -Uri "https://api.developer.homey.app/app/com.dlnraja.tuya.zigbee/build/$buildId/promote" `
            -Method Post `
            -Headers $headers `
            -Body $body `
            -UseBasicParsing
        
        $statusCode = $response.StatusCode
        
        if ($statusCode -eq 200 -or $statusCode -eq 201) {
            Write-Host "✅ Build #$buildId promoted successfully!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Build #$buildId - Status: $statusCode" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "⚠️  Build #$buildId - Error: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "   (Build may already be promoted or not exist)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Start-Sleep -Seconds 2
}

Write-Host "🎉 Promotion terminée!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Vérifier sur:" -ForegroundColor Cyan
Write-Host "   Test URL: https://homey.app/a/com.dlnraja.tuya.zigbee/test/" -ForegroundColor White
Write-Host "   Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee" -ForegroundColor White
Write-Host ""
