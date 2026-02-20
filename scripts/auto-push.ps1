# Auto-Push: commit + push → triggers GitHub Actions publish
param([string]$Message)
Set-Location $PSScriptRoot\..
if (-not $Message) {
    $v = (Get-Content app.json | ConvertFrom-Json).version
    $Message = "v$v update"
}
git add -A
if (-not (git status --porcelain)) {
    Write-Host "No changes." -ForegroundColor Green; exit 0
}
git commit -m $Message
git push origin HEAD
Write-Host "Pushed! Actions will validate+version+publish." -ForegroundColor Green
