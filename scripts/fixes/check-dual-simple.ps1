# Check drivers with 2 gangs/ports for dual control
Write-Host "Checking drivers with 2 controls..." -ForegroundColor Cyan

$driversPath = "C:\Users\HP\Desktop\homey app\tuya_repair\drivers"
$issues = @()

$drivers = Get-ChildItem -Path $driversPath -Directory | Where-Object { 
    $_.Name -match '2gang|2port|2button|wireless_2|remote_2'
}

Write-Host "Found $($drivers.Count) drivers"

foreach ($driver in $drivers) {
    $driverName = $driver.Name
    $composeFile = Join-Path $driver.FullName "driver.compose.json"
    
    Write-Host "`nChecking: $driverName"
    
    if (Test-Path $composeFile) {
        $content = Get-Content $composeFile -Raw -Encoding UTF8 | ConvertFrom-Json
        $capabilities = $content.capabilities
        
        Write-Host "  Capabilities count: $($capabilities.Count)"
        
        foreach ($cap in $capabilities) {
            Write-Host "    - $cap"
        }
        
        $hasOnOff = $capabilities -contains "onoff"
        $hasSecond = ($capabilities -match "\.gang2|\.button2|\.port2|\.2").Count -gt 0
        
        if (-not $hasOnOff) {
            Write-Host "  WARNING: No onoff capability" -ForegroundColor Yellow
        } elseif (-not $hasSecond) {
            Write-Host "  ERROR: Missing second control capability!" -ForegroundColor Red
            $issues += $driverName
        } else {
            Write-Host "  OK: Has dual control" -ForegroundColor Green
        }
    }
}

Write-Host "`n--- SUMMARY ---"
if ($issues.Count -gt 0) {
    Write-Host "ISSUES FOUND in $($issues.Count) drivers:" -ForegroundColor Red
    $issues | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
} else {
    Write-Host "All drivers OK!" -ForegroundColor Green
}
