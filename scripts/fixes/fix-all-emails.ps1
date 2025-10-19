Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "=== Correction de toutes les adresses email dans les fichiers ===" -ForegroundColor Cyan

$oldEmail = "senetmarne@gmail.com"
$newEmail = "dylan.rajasekaram@gmail.com"

# Liste des fichiers a corriger
$files = @(
    "reports\FINAL_DEPLOYMENT_REPORT_v2.15.98_1760536890592.md",
    "reports\FINAL_DEPLOYMENT_REPORT_v2.15.98.md",
    ".dev\PUBLICATION_SUCCESS.md",
    ".archive\old-files\FINAL_DEPLOYMENT_REPORT_v2.15.98.md"
)

$count = 0

foreach ($file in $files) {
    $fullPath = Join-Path $PWD $file
    
    if (Test-Path $fullPath) {
        Write-Host "Correction: $file" -ForegroundColor Yellow
        
        # Lire le contenu
        $content = Get-Content $fullPath -Raw -Encoding UTF8
        
        # Remplacer l'ancienne adresse par la nouvelle
        $newContent = $content -replace [regex]::Escape($oldEmail), $newEmail
        
        # Ecrire le nouveau contenu
        Set-Content $fullPath -Value $newContent -Encoding UTF8 -NoNewline
        
        Write-Host "   Corrige: $oldEmail vers $newEmail" -ForegroundColor Green
        $count++
    } else {
        Write-Host "   Fichier non trouve: $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "$count fichier(s) corrige(s)!" -ForegroundColor Green
Write-Host "Tous les fichiers utilisent maintenant: $newEmail" -ForegroundColor Cyan
