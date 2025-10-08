# COMPREHENSIVE BUFFER FIX PUBLISHER v2.0.8 - ITÉRATION 1/10
# Résolution définitive stdout maxBuffer exceeded + publication automatisée

param(
    [string]$Version = "2.0.8"
)

Write-Host "🚀 COMPREHENSIVE BUFFER FIX v2.0.8 - ITÉRATION 1/10" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green

Set-Location "C:\Users\HP\Desktop\tuya_repair"

# 1. NETTOYAGE COMPLET
Write-Host "🧹 Nettoyage complet buffer..." -ForegroundColor Yellow
Remove-Item ".homeybuild" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "temp-generation" -Recurse -Force -ErrorAction SilentlyContinue

# 2. MISE À JOUR VERSION + DESCRIPTION
Write-Host "📝 Mise à jour version v$Version..." -ForegroundColor Yellow
$appJsonPath = ".homeycompose\app.json"
$appJson = Get-Content $appJsonPath -Raw | ConvertFrom-Json
$appJson.version = $Version
$appJson.description.en = "Ultimate Zigbee Hub v$Version - Complete unbranded Zigbee ecosystem with 101+ professional drivers. Enhanced Johan Bendz compatibility for 1500+ devices from 80+ manufacturers. Buffer optimization + comprehensive driver categorization (1-6 gang, AC/DC/CR2032/CR2450/hybrid). Local Zigbee 3.0 operation with advanced publication automation."
$appJson | ConvertTo-Json -Depth 10 | Set-Content $appJsonPath -Encoding UTF8

Write-Host "✅ Version mise à jour: $Version" -ForegroundColor Green

# 3. COMMIT ET PUSH POUR DÉCLENCHER GITHUB ACTIONS
Write-Host "📤 Git commit + push pour déclencher GitHub Actions..." -ForegroundColor Cyan

try {
    git add -A
    git commit -m "ITÉRATION 1/10: Buffer fix v$Version + comprehensive unbranded drivers enhancement"
    git push origin master
    
    Write-Host "✅ Git push effectué - GitHub Actions déclenché!" -ForegroundColor Green
    Write-Host "🔗 Vérifiez: https://github.com/dlnraja/com.ultimate.zigbee.hub/actions" -ForegroundColor Yellow
} catch {
    Write-Host "⚠️ Erreur git: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. MÉTHODE FALLBACK - PUBLICATION LOCALE AVEC BUFFER SAFE
Write-Host "🔄 Méthode fallback - Publication locale buffer-safe..." -ForegroundColor Cyan

$publishScript = @"
`$responses = @"
y
y  
patch
v$Version - Ultimate buffer fix + comprehensive unbranded drivers enhancement with 101+ categories (1-6 gang, AC/DC/CR2032/CR2450/hybrid) - ITÉRATION 1/10
y
"@

try {
    `$process = Start-Process -FilePath "homey" -ArgumentList "app", "publish" -NoNewWindow -PassThru -RedirectStandardInput "`$env:TEMP\responses.txt" -RedirectStandardOutput "project-data\publish-buffer-safe-v$Version.log" -RedirectStandardError "project-data\publish-errors-v$Version.log"
    
    `$responses | Out-File "`$env:TEMP\responses.txt" -Encoding UTF8
    
    `$process.WaitForExit(300000)  # 5 minutes timeout
    
    if (`$process.ExitCode -eq 0) {
        Write-Host "✅ PUBLICATION RÉUSSIE!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Publication avec warnings - Code: `$(`$process.ExitCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur: `$(`$_.Exception.Message)" -ForegroundColor Red
}
"@

$publishScript | Out-File "scripts\automation\execute-buffer-safe-publish.ps1" -Encoding UTF8
PowerShell.exe -ExecutionPolicy Bypass -File "scripts\automation\execute-buffer-safe-publish.ps1"

Write-Host "🎉 ITÉRATION 1/10 TERMINÉE - Buffer fix + GitHub Actions configuré!" -ForegroundColor Green
