# Reorder USB Outlet Drivers in app.json
# Fix: usb_outlet_2port BEFORE usb_outlet_1gang

$appJsonPath = Join-Path $PSScriptRoot "..\app.json"

Write-Host "🔧 Reordering USB Outlet Drivers..." -ForegroundColor Cyan

# Read app.json
$json = Get-Content $appJsonPath -Raw | ConvertFrom-Json

# Find indices
$drivers = $json.drivers
$idx1gang = -1
$idx2port = -1

for ($i = 0; $i -lt $drivers.Count; $i++) {
    if ($drivers[$i].id -eq "usb_outlet_1gang") {
        $idx1gang = $i
        Write-Host "Found usb_outlet_1gang at index $i" -ForegroundColor Yellow
    }
    if ($drivers[$i].id -eq "usb_outlet_2port") {
        $idx2port = $i
        Write-Host "Found usb_outlet_2port at index $i" -ForegroundColor Yellow
    }
}

if ($idx1gang -eq -1 -or $idx2port -eq -1) {
    Write-Host "❌ ERROR: Could not find both drivers!" -ForegroundColor Red
    exit 1
}

# Check if already in correct order
if ($idx2port -lt $idx1gang) {
    Write-Host "✅ Already in correct order (2port before 1gang)" -ForegroundColor Green
    exit 0
}

Write-Host "`n🔄 Swapping drivers..." -ForegroundColor Cyan
Write-Host "  Before: 1gang at $idx1gang, 2port at $idx2port" -ForegroundColor Gray

# Swap: Remove 2port and insert before 1gang
$driver2port = $drivers[$idx2port]
$driversArray = [System.Collections.ArrayList]::new($drivers)
$driversArray.RemoveAt($idx2port)
$driversArray.Insert($idx1gang, $driver2port)

# Update JSON
$json.drivers = $driversArray.ToArray()

Write-Host "  After:  2port at $idx1gang, 1gang at $($idx1gang + 1)" -ForegroundColor Gray

# Write back (with proper formatting)
$json | ConvertTo-Json -Depth 100 | Set-Content $appJsonPath -Encoding UTF8

Write-Host "`n✅ SUCCESS! USB Outlet drivers reordered" -ForegroundColor Green
Write-Host "   usb_outlet_2port now BEFORE usb_outlet_1gang" -ForegroundColor Green
Write-Host "`n💡 Rule: Specific drivers BEFORE generic drivers" -ForegroundColor Cyan
Write-Host "   - 2-port (2 endpoints) → More specific" -ForegroundColor Gray
Write-Host "   - 1-gang (1 endpoint) → More generic (fallback)" -ForegroundColor Gray
