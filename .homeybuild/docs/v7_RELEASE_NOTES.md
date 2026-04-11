# Release Notes - v7.0.22 (MAX Local Pro)

## 🚀 ARCHITECTURE HYBRIDE "SHADOW-PULSAR"
### 🪞 Shadow-Pulsar (v7.0.22 - Experimental & Safe)
- **Safe-by-Default**: Cloud mirroring is now GLOBALLY DISABLED. Users must enable `experimental_cloud_mirror` in App Settings.
- **Quota Shields**: 
    - **Deadband Filter**: Suppresses noise (e.g., Temperature ±0.5°C, Humidity ±5%) to save API credits.
    - **API Batching**: Groups multiple state updates into a single cloud call per device.
    - **Whitelisting**: Only allows critical DPs (Switches, Sensors) to prevent quota flooding.
*   **Synchronisation Cloud Intelligente** : Introduction du pont bidirectionnel Zigbee-to-Cloud. Vos appareils Zigbee sont désormais visibles dans l'app Smart Life sans risque de boucles infinies.
*   **Leaky Bucket Throttling** : Limitation du débit vers l'API Tuya (1 req / 2 sec).
*   **Cloud Echo Shield** : Filtre intelligent (2.5s) bloquant les rebonds d'états pour une interface Homey stable.

## 🧩 NATIVE MULTI-GANG SDK 3
*   **Dot-Notation Migration** : Refonte totale des interrupteurs 2-5 gangs vers le standard SDK 3 (`onoff.1`, `onoff.2`, etc.).
*   **Multi-Gang Guard** : Bouclier différentiel empêchant les Flows redondants sur les relais inactifs.
*   **Cartes de Flow Natives** : Chaque bouton possède désormais ses propres déclencheurs Flows indépendants.

## 📡 MOTEUR WIFI "LOCAL-DIRECT"
*   **Waterfall Authentication** : Système de login résilient multi-régions (EU/US/CN/IN).
*   **TCP Zero-Trust Probe** : Validation AES-128 sur Port 6668 pré-onboarding.
*   **Responsive Discovery** : Priorisation mDNS pour une latence < 50ms.

## 🛡️ MAINTENANCE INDUSTRIELLE (DEVOPS)
*   **Auto-Ganger Engine** : Provisionnement automatisé des dot-notation capabilities.
*   **Anti-Corruption Shield** : Validation AJV des manifestations contre le schéma officiel SDK 3.
*   **Filtre BVB** : Filtrage des valeurs absurdes pour des graphiques Insights propres.
*   **Session Maintenance** : Rotation cron du refresh_token tous les 15 jours.
