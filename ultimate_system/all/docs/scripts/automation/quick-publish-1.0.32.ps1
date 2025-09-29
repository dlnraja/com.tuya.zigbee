# QUICK PUBLISH v1.0.32 - MAXBUFFER RESOLUTION
Write-Host "🚀 PUBLICATION v1.0.32" -ForegroundColor Green

# Clean build
if (Test-Path ".homeybuild") { Remove-Item ".homeybuild" -Recurse -Force }

# Build first
homey app build

# Method 1: Local with output redirection
Write-Host "📤 TENTATIVE LOCALE..." -ForegroundColor Yellow
$process = Start-Process -FilePath "homey" -ArgumentList "app", "publish" -NoNewWindow -PassThru -RedirectStandardOutput "project-data\publish-output.log" -RedirectStandardError "project-data\publish-error.log"

# Wait with timeout
if (-not $process.WaitForExit(300000)) {
    Write-Host "⏰ TIMEOUT - GITHUB ACTIONS FALLBACK" -ForegroundColor Red
    $process.Kill()
    
    # Commit and push for GitHub Actions
    git add .
    git commit -m "v1.0.32 - MaxBuffer resolution + exhaustive enrichment"
    git push origin master
    
    Write-Host "✅ PUSHED TO GITHUB ACTIONS" -ForegroundColor Green
}

Write-Host "✅ PUBLICATION PROCESS DONE" -ForegroundColor Green
