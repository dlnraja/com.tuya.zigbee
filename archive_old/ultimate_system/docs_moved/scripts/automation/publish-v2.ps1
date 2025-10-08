# PUBLICATION AUTOMATISÉE v2.0 - ITÉRATION 5/10
# Script stdio automation complet pour homey app publish

param(
    [string]$Changelog = "v2.0.3 - Itération 5/10: Forum Homey Community intégré, structure nettoyée, références locales mises à jour"
)

Write-Host "🚀 PUBLICATION AUTOMATISÉE v2.0 - ITÉRATION 5/10" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# 1. Mise à jour version .homeycompose
Write-Host "📝 Updating .homeycompose version..." -ForegroundColor Yellow
$composePath = ".homeycompose\app.json"
$composeData = Get-Content $composePath | ConvertFrom-Json
$versionParts = $composeData.version.Split('.')
$versionParts[2] = [int]$versionParts[2] + 1
$composeData.version = $versionParts -join '.'
$composeData | ConvertTo-Json -Depth 10 | Set-Content $composePath
Write-Host "✅ Version updated to $($composeData.version)" -ForegroundColor Green

# 2. Nettoyage build
Write-Host "🧹 Cleaning build directories..." -ForegroundColor Yellow
Remove-Item ".homeybuild" -Force -Recurse -ErrorAction SilentlyContinue

# 3. Publication avec expect-like automation
Write-Host "📦 Starting homey app publish..." -ForegroundColor Yellow

# Créer script expect PowerShell
$expectScript = @"
`$process = Start-Process -FilePath "homey" -ArgumentList "app", "publish" -PassThru -Wait -NoNewWindow
"@

Invoke-Expression $expectScript

Write-Host "🎉 Publication completed!" -ForegroundColor Green
Write-Host "📊 Version: $($composeData.version)" -ForegroundColor Cyan
Write-Host "📝 Changelog: $Changelog" -ForegroundColor Cyan
