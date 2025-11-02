# Fix All Switch Multi-Gang Capabilities
# Corrects onoff.button2/3/4/etc to onoff.gang2/3/4/etc
# Adds gangCount to device.js files

Write-Host "🔧 Fixing all switch multi-gang capabilities..." -ForegroundColor Cyan

$driversPath = "C:\Users\HP\Desktop\homey app\tuya_repair\drivers"
$fixedCount = 0
$errors = @()

# Get all switch drivers
$switchDrivers = Get-ChildItem -Path $driversPath -Directory | Where-Object { $_.Name -like "switch_*gang" }

Write-Host "📂 Found $($switchDrivers.Count) switch drivers" -ForegroundColor Yellow

foreach ($driver in $switchDrivers) {
    $driverName = $driver.Name
    $composeFile = Join-Path $driver.FullName "driver.compose.json"
    $deviceFile = Join-Path $driver.FullName "device.js"
    
    Write-Host "`n📝 Processing: $driverName" -ForegroundColor White
    
    # Extract gang number from driver name
    if ($driverName -match '(\d+)gang$') {
        $gangCount = [int]$matches[1]
        Write-Host "   Gang count: $gangCount" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  Could not extract gang count, skipping" -ForegroundColor Yellow
        continue
    }
    
    # Fix driver.compose.json
    if (Test-Path $composeFile) {
        try {
            $content = Get-Content $composeFile -Raw -Encoding UTF8
            $modified = $false
            
            # Replace onoff.button2/3/4/etc with onoff.gang2/3/4/etc
            for ($i = 2; $i -le $gangCount; $i++) {
                if ($content -match "onoff\.button$i") {
                    $content = $content -replace "onoff\.button$i", "onoff.gang$i"
                    $modified = $true
                    Write-Host "   ✅ Fixed capability: onoff.button$i → onoff.gang$i" -ForegroundColor Green
                }
            }
            
            if ($modified) {
                $content | Set-Content $composeFile -Encoding UTF8 -NoNewline
                $fixedCount++
            }
        } catch {
            $errors += "Error fixing $composeFile : $_"
            Write-Host "   ❌ Error: $_" -ForegroundColor Red
        }
    }
    
    # Fix device.js - add gangCount if missing
    if (Test-Path $deviceFile) {
        try {
            $content = Get-Content $deviceFile -Raw -Encoding UTF8
            
            # Check if gangCount is already set
            if ($content -notmatch "this\.gangCount\s*=") {
                # Find the onNodeInit function and add gangCount before super.onNodeInit
                $pattern = '(this\.log\([''"].*initializing\.\.\.["'']\);)([\r\n\s]+)(\/\/ Initialize base|await super\.onNodeInit)'
                if ($content -match $pattern) {
                    $replacement = "`$1`n      `n      // CRITICAL: Set gang count BEFORE parent init`n      this.gangCount = $gangCount;`n      `$3"
                    $content = $content -replace $pattern, $replacement
                    
                    $content | Set-Content $deviceFile -Encoding UTF8 -NoNewline
                    Write-Host "   ✅ Added gangCount = $gangCount to device.js" -ForegroundColor Green
                } else {
                    Write-Host "   ⚠️  Could not find insertion point for gangCount" -ForegroundColor Yellow
                }
            } else {
                Write-Host "   ℹ️  gangCount already present" -ForegroundColor Gray
            }
        } catch {
            $errors += "Error fixing $deviceFile : $_"
            Write-Host "   ❌ Error: $_" -ForegroundColor Red
        }
    }
}

Write-Host "`n✅ Fixed $fixedCount switch drivers" -ForegroundColor Green

if ($errors.Count -gt 0) {
    Write-Host "`n⚠️  Errors encountered:" -ForegroundColor Yellow
    $errors | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
}

Write-Host "`n🎉 Script complete!" -ForegroundColor Cyan
