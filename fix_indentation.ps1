# Script de correction automatique des indentations
# Corrige les erreurs "Unexpected token (" en ajustant les indentations à 4 espaces

$files = @(
    "drivers\contact_sensor_vibration\device.js",
    "drivers\doorbell_button\device.js",
    "drivers\thermostat_advanced\device.js",
    "drivers\thermostat_smart\device.js",
    "drivers\thermostat_temperature_control\device.js",
    "drivers\water_valve_controller\device.js"
)

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file
    if (Test-Path $fullPath) {
        Write-Host "Processing: $file" -ForegroundColor Cyan

        $content = Get-Content $fullPath -Raw
        $lines = Get-Content $fullPath
        $fixed = @()

        $inMethodBody = $false
        $methodIndent = 0

        for ($i = 0; $i -lt $lines.Count; $i++) {
            $line = $lines[$i]

            # Détecter début de méthode async
            if ($line -match '^\s+(async\s+\w+\([^)]*\)\s*\{)') {
                $methodIndent = ($line -replace '^(\s+).*', '$1').Length
                $inMethodBody = $true
                $fixed += $line
                continue
            }

            # Si dans un corps de méthode, forcer 4 espaces d'indentation après la déclaration
            if ($inMethodBody) {
                # Fin de méthode
                if ($line -match '^\s+\}\s*$' -and ($line.TrimStart().Length -eq 1)) {
                    $inMethodBody = $false
                    $fixed += (' ' * $methodIndent) + '}'
                    continue
                }

                # Ligne vide
                if ($line.Trim() -eq '') {
                    $fixed += ''
                    continue
                }

                # Calculer indentation relative
                $currentIndent = ($line -replace '^(\s+).*', '$1').Length
                if ($currentIndent -gt 0) {
                    $relativeIndent = $currentIndent - $methodIndent
                    if ($relativeIndent -lt 2) {
                        # Pas assez d'indentation, forcer 4 espaces minimum
                        $line = (' ' * ($methodIndent + 4)) + $line.TrimStart()
                    } elseif ($relativeIndent % 2 -ne 0) {
                        # Indentation impaire, corriger
                        $newIndent = [Math]::Ceiling($relativeIndent / 2.0) * 2 + 4
                        $line = (' ' * ($methodIndent + $newIndent)) + $line.TrimStart()
                    }
                }
            }

            $fixed += $line
        }

        # Écrire le fichier corrigé
        $fixed | Set-Content $fullPath -Encoding UTF8
        Write-Host "  ✓ Fixed" -ForegroundColor Green
    }
}

Write-Host "`nVerifying with lint..." -ForegroundColor Yellow
npm run lint 2>&1 | Select-String -Pattern "Parsing error" | Measure-Object
