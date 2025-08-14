// Structure des Drivers - SDK3+

#// Vue d'ensemble

Cette structure suit les meilleures pratiques du SDK3+ de Homey et permet une organisation claire et extensible des drivers.

#// Organisation

##// tuya_zigbee/
Drivers pour les appareils Tuya utilisant le protocole Zigbee.

- **models/** - Drivers spécifiques avec code canonique
- **brands/** - Overlays par marque (modifications ciblées)
- **categories/** - Overlays par catégorie d'usage
- **__generic__/** - Drivers génériques pour fallback
- **__templates__/** - Modèles pour nouveaux drivers

##// zigbee/
Drivers pour les appareils Zigbee non-Tuya.

- **models/** - Drivers spécifiques avec code canonique
- **brands/** - Overlays par marque
- **categories/** - Overlays par catégorie
- **__generic__/** - Drivers génériques
- **__templates__/** - Modèles

#// Nommage des drivers

Format: `<ts_model|vendor>_<device_type>_<form_factor>_<variant>`

Exemples:
- \ts0003_wall_switch_wall_3gang_no_neutral`
- \ts011f_smart_plug_mains_em`
- `aqara_sensor_motion_battery`

#// Fichiers obligatoires

Chaque driver doit contenir:
- `driver.compose.json` - Configuration du driver
- `driver.js` - Logique du driver
- `device.js` - Logique de l'appareil
- `metadata.json` - Métadonnées structurées
- `README.md` - Documentation
- `assets/icon.svg` - Icône vectorielle
- `assets/images/small.png` - 75x75 px
- `assets/images/large.png` - 500x500 px
- `assets/images/xlarge.png` - 1000x1000 px

#// Overlays

Les overlays permettent de personnaliser un driver sans dupliquer le code:
- `overlay.json` - Modifications spécifiques
- Assets facultatifs (icônes brandées)
- Pas de code JS (sauf override ciblé validé)

#// Drivers génériques

Fournissent un fallback automatique pour les appareils non reconnus:
- Détection automatique des capabilities
- Mapping intelligent des clusters
- Support des protocoles standards

#// Templates

Modèles réutilisables pour créer rapidement de nouveaux drivers:
- Structure de base complète
- Code d'exemple
- Documentation intégrée
