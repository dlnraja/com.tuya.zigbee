# Check all drivers with 2 gangs/ports/buttons for dual control
Write-Host "🔍 Checking drivers with 2 gangs/ports/buttons..." -ForegroundColor Cyan

$driversPath = "C:\Users\HP\Desktop\homey app\tuya_repair\drivers"
$issues = @()

# Get all drivers with "2" in name
$drivers = Get-ChildItem -Path $driversPath -Directory | Where-Object { 
    $_.Name -match '2gang|2port|2button|wireless_2|remote_2|wall.*2'
}

Write-Host "`n📂 Found $($drivers.Count) drivers to check`n" -ForegroundColor Yellow

foreach ($driver in $drivers) {
    $driverName = $driver.Name
    $composeFile = Join-Path $driver.FullName "driver.compose.json"
    
    Write-Host "📝 Checking: $driverName" -ForegroundColor White
    
    if (Test-Path $composeFile) {
        $content = Get-Content $composeFile -Raw -Encoding UTF8 | ConvertFrom-Json
        
        # Count capabilities
        $capabilities = $content.capabilities
        $capCount = $capabilities.Count
        
        Write-Host "   Capabilities: $capCount" -ForegroundColor Gray
        
        # Display capabilities
        foreach ($cap in $capabilities) {
            Write-Host "     - $cap" -ForegroundColor Gray
        }
        
        # Check if has proper dual control
        $hasOnOff = $capabilities -contains "onoff"
        $hasSecond = ($capabilities -match "onoff\.gang2|onoff\.button2|onoff\.port2|onoff\.2").Count -gt 0
        
        if ($hasOnOff -and $hasSecond) {
            Write-Host "   ✅ HAS dual control" -ForegroundColor Green
        } elseif ($hasOnOff -and $capCount -ge 2) {
            Write-Host "   ⚠️  Has multiple caps but naming unclear" -ForegroundColor Yellow
            $issues += @{
                Driver = $driverName
                Capabilities = $capabilities
                Issue = "Unclear naming"
            }
        } elseif ($capCount -lt 2) {
            Write-Host "   ❌ MISSING second control!" -ForegroundColor Red
            $issues += @{
                Driver = $driverName
                Capabilities = $capabilities
                Issue = "Missing second capability"
            }
        } else {
            Write-Host "   ⚠️  Check manually" -ForegroundColor Yellow
            $issues += @{
                Driver = $driverName
                Capabilities = $capabilities
                Issue = "Manual check needed"
            }
        }
    } else {
        Write-Host "   ⚠️  No driver.compose.json found" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

if ($issues.Count -gt 0) {
    Write-Host "`n⚠️  ISSUES FOUND: $($issues.Count)" -ForegroundColor Yellow
    Write-Host "`nDrivers needing attention:" -ForegroundColor Yellow
    
    foreach ($issue in $issues) {
        Write-Host "`n  Driver: $($issue.Driver)" -ForegroundColor White
        Write-Host "  Issue: $($issue.Issue)" -ForegroundColor Yellow
        Write-Host "  Current caps: $($issue.Capabilities -join ', ')" -ForegroundColor Gray
    }
} else {
    Write-Host "`n✅ All drivers have proper dual control!" -ForegroundColor Green
}

Write-Host "`n🎉 Check complete!" -ForegroundColor Cyan
