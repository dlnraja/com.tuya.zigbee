# Commit version bump 2.15.133
Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "=== Version Bump: 2.15.132 -> 2.15.133 ===" -ForegroundColor Cyan

# Add changes
& git add app.json .homeychangelog.json

# Commit
& git commit -m "Version: Bump to 2.15.133 (2.15.132 already published)"

# Push
& git push origin master

Write-Host ""
Write-Host "Version bumpee et pushee! GitHub Actions va republier." -ForegroundColor Green
