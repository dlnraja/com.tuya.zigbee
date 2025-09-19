# CYCLE 6/10: SETUP AUTOMATION PUBLICATION BUFFER-SAFE
Write-Host "⚙️ CYCLE 6/10: BUFFER-SAFE PUBLISH" -ForegroundColor Green

# Nettoyage .homeycompose (règle critique)
Write-Host "🧹 Nettoyage .homeybuild..." -ForegroundColor Yellow
Remove-Item ".homeybuild" -Recurse -Force -ErrorAction SilentlyContinue

# Mise à jour version vers 1.0.32 (requirement Homey)
Write-Host "📝 Mise à jour version..." -ForegroundColor Yellow
$composeFile = ".homeycompose\app.json"
if (Test-Path $composeFile) {
    $data = Get-Content $composeFile | ConvertFrom-Json
    $data.version = "1.0.32"
    $data | ConvertTo-Json -Depth 10 | Set-Content $composeFile -Encoding UTF8
}

# Build app
Write-Host "🔨 Build app..." -ForegroundColor Yellow
homey app build

# Publication buffer-safe (résolution maxBuffer)
Write-Host "🚀 Publication buffer-safe..." -ForegroundColor Green
cmd /c "echo Y | homey app publish > project-data\publish-safe-log.txt 2>&1"

Write-Host "✅ CYCLE 6/10 TERMINÉ" -ForegroundColor Green
