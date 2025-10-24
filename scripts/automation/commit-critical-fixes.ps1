Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "=== Critical Bug Fixes v2.15.130 ===" -ForegroundColor Red

# Add files
& git add -A

# Commit
& git commit -m "CRITICAL FIX v2.15.130: Remove missing module import + Fix smoke detector syntax error + Improve IAS Zone enrollment"

# Push
& git push origin master

Write-Host ""
Write-Host "Critical fixes pushed! GitHub Actions will auto-publish." -ForegroundColor Green
