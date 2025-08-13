// Rapport de Validation Structure - 2025-08-12T17:27:05.915Z

#// Résumé
- **Total drivers**: 210
- **Valides**: 210
- **Invalides**: 0
- **Taux de succès**: 100%

#// Structure attendue
```
drivers/
├── {tuya|zigbee}/           // Domain
│   ├── {category}/          // Category (light, plug, sensor-motion, etc.)
│   │   ├── {vendor}/        // Vendor (tuya, aqara, ikea, philips, sonoff, ledvance, generic)
│   │   │   └── {model}/     // Model (nom spécifique)
│   │   │       ├── driver.compose.json  // REQUIS
│   │   │       ├── device.js            // REQUIS
│   │   │       ├── assets/
│   │   │       │   ├── icon.svg        // REQUIS
│   │   │       │   └── small.png       // REQUIS
│   │   │       ├── settings.json       // OPTIONNEL
│   │   │       ├── README.md           // OPTIONNEL
│   │   │       └── CHANGELOG.md        // OPTIONNEL
```

#// Format ID attendu
```
<category>-<vendor>-<model>
```

#// Erreurs détectées
Aucune erreur

#// Avertissements
Aucun avertissement
