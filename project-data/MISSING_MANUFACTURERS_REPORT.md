# RAPPORT D'ANALYSE - MANUFACTURER NAMES MANQUANTS
Date: 2025-10-15 12:42:34

## Statistiques
- **Total manufacturers dans le projet**: 205
- **Préfixes identifiés**: 10

## Manufacturer Names à ajouter

### Sources recommandées pour la recherche:
1. **Zigbee2MQTT Database**: https://www.zigbee2mqtt.io/supported-devices/
2. **GitHub Issues**: https://github.com/JohanBendz/com.tuya.zigbee/issues
3. **Homey Community Forum**: https://community.homey.app/t/app-pro-tuya-zigbee-app/
4. **Diagnostic Reports**: Analyser les rapports d'utilisateurs

### Méthodologie de recherche:
1. Rechercher chaque manufacturer ID manquant sur Zigbee2MQTT
2. Identifier le product ID (TS0201, TS0601, etc.)
3. Déterminer les capabilities (temperature, humidity, motion, etc.)
4. Assigner au driver approprié
5. Tester avec un appareil physique si possible

### Patterns à surveiller:
- **_TYZB02_**: 1 IDs existants - Older Tuya Zigbee devices variant 2
- **_TZ1800_**: 2 IDs existants - Tuya Zigbee variant 1800
- **_TZ2000_**: 3 IDs existants - Tuya Zigbee 2.0 devices
- **_TZ3000_**: 81 IDs existants - Standard Tuya Zigbee 3.0 devices
- **_TZ3040_**: 2 IDs existants - Tuya Zigbee 3.0 variant 040
- **_TZ3210_**: 6 IDs existants - Tuya Zigbee 3.0 variant 210
- **_TZ3400_**: 2 IDs existants - Tuya Zigbee 3.0 variant 400
- **_TZE200_**: 40 IDs existants - Tuya MCU devices with cluster 0xEF00
- **_TZE204_**: 14 IDs existants - Tuya MCU devices variant 204
- **_TZE284_**: 13 IDs existants - Tuya MCU devices variant 284
## Actions recommandées:

### Phase 1: Compléter les variantes _TZE284_
Les manufacturer IDs _TZE284_ sont des variantes de _TZE204_ et _TZE200_.
Vérifier systématiquement pour chaque _TZE204_xxx si _TZE284_xxx existe.

### Phase 2: Rechercher les _TZ3210_ manquants
Pattern émergent pour les dimmers et LED controllers.
