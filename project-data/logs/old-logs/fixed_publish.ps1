# Homey App Publication Script with Proper Interactive Handling
param([string]$ChangelogText = "🇬🇧 HOMEY ULTIMATE ZIGBEE HUB v1.0.4 - Enhanced descriptions, improved categorization, fixed image paths, and comprehensive device support documentation.")

Write-Host "Starting Homey app publication with changelog automation..." -ForegroundColor Green

# Create temporary input file with responses
$InputResponses = @"
n
$ChangelogText
"@

# Write input to temp file
$TempInputFile = "publish_responses.txt"
$InputResponses | Out-File -FilePath $TempInputFile -Encoding UTF8

try {
    # Use Get-Content to pipe the responses to homey app publish
    Write-Host "Executing: Get-Content '$TempInputFile' | homey app publish" -ForegroundColor Yellow
    
    $PublishProcess = Start-Process -FilePath "powershell" -ArgumentList "-Command", "Get-Content '$TempInputFile' | homey app publish" -NoNewWindow -Wait -PassThru
    
    Write-Host "Publication process completed with exit code: $($PublishProcess.ExitCode)" -ForegroundColor $(if ($PublishProcess.ExitCode -eq 0) { "Green" } else { "Red" })
    
    if ($PublishProcess.ExitCode -eq 0) {
        Write-Host "✓ App published successfully!" -ForegroundColor Green
        Write-Host "Visit https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub to check status" -ForegroundColor Cyan
    } else {
        Write-Host "✗ Publication failed" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Error during publication: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Cleanup temp file
    if (Test-Path $TempInputFile) {
        Remove-Item $TempInputFile -Force
    }
}

exit $PublishProcess.ExitCode
