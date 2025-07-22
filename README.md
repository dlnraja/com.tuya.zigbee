# 🧠 com.tuya.zigbee — Intégration Homey + Tuya Zigbee + IA

[![CI](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/integrity-monitor.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/integrity-monitor.yml)
[![Backup](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/monthly-backup.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/monthly-backup.yml)
[🌐 Dashboard](https://dlnraja.github.io/com.tuya.zigbee/)

## Objectif
- Générer et maintenir automatiquement les drivers Tuya Zigbee pour Homey
- Automatiser la CI, la restauration, les tests, la sauvegarde et le bench IA
- Dashboard et scripts IA inclus

## Structure
- `drivers/` : tous les drivers Tuya
- `dashboard/` : HTML/JS statique
- `tools/` : scripts IA, réparation, parsing
- `.github/workflows/` : CI/CD, backup, intégrité
- `test/` : scripts de tests
- `deploy.ps1` : déploiement auto
- `repair_project.ps1` : restauration des fichiers critiques

## Commandes utiles
```powershell
# Déploiement
./deploy.ps1

# Restauration
./tools/repair_project.ps1

# Tests

npm test
```

## IA/Automatisation

* Bench IA mensuel (Claude, GPT, DALL·E…)
* Parsing Z2M → Homey automatisé
* Backup Google Drive automatique

## Crédits

* Dylan Rajasekaram (dlnraja)
* Kimi.AI — automations/IA
* Homey, Z2M & open-source community
