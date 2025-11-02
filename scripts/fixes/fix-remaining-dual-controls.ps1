# Fix remaining dual control issues
Write-Host "Fixing remaining dual control issues..." -ForegroundColor Cyan

$driversPath = "C:\Users\HP\Desktop\homey app\tuya_repair\drivers"
$fixed = 0

# Fix switch_wall_2gang_basic
Write-Host "`nFixing switch_wall_2gang_basic..."
$driver = "switch_wall_2gang_basic"
$composeFile = Join-Path $driversPath "$driver\driver.compose.json"
$deviceFile = Join-Path $driversPath "$driver\device.js"

if (Test-Path $composeFile) {
    $content = Get-Content $composeFile -Raw -Encoding UTF8
    if ($content -match 'onoff\.button2') {
        $content = $content -replace 'onoff\.button2', 'onoff.gang2'
        $content | Set-Content $composeFile -Encoding UTF8 -NoNewline
        Write-Host "  Fixed: onoff.button2 -> onoff.gang2" -ForegroundColor Green
        $fixed++
    }
}

if (Test-Path $deviceFile) {
    $content = Get-Content $deviceFile -Raw -Encoding UTF8
    if ($content -notmatch 'this\.gangCount\s*=') {
        # Add gangCount before super.onNodeInit
        $content = $content -replace "(this\.log\('WallSwitch2gangDevice initializing\.\.\.'\);)", "`$1`n    `n    // CRITICAL: Set gang count BEFORE parent init`n    this.gangCount = 2;"
        $content | Set-Content $deviceFile -Encoding UTF8 -NoNewline
        Write-Host "  Added: gangCount = 2" -ForegroundColor Green
        $fixed++
    }
}

# Fix switch_wall_2gang_smart
Write-Host "`nFixing switch_wall_2gang_smart..."
$driver = "switch_wall_2gang_smart"
$composeFile = Join-Path $driversPath "$driver\driver.compose.json"
$deviceFile = Join-Path $driversPath "$driver\device.js"

if (Test-Path $composeFile) {
    $content = Get-Content $composeFile -Raw -Encoding UTF8
    if ($content -match 'onoff\.button2') {
        $content = $content -replace 'onoff\.button2', 'onoff.gang2'
        $content | Set-Content $composeFile -Encoding UTF8 -NoNewline
        Write-Host "  Fixed: onoff.button2 -> onoff.gang2" -ForegroundColor Green
        $fixed++
    }
}

if (Test-Path $deviceFile) {
    $content = Get-Content $deviceFile -Raw -Encoding UTF8
    if ($content -notmatch 'this\.gangCount\s*=') {
        # Check for similar pattern
        if ($content -match "initializing") {
            $content = $content -replace "(this\.log\(['\`"].*initializing.*['\`"]\);)", "`$1`n    `n    // CRITICAL: Set gang count BEFORE parent init`n    this.gangCount = 2;"
            $content | Set-Content $deviceFile -Encoding UTF8 -NoNewline
            Write-Host "  Added: gangCount = 2" -ForegroundColor Green
            $fixed++
        }
    }
}

Write-Host "`nFixed $fixed items" -ForegroundColor Green
Write-Host "Complete!" -ForegroundColor Cyan
