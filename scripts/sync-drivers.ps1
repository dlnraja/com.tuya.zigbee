# Script de synchronisation des drivers
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\sync-drivers.ps1
param(
    [string]$DriversPath = ".\drivers",
    [string]$TemplatePath = ".\templates\driver.compose.json"
)

# Vérification du template
if (-not (Test-Path $TemplatePath)) {
    # Création du dossier templates s'il n'existe pas
    $templatesDir = Split-Path -Parent $TemplatePath
    if (-not (Test-Path $templatesDir)) {
        New-Item -ItemType Directory -Path $templatesDir -Force | Out-Null
    }
    
    # Création du template par défaut
    $defaultTemplate = @"
{
  "id": "",
  "name": {
    "en": ""
  },
  "class": "socket",
  "capabilities": [
    "onoff"
  ],
  "zigbee": {
    "manufacturerName": "Tuya",
    "productId": [],
    "endpoints": {
      "1": {
        "clusters": [
          0, 4, 5, 61184
        ],
        "bindings": [
          0, 4, 5
        ]
      }
    }
  }
}
