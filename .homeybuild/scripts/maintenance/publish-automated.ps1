#!/usr/bin/env pwsh
# Automated publish script with input automation

$ErrorActionPreference = "Stop"

Write-Host "🚀 Publishing Universal Tuya Zigbee v5.0.3..." -ForegroundColor Cyan
Write-Host ""

# Navigate to project
Set-Location "C:\Users\HP\Desktop\homey app\tuya_repair"

# Publish with automated responses
Write-Host "📝 Automating publish prompts..." -ForegroundColor Yellow

# Create input file with responses
$responses = @"
n
n
y
"@

$responses | homey app publish

Write-Host ""
Write-Host "✅ Publication completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Create Git tag: git tag -a v5.0.3 -m 'v5.0.3'" -ForegroundColor White
Write-Host "  2. Push tag: git push origin v5.0.3" -ForegroundColor White
Write-Host "  3. Verify on: https://tools.developer.homey.app" -ForegroundColor White
