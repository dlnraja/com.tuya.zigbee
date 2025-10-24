# Script to promote Build #14 (v2.0.5 - current) to Test

Write-Host "🚀 PROMOTION - Build #14 vers Test" -ForegroundColor Cyan
Write-Host ""

# Get token from parameter or environment
param(
    [string]$Token = $env:HOMEY_PAT
)

if (-not $Token) {
    Write-Host "❌ Error: Token not provided" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host '  $env:HOMEY_PAT = "your_token"' -ForegroundColor Yellow
    Write-Host "  .\scripts\promote_build_14.ps1" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OR:" -ForegroundColor Yellow
    Write-Host "  .\scripts\promote_build_14.ps1 -Token 'your_token'" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Promoting Build #14 to Test..." -ForegroundColor Cyan
Write-Host ""

$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$body = @{
    target = "test"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod `
        -Uri "https://api.developer.homey.app/app/com.dlnraja.tuya.zigbee/build/14/promote" `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -ContentType "application/json"
    
    Write-Host "✅ Build #14 promoted to Test successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Gray
    Write-Host ($response | ConvertTo-Json -Depth 3) -ForegroundColor Gray
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorMessage = $_.Exception.Message
    
    Write-Host "⚠️  Error promoting Build #14" -ForegroundColor Yellow
    Write-Host "   Status Code: $statusCode" -ForegroundColor Red
    Write-Host "   Message: $errorMessage" -ForegroundColor Red
    Write-Host ""
    
    if ($statusCode -eq 405) {
        Write-Host "💡 Build #14 may already be promoted or not exist" -ForegroundColor Yellow
        Write-Host "   Check dashboard manually" -ForegroundColor Yellow
    }
    elseif ($statusCode -eq 401) {
        Write-Host "💡 Token may be invalid or expired" -ForegroundColor Yellow
        Write-Host "   Get new token: https://tools.developer.homey.app/me" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🔗 Links:" -ForegroundColor Cyan
Write-Host "   Build #14: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/build/14" -ForegroundColor White
Write-Host "   Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee" -ForegroundColor White
Write-Host "   Test URL: https://homey.app/a/com.dlnraja.tuya.zigbee/test/" -ForegroundColor White
Write-Host ""
