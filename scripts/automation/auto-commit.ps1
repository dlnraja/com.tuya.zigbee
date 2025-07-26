Write-Host 'Auto-Commit Script' -ForegroundColor Green
git add -A
git commit -m 'Auto-Commit: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
git push origin master


