# Rewrite Git History Author/Email for All Commits
# Usage: pwsh -File scripts/cleanup/rewrite-git-history-author.ps1
# ⚠️ Cette opération réécrit tout l’historique git (force-push obligatoire)
# ⚠️ Sauvegardez votre repo avant !

param(
    [string]$NewName = "dlnraja",
    [string]$NewEmail = "dylan.rajasekaram@gmail.com",
    [string]$Branch = "master"
)

Write-Host "🚨 Sauvegarde du repo en cours..." -ForegroundColor Yellow
$backupDir = "../tuya_repair_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item -Recurse -Force . $backupDir
Write-Host "✅ Backup créé dans $backupDir" -ForegroundColor Green

Write-Host "🔄 Réécriture de l’historique git avec le nouvel auteur/committer..." -ForegroundColor Cyan

# Utilise git filter-branch pour réécrire author et committer
$env:GIT_COMMITTER_NAME = $NewName
$env:GIT_COMMITTER_EMAIL = $NewEmail
$env:GIT_AUTHOR_NAME = $NewName
$env:GIT_AUTHOR_EMAIL = $NewEmail

git filter-branch --env-filter "
if [ \"$GIT_COMMITTER_EMAIL\" != '$NewEmail' ] || [ \"$GIT_COMMITTER_NAME\" != '$NewName' ]; then
    export GIT_COMMITTER_NAME='$NewName';
    export GIT_COMMITTER_EMAIL='$NewEmail';
fi
if [ \"$GIT_AUTHOR_EMAIL\" != '$NewEmail' ] || [ \"$GIT_AUTHOR_NAME\" != '$NewName' ]; then
    export GIT_AUTHOR_NAME='$NewName';
    export GIT_AUTHOR_EMAIL='$NewEmail';
fi
" --tag-name-filter cat -- --branches --tags

Write-Host "✅ Réécriture terminée."
Write-Host "⚠️ Il faut maintenant forcer le push : git push --force --tags origin $Branch" -ForegroundColor Yellow 