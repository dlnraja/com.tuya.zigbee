#!/usr/bin/env pwsh
# Quick publish script for v5.0.3

Write-Host "🚀 Publishing Universal Tuya Zigbee v5.0.3..." -ForegroundColor Cyan

# Navigate to project
Set-Location "C:\Users\HP\Desktop\homey app\tuya_repair"

# Publish (will prompt interactively)
Write-Host ""
Write-Host "📝 When prompted:" -ForegroundColor Yellow
Write-Host "  1. 'Update version?' → n (NO - already 5.0.3)" -ForegroundColor Yellow
Write-Host "  2. 'Publish v5.0.3?' → y (YES)" -ForegroundColor Yellow
Write-Host "  3. 'Submit for certification?' → y (YES)" -ForegroundColor Yellow
Write-Host ""

homey app publish

Write-Host ""
Write-Host "✅ Done! Check Homey Developer Dashboard." -ForegroundColor Green
