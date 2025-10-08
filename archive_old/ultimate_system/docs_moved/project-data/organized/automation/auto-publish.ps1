# Automated Homey App Publisher with Dynamic Interaction
# Handles all interactive prompts automatically

param(
    [string]$AppPath = (Get-Location).Path,
    [string]$Version = "1.0.19"
)

# Changelog content
$changelog = @"
v1.0.19: Complete Device Reorganization - SDK3 & Johan Benz Standards

✅ MAJOR RESTRUCTURING:
- Unbranded all device drivers (removed tuya_ prefixes)
- Organized by device categories: sensors, lights, switches, plugs
- Clean driver structure: motion_sensor, contact_sensor, smart_light, etc.
- Updated flow cards to match new unbranded driver IDs
- Professional device naming following Johan Benz standards

✅ DEVICE CATEGORIES:
- Sensors: motion_sensor, contact_sensor, temperature_humidity_sensor, presence_sensor, multisensor
- Lights: smart_light, light_switch
- Plugs: smart_plug
- All drivers follow SDK3 compliance with proper endpoints

✅ TECHNICAL IMPROVEMENTS:
- Removed duplicate drivers with same functionality
- Comprehensive manufacturer ID support maintained
- Professional asset organization by device category
- Flow cards updated for unbranded compatibility

🏆 App Store Ready: Clean, professional, SDK3 compliant structure
"@

Write-Host "🚀 Starting Automated Homey App Publication..." -ForegroundColor Green

try {
    # Set working directory
    Set-Location $AppPath
    
    # Create interactive input sequence
    $inputSequence = @(
        "y",          # Yes to uncommitted changes
        "n",          # No to version update (keep current)
        $changelog,   # Changelog content
        "",           # Empty line to finish changelog
        ""            # Additional empty line to ensure completion
    )
    
    Write-Host "📝 Prepared changelog content and responses" -ForegroundColor Yellow
    
    # Method 1: Using Start-Process with input redirection
    Write-Host "🔄 Attempting automated publication..." -ForegroundColor Blue
    
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "homey"
    $processInfo.Arguments = "app publish"
    $processInfo.WorkingDirectory = $AppPath
    $processInfo.UseShellExecute = $false
    $processInfo.RedirectStandardInput = $true
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    $processInfo.CreateNoWindow = $true
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo
    
    $outputBuilder = New-Object System.Text.StringBuilder
    $errorBuilder = New-Object System.Text.StringBuilder
    
    # Event handlers for output
    $outputAction = {
        if (-not [String]::IsNullOrEmpty($Event.SourceEventArgs.Data)) {
            $outputBuilder.AppendLine($Event.SourceEventArgs.Data)
            Write-Host $Event.SourceEventArgs.Data -ForegroundColor White
        }
    }
    
    $errorAction = {
        if (-not [String]::IsNullOrEmpty($Event.SourceEventArgs.Data)) {
            $errorBuilder.AppendLine($Event.SourceEventArgs.Data)
            Write-Host $Event.SourceEventArgs.Data -ForegroundColor Red
        }
    }
    
    Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -Action $outputAction
    Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -Action $errorAction
    
    # Start the process
    $process.Start()
    $process.BeginOutputReadLine()
    $process.BeginErrorReadLine()
    
    # Send input responses with timing
    Start-Sleep -Milliseconds 1000
    
    foreach ($input in $inputSequence) {
        Write-Host "📤 Sending: $($input.Substring(0, [Math]::Min(50, $input.Length)))" -ForegroundColor Cyan
        $process.StandardInput.WriteLine($input)
        $process.StandardInput.Flush()
        Start-Sleep -Milliseconds 800
    }
    
    # Close input and wait
    $process.StandardInput.Close()
    
    # Wait for completion with timeout
    $timeout = 120000 # 2 minutes
    if ($process.WaitForExit($timeout)) {
        Write-Host "✅ Publication process completed!" -ForegroundColor Green
        Write-Host "📊 Exit Code: $($process.ExitCode)" -ForegroundColor $(if ($process.ExitCode -eq 0) { "Green" } else { "Yellow" })
    } else {
        Write-Host "⏰ Process timed out after $($timeout/1000) seconds" -ForegroundColor Yellow
        $process.Kill()
    }
    
    # Cleanup events
    Get-EventSubscriber | Unregister-Event
    
} catch {
    Write-Host "❌ Error during publication: $($_.Exception.Message)" -ForegroundColor Red
    
    # Fallback method using direct input file
    Write-Host "🔄 Trying fallback method..." -ForegroundColor Yellow
    
    # Create input file
    $inputFile = Join-Path $AppPath "publish_input.txt"
    $inputSequence | Out-File -FilePath $inputFile -Encoding ASCII
    
    # Execute with input redirection
    $result = cmd /c "type `"$inputFile`" | homey app publish 2>&1"
    Write-Host $result
    
    # Cleanup
    Remove-Item $inputFile -Force -ErrorAction SilentlyContinue
}

Write-Host "🎯 Automated publication script completed!" -ForegroundColor Green
