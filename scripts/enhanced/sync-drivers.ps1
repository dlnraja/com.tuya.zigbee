
---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
<<<<<<< HEAD
﻿# SYNC DRIVERS - Tuya Zigbee Project
# Script de synchronisation des drivers

param(
    [string]$TemplatePath = "templates\driver.compose.json"
)

Write-Host "SYNCHRONISATION DES DRIVERS" -ForegroundColor Cyan

# Vérifier si le template existe
if (-not (Test-Path $TemplatePath)) {
    Write-Host "Template non trouvé: $TemplatePath" -ForegroundColor Red
    exit 1
}

# Parcourir tous les dossiers de drivers
Get-ChildItem -Path "drivers" -Directory | ForEach-Object {
    $driverComposePath = Join-Path $_.FullName "driver.compose.json"
    
    if (-not (Test-Path $driverComposePath)) {
        Write-Host "Copie du template vers $($_.Name)" -ForegroundColor Yellow
        Copy-Item -Path $TemplatePath -Destination $driverComposePath
        Write-Host "✅ $($_.Name) - Template copié" -ForegroundColor Green
    } else {
        Write-Host "ℹ️ $($_.Name) - Template déjà présent" -ForegroundColor White
    }
}

Write-Host "SYNCHRONISATION TERMINÉE" -ForegroundColor Green
=======
﻿param(
  [string]\ = \"templates\driver.compose.json\"
)
Get-ChildItem drivers -Directory | ForEach-Object {
  if (-not (Test-Path \"$_\driver.compose.json\")) {
    Copy-Item \ \"$_\driver.compose.json\"
  }
}
>>>>>>> 2968528d15b99b4e9d4174069d0bf00c50d07887



