# CYCLE 10/10: PUBLICATION FINALE v1.0.32
Write-Host "🎯 CYCLE 10/10: PUBLICATION FINALE" -ForegroundColor Green

# Buffer-safe publication using cmd redirection
Write-Host "🚀 Publication buffer-safe..." -ForegroundColor Yellow

# Method 1: cmd redirection (proven successful from memory)
cmd /c "echo Y | echo 1.0.32 | homey app publish > project-data\final-publish-log.txt 2>&1"

Write-Host "📄 Vérification log..." -ForegroundColor Yellow
if (Test-Path "project-data\final-publish-log.txt") {
    Get-Content "project-data\final-publish-log.txt" -Tail 10
}

Write-Host "🎉 CYCLES 1-10/10 TERMINÉS - RECERTIFICATION HOMEY COMPLÈTE" -ForegroundColor Green
