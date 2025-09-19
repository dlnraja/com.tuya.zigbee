# PRE-PUBLISH CLEANUP - HOMEY RECERTIFICATION
Write-Host "CLEANING PROJECT FOR HOMEY PUBLICATION" -ForegroundColor Green

# Clean .homeybuild before every operation
Write-Host "Cleaning build artifacts..." -ForegroundColor Yellow
Remove-Item ".homeybuild" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue

# Update version in .homeycompose
Write-Host "Updating version to 1.0.32..." -ForegroundColor Yellow
$composeFile = ".homeycompose\app.json"
if (Test-Path $composeFile) {
    $data = Get-Content $composeFile | ConvertFrom-Json
    $data.version = "1.0.32"
    $data | ConvertTo-Json -Depth 10 | Set-Content $composeFile -Encoding UTF8
    Write-Host "Version updated to 1.0.32" -ForegroundColor Green
}

# Run homey app build to generate app.json
Write-Host "Building app..." -ForegroundColor Yellow
homey app build

Write-Host "Pre-publish cleanup completed" -ForegroundColor Green
