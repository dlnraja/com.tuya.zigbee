# PUBLICATION BUFFER-SAFE v1.0.32 - Méthode éprouvée depuis mémoire
Write-Host "🚀 PUBLICATION BUFFER-SAFE v1.0.32" -ForegroundColor Green

# ÉTAPE 1: Nettoyage .homeycompose (règle critique depuis mémoire)
Write-Host "🧹 Nettoyage .homeybuild..." -ForegroundColor Yellow
Remove-Item ".homeybuild" -Recurse -Force -ErrorAction SilentlyContinue

# ÉTAPE 2: Vérification version 1.0.32
Write-Host "📝 Vérification version 1.0.32..." -ForegroundColor Yellow
if (Test-Path ".homeycompose\app.json") {
    $content = Get-Content ".homeycompose\app.json" -Raw | ConvertFrom-Json
    $content.version = "1.0.32"
    $content | ConvertTo-Json -Depth 20 | Set-Content ".homeycompose\app.json" -Encoding UTF8
    Write-Host "✅ Version mise à jour: 1.0.32" -ForegroundColor Green
}

# ÉTAPE 3: Publication buffer-safe avec cmd.exe (méthode éprouvée)
Write-Host "🚀 Publication via cmd.exe buffer-safe..." -ForegroundColor Green
cmd /c "echo Y | echo 1.0.32 | homey app publish > project-data\publish-buffer-safe-1032.log 2>&1"

Write-Host "📄 Résultat publication:" -ForegroundColor Yellow
if (Test-Path "project-data\publish-buffer-safe-1032.log") {
    Get-Content "project-data\publish-buffer-safe-1032.log" -Tail 5
}

Write-Host "✅ CYCLE 2/10 TERMINÉ - Publication buffer-safe lancée" -ForegroundColor Green
