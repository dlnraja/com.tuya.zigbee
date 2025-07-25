# Universal TUYA Zigbee Device

## Description
Application Homey pour la gestion universelle des appareils Tuya Zigbee. Support complet de 215 drivers avec automatisation avancée et mode YOLO activé.

## Caractéristiques
- **215 drivers Tuya Zigbee** supportés
- **57 workflows GitHub Actions** d'automatisation
- **4 langues** supportées (EN/FR/TA/NL)
- **Mode YOLO** activé avec auto-approve et auto-continue
- **Focus exclusif** sur l'écosystème Tuya Zigbee

## Structure du projet
`
universal.tuya.zigbee.device/
├── docs/                    # Documentation principale
│   ├── todo/               # Fichiers TODO
│   ├── locales/            # Traductions
│   └── INDEX.md            # Index de navigation
├── drivers/                # 215 drivers Tuya Zigbee
├── scripts/                # Scripts d'automatisation
├── .github/workflows/      # 57 workflows GitHub Actions
└── app.json               # Configuration de l'application
`

## Installation
1. Cloner le repository
2. Installer les dépendances : 
pm install
3. Lancer l'application : 
pm start

## Configuration YOLO Mode
`json
{
  "enabled": true,
  "auto-approve": true,
  "auto-continue": true,
  "delay": 0.1,
  "mode": "aggressive",
  "cross-platform": true,
  "real-time": true,
  "instant": true
}
`

## Métriques
- **Drivers** : 215 Tuya Zigbee
- **Workflows** : 57 GitHub Actions
- **Langues** : 4 (EN/FR/TA/NL)
- **Performance** : < 1 seconde de délai

## Focus exclusif Tuya Zigbee
Ce projet se concentre exclusivement sur l'écosystème Tuya Zigbee pour Homey, avec support complet des 215 drivers et automatisation avancée.

## Documentation
- [Documentation complète](docs/)
- [TODO](docs/todo/)
- [Traductions](docs/locales/)
- [Changelog](docs/CHANGELOG.md)

## Support
- **GitHub** : [dlnraja/universal.tuya.zigbee.device](https://github.com/dlnraja/universal.tuya.zigbee.device)
- **Auteur** : dlnraja <dylan.rajasekaram@gmail.com>
- **Licence** : MIT

*Dernière mise à jour : 2025-07-25 15:38:19*
