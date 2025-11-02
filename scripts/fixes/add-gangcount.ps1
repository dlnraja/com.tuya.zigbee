# Add gangCount to all multi-gang switch device.js files
Write-Host "Adding gangCount to switch device.js files..." -ForegroundColor Cyan

$driversPath = "C:\Users\HP\Desktop\homey app\tuya_repair\drivers"
$fixed = 0

Get-ChildItem -Path $driversPath -Directory | Where-Object { $_.Name -like "switch_*gang" } | ForEach-Object {
    $driverName = $_.Name
    $deviceFile = Join-Path $_.FullName "device.js"
    
    # Extract gang number
    if ($driverName -match '(\d+)gang$') {
        $gangCount = [int]$matches[1]
    } else {
        return
    }
    
    Write-Host "Processing: $driverName (gangCount=$gangCount)"
    
    if (Test-Path $deviceFile) {
        $content = Get-Content $deviceFile -Raw -Encoding UTF8
        
        # Skip if gangCount already set
        if ($content -match 'this\.gangCount\s*=') {
            Write-Host "  Already has gangCount" -ForegroundColor Gray
            return
        }
        
        # Find line with "initializing..." and add gangCount before super.onNodeInit
        $lines = $content -split "`r?`n"
        $newLines = @()
        $added = $false
        
        for ($i = 0; $i -lt $lines.Count; $i++) {
            $line = $lines[$i]
            $newLines += $line
            
            # After "initializing..." log, add gangCount before super.onNodeInit
            if (-not $added -and $line -match 'initializing\.\.\.' -and $i -lt ($lines.Count - 1)) {
                # Look ahead for super.onNodeInit
                for ($j = $i + 1; $j -lt [Math]::Min($i + 5, $lines.Count); $j++) {
                    if ($lines[$j] -match 'super\.onNodeInit') {
                        # Add gangCount before super.onNodeInit
                        $newLines += ""
                        $newLines += "      // CRITICAL: Set gang count BEFORE parent init"
                        $newLines += "      this.gangCount = $gangCount;"
                        $added = $true
                        break
                    }
                }
            }
        }
        
        if ($added) {
            $newContent = $newLines -join "`r`n"
            $newContent | Set-Content $deviceFile -Encoding UTF8 -NoNewline
            Write-Host "  Added gangCount=$gangCount" -ForegroundColor Green
            $fixed++
        } else {
            Write-Host "  Could not find insertion point" -ForegroundColor Yellow
        }
    }
}

Write-Host "`nAdded gangCount to $fixed drivers" -ForegroundColor Green
