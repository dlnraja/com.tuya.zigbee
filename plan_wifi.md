# Plan d'Action Stratégique : Branche Tuya WiFi (Local First)

## 1. Objectif Principal
Créer une branche parallèle dédiée (`feature/wifi-local-first`) pour gérer nativement et de façon unifiée tous les appareils WiFi Tuya (interrupteurs, capteurs, etc.) en **mode local (sans cloud)**, tout en s'inspirant de l'historique complet de l'application. Cette branche réintégrera les pilotes WiFi unifiés actuellement ignorés.

## 2. État des Lieux et Problèmes Identifiés
- **Pilotes existants mais inactifs** : Une dizaine de pilotes unifiés WiFi (ex: `wifi_unified_switch`, `wifi_unified_sensor`, etc.) sont présents physiquement dans le code mais ont "disparu" du fichier final `app.json`.
- **Cause de l'exclusion** : Le fichier de configuration `driver.compose.json` de ces pilotes utilise une syntaxe invalide pour Homey (`"platform": ["wifi"]` au lieu de `"platforms": ["local", "cloud"]`).
- **Gestion Hybride Complexe** : De nombreux appareils Tuya existent en versions Zigbee ET WiFi avec les mêmes IDs ou des comportements très similaires, ce qui requiert une gestion minutieuse par "combo Manufacturer+DeviceID".

## 3. Plan d'Action Détaillé (Pour Claude Code Boosté)

### Phase 1 : Correction et Réintégration (App.json)
1. **Auditer les fichiers compose** : Parcourir tous les dossiers `drivers/wifi_unified_*`.
2. **Corriger la propriété Platform** : Remplacer `"platform": ["wifi"]` par `"platforms": ["local"]` (et éventuellement `"cloud"` si un repli est justifié) dans tous les `driver.compose.json`.
3. **Mettre à jour l'icône et les images** : Aligner, optimiser, et réorganiser les images des drivers WiFi pour respecter les limites strictes d'Athom (xlarge.png exclus, small.png très léger) comme on l'a fait sur Zigbee.
4. **Regénérer le Manifeste** : Compiler de nouveau `app.json` pour s'assurer que les 10+ drivers unifiés apparaissent bien aux côtés des 5 drivers WiFi existants (ex: `wifi_ewelink_switch`) et des drivers Zigbee.

### Phase 2 : Moteur de Communication "Local First"
1. **Évolutions UDP/API** : Intégrer les récentes évolutions Tuya concernant la clé API locale UDP.
2. **Tuya-DP-Engine pour le WiFi** : Étendre ou cloner le parser Zigbee (ex: `AdaptiveDataParser.js`) pour qu'il soit capable d'interpréter les DataPoints (DP) Tuya reçus en TCP/UDP local.
3. **Sécurité et Authentification** : S'assurer que le processus d'appairage stocke correctement la `Local Key` et l'adresse IP.

### Phase 3 : Gestion Multi-Variantes (MFS + DeviceID)
1. **Cartographie Hybride** : Utiliser `ManufacturerVariationManager` (ou un équivalent WiFi) pour aiguiller les différents comportements d'un même `modelId`.
2. **Énergie Dynamique** : Réutiliser la logique de `BatteryManager.js` pour les appareils WiFi à batterie (avec les mêmes paliers de 0 à 100% sans division par 2 abusive).

### Phase 4 : Déploiement et Tests
1. Isoler tous ces changements dans la branche `feature/wifi-local-first`.
2. Lancer les scripts de validation (`npm run validate:recursive`, `npm run check:all`).
3. Tester avec un appareil WiFi Tuya réel pour valider la non-régression sur le réseau Zigbee.


### Phase 0 : Structure du Dépôt
- Le code WiFi sera développé dans un répertoire physique distinct (	uya_wifi_local), créé à côté du projet 	uya_repair master.
- Ce répertoire est un nouveau repo Git pointant vers la branche isolée eature/wifi-local-first.
