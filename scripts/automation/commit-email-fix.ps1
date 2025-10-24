Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "=== Commit des corrections email ===" -ForegroundColor Cyan

# Ajouter les fichiers modifies
& git add -A

# Commit avec le bon email
& git commit -m "Fix: Corriger adresse email partout ([redacted-email])"

# Push vers GitHub
& git push origin master

Write-Host ""
Write-Host "Commit et push termines avec [redacted-email]" -ForegroundColor Green
