# Add-ReportingSettings.ps1
# Adds report_interval and enable_realtime_reporting settings to ALL drivers

Write-Host "[SETUP] Adding reporting settings to all drivers..." -ForegroundColor Cyan
Write-Host ""

$reportingSettings = @'
    {
      "id": "report_interval",
      "type": "number",
      "label": {
        "en": "Data Report Interval (seconds)",
        "fr": "Intervalle Rapport Données (secondes)"
      },
      "value": 60,
      "min": 10,
      "max": 3600,
      "step": 10,
      "hint": {
        "en": "How often device reports data to Homey (lower = more responsive, higher = less traffic)",
        "fr": "Fréquence de rapport des données à Homey (bas = plus réactif, haut = moins de trafic)"
      }
    },
    {
      "id": "enable_realtime_reporting",
      "type": "checkbox",
      "label": {
        "en": "Enable Real-Time Data Reporting",
        "fr": "Activer Rapport Données Temps Réel"
      },
      "value": true,
      "hint": {
        "en": "Configure device to report data changes immediately (recommended for AC-powered devices)",
        "fr": "Configure l'appareil pour rapporter les changements immédiatement (recommandé pour appareils secteur)"
      }
    }
'@

$driverFiles = Get-ChildItem -Path "drivers" -Filter "driver.compose.json" -Recurse
$modified = 0
$skipped = 0

foreach ($file in $driverFiles) {
    try {
        $content = Get-Content $file.FullName -Raw | ConvertFrom-Json
        
        # Only add if driver has measurement capabilities
        $hasMeasurement = $false
        if ($content.capabilities) {
            foreach ($cap in $content.capabilities) {
                if ($cap -like "measure_*" -or $cap -like "alarm_*" -or $cap -eq "onoff") {
                    $hasMeasurement = $true
                    break
                }
            }
        }
        
        if (-not $hasMeasurement) {
            $skipped++
            continue
        }
        
        # Check if settings already exist
        $hasSettings = $false
        if ($content.settings) {
            foreach ($setting in $content.settings) {
                if ($setting.id -eq "report_interval" -or $setting.id -eq "enable_realtime_reporting") {
                    $hasSettings = $true
                    break
                }
            }
        }
        
        if ($hasSettings) {
            Write-Host "⏭️  Skipped: $($file.Directory.Name) (already has settings)" -ForegroundColor Gray
            $skipped++
            continue
        }
        
        # Convert settings JSON to object
        $newSettings = $reportingSettings | ConvertFrom-Json
        
        # Add settings
        if (-not $content.settings) {
            $content.settings = @()
        }
        
        # Append new settings
        $content.settings += $newSettings
        
        # Write back
        $json = $content | ConvertTo-Json -Depth 10
        Set-Content -Path $file.FullName -Value $json -Encoding UTF8
        
        Write-Host "[OK] Added: $($file.Directory.Name)" -ForegroundColor Green
        $modified++
        
    } catch {
        Write-Host "[ERROR] $($file.FullName) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[SUMMARY]" -ForegroundColor Cyan
Write-Host "   Modified: $modified drivers" -ForegroundColor Green
Write-Host "   Skipped: $skipped drivers" -ForegroundColor Yellow
Write-Host ""
Write-Host "[DONE] Run 'homey app build' to rebuild." -ForegroundColor Green
