# Buffer-Safe Publish Script for Version 1.0.31
# Fixes stdout maxBuffer exceeded issue

Write-Host "🚀 Starting Buffer-Safe Publish Process..." -ForegroundColor Cyan

# Clean .homeycompose before every operation
if (Test-Path ".homeycompose") {
    Remove-Item ".homeycompose" -Recurse -Force
    Write-Host "✅ Cleaned .homeycompose" -ForegroundColor Green
}

# Use Start-Process to avoid buffer issues
$publishProcess = Start-Process -FilePath "homey" -ArgumentList "app", "publish" -NoNewWindow -PassThru -RedirectStandardOutput "publish-output.txt" -RedirectStandardError "publish-errors.txt"

# Wait with timeout
$timeout = 300 # 5 minutes
$timer = 0
while (!$publishProcess.HasExited -and $timer -lt $timeout) {
    Start-Sleep -Seconds 5
    $timer += 5
    Write-Host "⏳ Publishing... ($timer/$timeout seconds)" -ForegroundColor Yellow
    
    # Check for output periodically
    if (Test-Path "publish-output.txt") {
        $output = Get-Content "publish-output.txt" -Tail 3 -ErrorAction SilentlyContinue
        if ($output) {
            Write-Host "📤 Latest: $($output -join ' ')" -ForegroundColor Blue
        }
    }
}

if ($publishProcess.HasExited) {
    Write-Host "✅ Publish process completed with exit code: $($publishProcess.ExitCode)" -ForegroundColor Green
    if (Test-Path "publish-output.txt") {
        Write-Host "📋 Full output saved to publish-output.txt"
    }
} else {
    Write-Host "❌ Publish process timed out" -ForegroundColor Red
    $publishProcess.Kill()
}
