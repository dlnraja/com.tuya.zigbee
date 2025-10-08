# 🎨 Asset Cleanup — Règles Essentielles

**Date**: 2025-10-05T21:21:30+02:00

## Problème
Fichiers `.placeholder`, `*-spec.json`, `*.svg` causent erreurs build.

## Solution
```powershell
Get-ChildItem -Path "drivers" -Recurse -Filter "*.placeholder" | Remove-Item -Force
Get-ChildItem -Path "drivers" -Recurse -Filter "*-spec.json" | Remove-Item -Force
Get-ChildItem -Path "drivers" -Recurse -Filter "*.svg" -File | Where-Object { $_.Name -ne "icon.svg" } | Remove-Item -Force
```

## Assets Requis
- `small.png` (75×75) ✅
- `large.png` (500×500) ✅
- `icon.svg` (optionnel) ✅

## Résultat
- 506 PNG validés
- 162 drivers OK
- Validation publish PASSED
