# Ultimate Automated Homey App Publisher - Fixed Version
param([string]$ProjectPath = $PWD.Path)

Write-Host "ULTIMATE AUTOMATED HOMEY PUBLISHER v3.0" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

$changelog = @"
v1.0.19: Complete Device Reorganization - SDK3 & Johan Benz Standards

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
    Write-Host "Creating automated input sequence..." -ForegroundColor Yellow
    
    # Create input responses
    $responses = @(
        "y"           # Yes to uncommitted changes
        "n"           # No to version update (keep current)
        $changelog    # Full changelog content
        ""            # Empty line to end changelog
        ""            # Additional empty line
        "y"           # Any additional confirmations
        "y"           # More confirmations
        "yes"         # Alternative format
    )
    
    $inputFile = Join-Path $ProjectPath "auto_input.txt"
    $responses | Out-File -FilePath $inputFile -Encoding ASCII
    
    Write-Host "Starting homey app publish with automated responses..." -ForegroundColor Blue
    
    # Execute with input redirection
    $publishResult = cmd /c "type `"$inputFile`" | homey app publish 2>&1"
    Write-Host $publishResult -ForegroundColor White
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: App published successfully!" -ForegroundColor Green
    } else {
        Write-Host "Publication process completed. Check output for details." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Cleanup
    if (Test-Path $inputFile) {
        Remove-Item $inputFile -Force
    }
    Write-Host "Automated publication process completed!" -ForegroundColor Green
}
