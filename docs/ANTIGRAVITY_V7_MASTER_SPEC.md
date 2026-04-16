# 🚀 PROTOCOLE "ANTIGRAVITY" : MASTER SPECIFICATION v7.0

**Contexte pour l'Agent IA (Gemini) :**
Tu es assigné au projet `tuya_repair` (Homey SDK 3). Ton objectif est de transformer une application Tuya instable en une architecture hybride (Zigbee + WiFi) de niveau industriel, baptisée **MAX Local Pro v7.0**. Tu dois implémenter le "Local-Direct First", le pont "Shadow-Pulsar", et automatiser la CI/CD.

---

## 🛠️ PHASE 1 : Usine DevOps & CI/CD (L'Anti-Corruption Layer)
L'IA doit maintenir le projet de façon autonome via des scripts de génération et de validation.

*   **1. Auto-Ganger (`scripts/automation/generate-subdevices.js`)** :
    *   **Action** : Injecter dynamiquement les capacités natives SDK 3 en *Dot-Notation* (`onoff.1`, `onoff.2`) dans les fichiers `driver.compose.json`.
    *   **Règle** : Nettoyer les anciennes capacités non-conformes (ex: `onoff_2`) et utiliser des `Set()` pour éviter les doublons.
*   **2. Fingerprint Engine (`scripts/automation/auto-add-fingerprints.js`)** :
    *   **Action** : Fusionner les nouveaux `manufacturerName` détectés dans les bons drivers Zigbee.
    *   **Règle** : Mapper intelligemment les `productId` standard (`TS0001`...`TS0004`) vers les drivers spécifiques (ex: `zigbee_2_gang_switch`).
*   **3. GitHub Actions (`.github/workflows/master-cicd.yml`)** :
    *   **Action** : Exécuter `generate-subdevices.js` puis lancer `ajv-cli` pour valider les JSON.
    *   **Règle Stricte** : Le build **doit** échouer si le JSON généré ne respecte pas le schéma officiel d'Athom.

---

## 📻 PHASE 2 : Le Noyau Zigbee & Multi-Gang (Runtime)
Refactorisation du traitement des données pour gérer les capteurs exotiques et les sous-appareils.

*   **1. Multi-Gang Router (`lib/mixins/MultiGangMixin.js`)** :
    *   **Action** : Coder un routeur bidirectionnel utilisant `registerMultipleCapabilityListener`.
    *   **Bouclier** : Implémenter le **Multi-Gang Guard** (Filtre différentiel) pour ne pas déclencher les Flows des boutons dont l'état n'a pas réellement changé.
*   **2. Universal DP Parser (`lib/tuya/TuyaEF00Manager.js`)** :
    *   **Action** : Router les DP du cluster `0xEF00` vers le bouclier `handleGangReport` avant tout enregistrement de capacité.
*   **3. Hook TS004F Forcé** :
    *   **Action** : Écouter `onEndDeviceAnnounce` et forcer l'attribut `0x8004` à `1` pour verrouiller le mode Scène.

---

## 📡 PHASE 3 : Le Moteur WiFi "Local-Direct"
Communication LAN instantanée (AES-128) avec Cloud en amorçage uniquement.

*   **1. Pairing Sandbox (`drivers/.../pair/configure.html`)** :
    *   **Action** : UI à 5 onglets, QR Code généré en backend (Base64), détection `Homey.isMobile`.
    *   **Waterfall Auth** : Cascade de login régional (EU -> US -> CN -> IN).
*   **2. Zero-Trust TCP Probe (`lib/tuya-local/TuyaLocalDriver.js`)** :
    *   **Action** : Forcer un handshake TCP sur le port `6668` avant d'autoriser l'ajout d'un appareil manuel dans Homey.
*   **3. Token Rotation** :
    *   **Action** : Cron job dans `app.js` pour renouveler le `refresh_token` tous les 15 jours en arrière-plan.

---

## 🌌 PHASE 4 : Le Pont "Shadow-Pulsar" (Hybridation)
Synchronisation unidirectionnelle (Zigbee -> Homey -> Cloud) sécurisée.

*   **1. Singleton Throttler (`lib/tuya-local/TuyaShadowPulsar.js`)** :
    *   **Logique** : Leaky Bucket (1 requête / 2 sec). Déduplication et priorisation des actions critiques (On/Off).

### 🪞 Shadow-Pulsar : Le Pont de Verre (Mirroring)
Le Shadow-Pulsar permet la synchronisation optionnelle vers le Cloud Tuya (Smart Life).
- **Doctrine de Sécurité (v7.0.22)** :
    - **Opt-In Double** : Activé via réglages App (Global) + `tuya_shadow_id` (Device).
    - **Quota Shield** : Filtre "Deadband" sur les capteurs (Temp: 0.5, Humi: 5) pour diviser par 10 le trafic API.
    - **Batching Pulse** : Regroupe les DPs par appareil toutes les 2 secondes (max 3 appareils/pulse).
    - **Anti-Echo Logic** : Empêche les boucles de rétroaction infinies.
*   **2. Echo Filter (`lib/tuya-local/TuyaWiFiHybridManager.js`)** :
    *   **Logique** : Si reçu du Cloud === envoyé localement (< 2500ms), détruire le message pour stopper le "Ping-Pong".
*   **3. Mixins de Résilience** :
    *   **BVB (Bizarre Value Blocking)** : Ignorer les chutes de valeurs absurdes (ex: 0%).
    *   **TX/RX Mutex** : Verrou de 800ms sur les envois locaux pour ignorer les confirmations matérielles immédiates.

---

### 🛡️ MANDATS GOUVERNANCE (ANTIGRAVITY RULES) :
1.  **Code Complet** : Pas de placeholders. Tout parser binaire doit être implémenté.
2.  **SDK 3 Only** : Utilisation exclusive de `this.homey.*`. Pas de résidus SDK 2.
3.  **Local-First** : Priorité absolue TCP/Zigbee. Le Cloud est un miroir, pas un canal de commande principal.
4.  **Schema Enforcement** : Toute modification manifest doit être validée par `ajv-cli`.
