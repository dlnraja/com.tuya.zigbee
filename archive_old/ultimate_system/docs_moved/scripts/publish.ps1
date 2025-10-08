# Fixed PowerShell publish script
Write-Host "🚀 Starting publish process..." -ForegroundColor Green

# Validate first  
Write-Host "📋 Validating app..." -ForegroundColor Yellow
homey app validate --level publish

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Validation failed" -ForegroundColor Red
    exit 1
}

# Publish
Write-Host "📤 Publishing app..." -ForegroundColor Yellow
$changelog = "🎉 v1.0.8 COMPREHENSIVE CLEANUP - Fixed all undefined values, rebranded device names to be generic and professional, added working flow cards!"

# Use PowerShell to send input
$process = Start-Process "homey" -ArgumentList "app", "publish" -PassThru -NoNewWindow
Start-Sleep -Seconds 2
[System.Windows.Forms.SendKeys]::SendWait("n{ENTER}")
Start-Sleep -Seconds 2  
[System.Windows.Forms.SendKeys]::SendWait("$changelog{ENTER}")
$process.WaitForExit()

Write-Host "✅ Publish process completed!" -ForegroundColor Green