# Tuya Zigbee Universal

[EN] Universal Tuya and Zigbee devices for Homey - Mega Fix Ultimate
[FR] Appareils Tuya et Zigbee universels pour Homey - Mega Fix Ultimate
[NL] Universele Tuya en Zigbee apparaten voor Homey - Mega Fix Ultimate
[TA] ஹோமியுக்கான உலகளாவிய Tuya மற்றும் Zigbee சாதனங்கள் - Mega Fix Ultimate

## Features / Fonctionnalités / Functies / அம்சங்கள்

- ✅ 5 bugs forum corrigés
- ✅ Validation complète (debug + publish)
- ✅ Images PNG conformes Athom BV
- ✅ Drivers organisés par catégories
- ✅ Documentation multilingue
- ✅ Issues GitHub intégrées

## Installation

```bash
npx homey app validate --level debug
npx homey app validate --level publish
homey app install
```

## Structure

```
/drivers/
├── tuya/
│   ├── lights/
│   ├── switches/
│   ├── plugs/
│   ├── sensors/
│   ├── covers/
│   ├── locks/
│   └── thermostats/
└── zigbee/
    ├── lights/
    ├── sensors/
    ├── controls/
    └── historical/
```

## Support

- GitHub: https://github.com/dlnraja/com.tuya.zigbee
- Forum: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352/31

## License

MIT License