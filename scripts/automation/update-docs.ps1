# AUTO UPDATE DOCS - PowerShell Wrapper
# Updates README.md, device-finder.html after version bump
# Run: .\scripts\automation\update-docs.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AUTO UPDATE DOCS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory and root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent (Split-Path -Parent $scriptDir)

# Run Node.js script
Write-Host "Running AUTO_UPDATE_ALL_DOCS.js..." -ForegroundColor Yellow
node "$scriptDir\AUTO_UPDATE_ALL_DOCS.js"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Do you want to commit and push these changes? (y/n)" -ForegroundColor Yellow
    $response = Read-Host

    if ($response -eq 'y' -or $response -eq 'Y') {
        Set-Location $rootDir

        # Get version from app.json
        $appJson = Get-Content "$rootDir\app.json" | ConvertFrom-Json
        $version = $appJson.version

        Write-Host "Committing changes..." -ForegroundColor Cyan
        git add README.md docs/device-finder.html
        git commit -m "📚 Auto-update docs to v$version"

        Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
        git push origin master

        Write-Host ""
        Write-Host "✅ Done! Docs updated and pushed." -ForegroundColor Green
    } else {
        Write-Host "Changes not committed." -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Update failed!" -ForegroundColor Red
    exit 1
}
