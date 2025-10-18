Write-Host "Adding images object to all drivers..." -ForegroundColor Cyan

$driversDir = "C:\Users\HP\Desktop\homey app\tuya_repair\drivers"
$drivers = Get-ChildItem -Path $driversDir -Directory

$added = 0
$skipped = 0

foreach ($driver in $drivers) {
    $composeJsonPath = Join-Path $driver.FullName "driver.compose.json"
    
    if (-not (Test-Path $composeJsonPath)) {
        $skipped++
        continue
    }
    
    try {
        $json = Get-Content $composeJsonPath -Raw | ConvertFrom-Json
        
        $needsUpdate = $false
        
        if (-not $json.images) {
            $needsUpdate = $true
        } elseif (-not $json.images.small -or $json.images.small -notmatch "assets/images") {
            $needsUpdate = $true
        }
        
        if ($needsUpdate) {
            $imagesObject = [PSCustomObject]@{
                small = "./assets/images/small.png"
                large = "./assets/images/large.png"
                xlarge = "./assets/images/xlarge.png"
            }
            
            $json | Add-Member -MemberType NoteProperty -Name "images" -Value $imagesObject -Force
            $json | ConvertTo-Json -Depth 100 | Set-Content $composeJsonPath -Encoding UTF8
            
            Write-Host "OK $($driver.Name)" -ForegroundColor Green
            $added++
        } else {
            $skipped++
        }
    } catch {
        Write-Host "ERROR $($driver.Name)" -ForegroundColor Red
    }
}

Write-Host "`nAdded: $added, Skipped: $skipped" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Green
