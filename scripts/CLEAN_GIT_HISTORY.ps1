Write-Host "Cleaning large files from git history..." -ForegroundColor Yellow

# Remove the large file from all history
$env:FILTER_BRANCH_SQUELCH_WARNING = "1"
git filter-branch -f --index-filter `
  "git rm --cached --ignore-unmatch docs/releases/ULTIMATE_AUDIT_REPORT_v2.15.60.md" `
  --prune-empty --tag-name-filter cat -- --all

# Clean up refs
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin

# Expire reflog and garbage collect
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Write-Host "`nDone! Git history cleaned." -ForegroundColor Green
Write-Host "You can now push with: git push origin master --force" -ForegroundColor Cyan
