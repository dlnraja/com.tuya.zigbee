Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "=== Commit des guides workflow ===" -ForegroundColor Cyan

# Ajouter les fichiers
& git add WORKFLOW_GUIDE.md QUICK_WORKFLOW.md EMAIL_CORRECTION_SUMMARY.md

# Commit
& git commit -m "Docs: Ajouter guides workflow GitHub Actions (auto-publish officiel)"

# Push
& git push origin master

Write-Host ""
Write-Host "Guides workflow commits et pushes!" -ForegroundColor Green
Write-Host "GitHub Actions va publier automatiquement (si changements code)" -ForegroundColor Yellow
