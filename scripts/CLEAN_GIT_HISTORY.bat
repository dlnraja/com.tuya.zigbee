@echo off
echo Cleaning large files from git history...

REM Remove the large file from all history
git filter-branch -f --index-filter "git rm --cached --ignore-unmatch docs/releases/ULTIMATE_AUDIT_REPORT_v2.15.60.md" --prune-empty --tag-name-filter cat -- --all

REM Clean up
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo Done! Now you can push with --force
