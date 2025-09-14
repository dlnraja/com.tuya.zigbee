# Working Homey App Publisher - Real Publication
param([string]$ProjectPath = $PWD.Path)

Write-Host "WORKING HOMEY APP PUBLISHER" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Cyan

$changelog = @"
v1.0.20: Complete Device Reorganization - SDK3 & Johan Benz Standards

MAJOR RESTRUCTURING:
- Unbranded all device drivers (removed tuya_ prefixes)
- Organized by device categories: sensors, lights, switches, plugs
- Clean driver structure: motion_sensor, contact_sensor, smart_light, etc.
- Updated flow cards to match new unbranded driver IDs
- Professional device naming following Johan Benz standards

DEVICE CATEGORIES:
- Sensors: motion_sensor, contact_sensor, temperature_humidity_sensor, presence_sensor, multisensor
- Lights: smart_light, light_switch
- Plugs: smart_plug
- All drivers follow SDK3 compliance with proper endpoints

TECHNICAL IMPROVEMENTS:
- Removed duplicate drivers with same functionality
- Comprehensive manufacturer ID support maintained
- Professional asset organization by device category
- Flow cards updated for unbranded compatibility

App Store Ready: Clean, professional, SDK3 compliant structure
"@

try {
    Set-Location $ProjectPath
    
    # First validate the app
    Write-Host "Step 1: Validating app..." -ForegroundColor Yellow
    $validateResult = homey app validate --level publish 2>&1
    Write-Host $validateResult -ForegroundColor White
    
    # Create input for interactive publish
    Write-Host "Step 2: Creating publication responses..." -ForegroundColor Yellow
    
    $responses = @(
        "y"           # Yes to uncommitted changes
        "n"           # No to version update (keep 1.0.20)
        $changelog    # Changelog content
        ""            # Empty line to end changelog
        ""            # Additional empty line
    )
    
    $inputFile = Join-Path $ProjectPath "pub_input.txt"
    $responses | Out-File -FilePath $inputFile -Encoding ASCII -NoNewline
    
    Write-Host "Step 3: Executing publication..." -ForegroundColor Blue
    
    # Method 1: Direct execution with timeout
    $job = Start-Job -ScriptBlock {
        param($inputPath, $workingDir)
        Set-Location $workingDir
        Get-Content $inputPath | homey app publish
    } -ArgumentList $inputFile, $ProjectPath
    
    # Wait for job completion with timeout
    $timeout = 120 # 2 minutes
    if (Wait-Job $job -Timeout $timeout) {
        $result = Receive-Job $job
        Write-Host $result -ForegroundColor White
        
        if ($result -match "published|success|uploaded|build.*uploaded") {
            Write-Host "SUCCESS: App published to Homey App Store!" -ForegroundColor Green
        } else {
            Write-Host "Publication may be incomplete. Trying alternative method..." -ForegroundColor Yellow
            
            # Method 2: Manual interactive
            Write-Host "Starting interactive publish process..." -ForegroundColor Cyan
            Start-Process -FilePath "homey" -ArgumentList "app", "publish" -NoNewWindow -Wait
        }
    } else {
        Write-Host "Job timeout. Stopping and trying direct method..." -ForegroundColor Yellow
        Stop-Job $job
        
        # Method 3: CMD execution
        cmd /c "type `"$inputFile`" | homey app publish"
    }
    
    Remove-Job $job -Force -ErrorAction SilentlyContinue
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if (Test-Path $inputFile) {
        Remove-Item $inputFile -Force
    }
    
    Write-Host "Checking final status..." -ForegroundColor Blue
    
    # Check if publication was successful
    try {
        $manageResult = homey app manage 2>&1
        Write-Host "App management status:" -ForegroundColor Cyan
        Write-Host $manageResult -ForegroundColor White
    } catch {
        Write-Host "Check Homey Developer Tools manually for publication status" -ForegroundColor Yellow
    }
}
