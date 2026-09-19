# Zigbee Bastien — maison uniquement

App Homey Pro **privée** pour la maison de Bastien.

| | |
|---|---|
| **Branch** | `bastien-home` |
| **Dossier** | `Documents/homey/bastien` |
| **App ID** | `com.dlnraja.tuya.zigbee.bastien` |
| **Nom** | Zigbee Bastien |
| **Version** | `1.0.x` |

## Install chez Bastien

```bash
cd Documents/homey/bastien
npm ci
homey login
homey app install
```

Ne **pas** publier sur le slot Test « Universal Tuya » ni « Tuya Unified Stable ».

## Enrichissement

Les corrects / couples / DP appris ici remontent vers **master** puis **stable** (fiabilité), via :

```bash
# depuis Documents/homey/master
npm run bastien:promote -- --dry-run
```

Jamais de sync inverse wholesale (master → Bastien en masse). Cherry-pick sélectif OK pour un appareil dont Bastien a besoin.

Doctrine: `docs/rules/BASTIEN_HOUSE_APP.md`
