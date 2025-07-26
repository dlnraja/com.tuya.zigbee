# 🚀 Script de Correction des Workflows GitHub Actions
# Correction automatique des références "main" vers "master" uniquement

Write-Host "🔧 Début de la correction des workflows GitHub Actions..." -ForegroundColor Green

$workflowsPath = ".github/workflows"
$files = Get-ChildItem -Path $workflowsPath -Filter "*.yml" -Recurse

$fixedCount = 0
$totalCount = $files.Count

foreach ($file in $files) {
    Write-Host "📁 Traitement de $($file.Name)..." -ForegroundColor Yellow
    
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Correction des branches triggers
    $content = $content -replace 'branches: \[ master, main \]', 'branches: [ master ]'
    $content = $content -replace 'branches: \[ main, master \]', 'branches: [ master ]'
    
    # Correction des pull_request triggers
    $content = $content -replace 'pull_request:\s*\n\s*branches: \[ master, main \]', 'pull_request:`n    branches: [ master ]'
    $content = $content -replace 'pull_request:\s*\n\s*branches: \[ main, master \]', 'pull_request:`n    branches: [ master ]'
    
    # Si le contenu a changé, sauvegarder
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Host "✅ $($file.Name) corrigé" -ForegroundColor Green
        $fixedCount++
    } else {
        Write-Host "ℹ️ $($file.Name) déjà correct" -ForegroundColor Blue
    }
}

Write-Host "🎉 Correction terminée!" -ForegroundColor Green
Write-Host "📊 Résumé:" -ForegroundColor Cyan
Write-Host "- Total de fichiers traités: $totalCount" -ForegroundColor White
Write-Host "- Fichiers corrigés: $fixedCount" -ForegroundColor White
Write-Host "- Fichiers déjà corrects: $($totalCount - $fixedCount)" -ForegroundColor White

Write-Host "🚀 Tous les workflows sont maintenant configurés pour master uniquement!" -ForegroundColor Green 


