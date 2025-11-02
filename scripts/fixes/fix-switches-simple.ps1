# Fix Switch Capabilities - Simple Version
Write-Host "Fixing switch capabilities..." -ForegroundColor Cyan

$driversPath = "C:\Users\HP\Desktop\homey app\tuya_repair\drivers"
$fixed = 0

Get-ChildItem -Path $driversPath -Directory | Where-Object { $_.Name -like "switch_*gang" } | ForEach-Object {
    $driverName = $_.Name
    $composeFile = Join-Path $_.FullName "driver.compose.json"
    
    Write-Host "Processing: $driverName"
    
    if (Test-Path $composeFile) {
        $content = Get-Content $composeFile -Raw -Encoding UTF8
        $modified = $false
        
        # Replace all onoff.button with onoff.gang
        if ($content -match 'onoff\.button') {
            $content = $content -replace 'onoff\.button', 'onoff.gang'
            $modified = $true
        }
        
        if ($modified) {
            $content | Set-Content $composeFile -Encoding UTF8 -NoNewline
            Write-Host "  Fixed: $driverName" -ForegroundColor Green
            $fixed++
        }
    }
}

Write-Host "`nFixed $fixed drivers" -ForegroundColor Green
