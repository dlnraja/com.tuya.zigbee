# Script de correction automatique des 6 erreurs d'indentation
Write-Host "🔧 CORRECTION AUTOMATIQUE DES ERREURS D'INDENTATION" -ForegroundColor Cyan
Write-Host ""

$files = @(
  @{
    Path    = "drivers\contact_sensor_vibration\device.js"
    Line    = 225
    Pattern = "async setupIASZone"
  },
  @{
    Path    = "drivers\doorbell_button\device.js"
    Line    = 368
    Pattern = "async setupIASZone"
  },
  @{
    Path    = "drivers\thermostat_advanced\device.js"
    Line    = 188
    Pattern = "async triggerFlowCard"
  },
  @{
    Path    = "drivers\thermostat_smart\device.js"
    Line    = 188
    Pattern = "async triggerFlowCard"
  },
  @{
    Path    = "drivers\thermostat_temperature_control\device.js"
    Line    = 189
    Pattern = "async triggerFlowCard"
  },
  @{
    Path    = "drivers\water_valve_controller\device.js"
    Line    = 189
    Pattern = "async triggerFlowCard"
  }
)

$fixed = 0
$errors = 0

foreach ($file in $files) {
  $fullPath = Join-Path $PSScriptRoot $file.Path
  Write-Host "Processing: $($file.Path)" -ForegroundColor Yellow

  if (-not (Test-Path $fullPath)) {
    Write-Host "  ❌ File not found" -ForegroundColor Red
    $errors++
    continue
  }

  try {
    $content = Get-Content $fullPath -Raw
    $lines = Get-Content $fullPath

    # Trouver la ligne de la méthode
    $methodLine = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
      if ($lines[$i] -match $file.Pattern) {
        $methodLine = $i
        break
      }
    }

    if ($methodLine -eq -1) {
      Write-Host "  ⚠️ Method not found" -ForegroundColor Yellow
      continue
    }

    # Construire le fichier corrigé
    $fixedLines = @()
    $inMethod = $false
    $braceCount = 0
    $methodIndent = 0

    for ($i = 0; $i -lt $lines.Count; $i++) {
      $line = $lines[$i]

      # Début de la méthode
      if ($i -eq $methodLine) {
        $inMethod = $true
        $methodIndent = ($line -replace '^(\s+).*', '$1').Length
        $fixedLines += $line
        continue
      }

      # Dans la méthode
      if ($inMethod) {
        # Compter les accolades pour détecter la fin de la méthode
        $braceCount += ([regex]::Matches($line, '\{').Count)
        $braceCount -= ([regex]::Matches($line, '\}').Count)

        # Ligne vide
        if ($line.Trim() -eq '') {
          $fixedLines += ''
          continue
        }

        # Calculer l'indentation correcte
        $trimmed = $line.TrimStart()
        if ($trimmed -ne '') {
          # Déterminer le niveau d'indentation basé sur les accolades et structures
          $currentIndent = ($line -replace '^(\s+).*', '$1').Length

          # Si l'indentation actuelle est < methodIndent + 4, corriger
          if ($currentIndent -le $methodIndent) {
            # Ligne au niveau de la méthode ou moins = indenter de 4
            $line = (' ' * ($methodIndent + 4)) + $trimmed
          }
        }

        $fixedLines += $line

        # Fin de la méthode (braceCount revient à -1)
        if ($braceCount -eq -1) {
          $inMethod = $false
        }
      }
      else {
        $fixedLines += $line
      }
    }

    # Écrire le fichier
    $fixedLines | Set-Content $fullPath -Encoding UTF8
    Write-Host "  ✅ Fixed" -ForegroundColor Green
    $fixed++

  }
  catch {
    Write-Host "  ❌ Error: $_" -ForegroundColor Red
    $errors++
  }
}

Write-Host ""
Write-Host "📊 RÉSULTAT:" -ForegroundColor Cyan
Write-Host "  ✅ Fixed: $fixed" -ForegroundColor Green
Write-Host "  ❌ Errors: $errors" -ForegroundColor Red

if ($errors -eq 0) {
  Write-Host ""
  Write-Host "✨ TOUS LES FICHIERS CORRIGÉS!" -ForegroundColor Green
  Write-Host ""
  Write-Host "🔍 Vérification avec lint..." -ForegroundColor Yellow
  npm run lint 2>&1 | Select-String -Pattern "Parsing error" | Measure-Object
}
else {
  Write-Host ""
  Write-Host "⚠️ Des erreurs sont survenues" -ForegroundColor Yellow
}
