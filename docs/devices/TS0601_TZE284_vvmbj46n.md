# Étude Technique - Tuya TS0601 (_TZE284_vvmbj46n)

*Document technique basé sur l'analyse protocolaire avancée*
*Version: 5.5.687 | Date: 2026-01-19*

---

## 1. Identification du Dispositif

| Attribut | Valeur |
|----------|--------|
| **Model ID** | TS0601 |
| **Manufacturer Name** | `_TZE284_vvmbj46n` |
| **Noms commerciaux** | TH05Z, ZTH05Z, ZG227C |
| **Type** | Capteur Température/Humidité avec LCD |
| **Alimentation** | 3x AAA (4.5V) |
| **Protocole** | Zigbee 3.0 + Tuya MCU (cluster 0xEF00) |

---

## 2. Architecture Matérielle "Tuya MCU"

```
┌─────────────────────────────────────────────────────────────────┐
│                     DISPOSITIF TS0601                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐     UART      ┌─────────────────────────┐ │
│  │   MODULE ZIGBEE │◄─────────────►│     MCU APPLICATIF      │ │
│  │  (Silicon Labs/ │               │                         │ │
│  │   Telink)       │               │  - Pilote LCD           │ │
│  │                 │               │  - Interface capteur    │ │
│  │  Clusters:      │               │  - Gestion boutons      │ │
│  │  - Basic (0x00) │               │  - Surveillance batterie│ │
│  │  - Power (0x01) │               │  - Logique Data Points  │ │
│  │  - Tuya (0xEF00)│               │                         │ │
│  └─────────────────┘               └─────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Principe**: Le module Zigbee agit comme un **tunnel transparent** - il encapsule les paquets série du MCU en trames Zigbee sans les interpréter.

---

## 3. Protocole Tuya (Cluster 0xEF00)

### 3.1 Structure des Trames

| Champ | Taille | Description |
|-------|--------|-------------|
| TSN | 2 octets | Transaction Sequence Number |
| Command ID | 1 octet | Type d'opération |
| Data Length | 2 octets | Longueur du payload |
| Payload | N octets | Data Points (DPs) |

### 3.2 Commandes Principales

| Command | ID | Direction | Description |
|---------|-----|-----------|-------------|
| Status Report | 0x01 | Device → Coordinator | Rapport d'état DP |
| Data Set | 0x02 | Coordinator → Device | Configuration DP |
| **Time Sync** | **0x24** | Bidirectionnel | **Synchronisation horloge** |

---

## 4. Cartographie Complète des Data Points (DPs)

### 4.1 DPs de Mesure

| DP | Fonction | Type | Échelle | Notes |
|----|----------|------|---------|-------|
| **1** | Température | Valeur | ÷10 | 255 → 25.5°C |
| **2** | Humidité | Valeur | ×1 | 0-100% |
| **4** | Batterie | Valeur | ×2 | Device rapporte 0-50 → 0-100% |

### 4.2 DPs de Configuration

| DP | Fonction | Type | Valeurs | Notes |
|----|----------|------|---------|-------|
| **9** | Unité température | Enum | 0=°C, 1=°F | Affichage LCD |
| **10** | Alarme max temp | Valeur | ÷10 | Seuil haut °C |
| **11** | Alarme min temp | Valeur | ÷10 | Seuil bas °C |
| **12** | Alarme max hum | Valeur | ×1 | Seuil haut % |
| **13** | Alarme min hum | Valeur | ×1 | Seuil bas % |
| **14** | État alarme temp | Enum | 0=OK, 1=Bas, 2=Haut | Lecture seule |
| **15** | État alarme hum | Enum | 0=OK, 1=Bas, 2=Haut | Lecture seule |

### 4.3 DPs d'Optimisation Énergie

| DP | Fonction | Type | Plage | Impact Batterie |
|----|----------|------|-------|-----------------|
| **17** | Intervalle rapport temp | Valeur | 1-120 min | ⚡ Critique |
| **18** | Intervalle rapport hum | Valeur | 1-120 min | ⚡ Critique |
| **19** | Sensibilité temp | Valeur | ÷10 (0.3-1.0°C) | ⚡ Modéré |
| **20** | Sensibilité hum | Valeur | 3-10% | ⚡ Modéré |

### 4.4 Configuration Recommandée (Autonomie Maximale)

```
DP17 = 60   (rapport toutes les 60 minutes)
DP18 = 60   (rapport toutes les 60 minutes)
DP19 = 5    (sensibilité 0.5°C)
DP20 = 5    (sensibilité 5%)
```

---

## 5. Synchronisation Temporelle - LE POINT CRITIQUE

### 5.1 Le Bug "Année 2055"

**Problème**: Certains firmwares attendent l'**époque Zigbee (2000)** au lieu de l'**époque Unix (1970)**.

```
Différence = 946 684 800 secondes (30 ans)

Si coordinateur envoie: 1 735 000 000 (Unix 2025)
Et device attend: époque 2000
Résultat affiché: 2000 + 55 ans = 2055 ❌
```

### 5.2 Détection Automatique

```javascript
// Implémentation dans TuyaTimeSync.js
const TUYA_EPOCH_OFFSET = 946684800;

const needsTuyaEpoch = mfr.startsWith('_TZE284') || 
                       mfr.includes('vvmbj46n');

const utcTimestamp = needsTuyaEpoch 
  ? (unixTimestamp - TUYA_EPOCH_OFFSET)  // Époque 2000
  : unixTimestamp;                        // Époque 1970
```

### 5.3 Format du Payload Time Sync (8 octets)

```
┌────────────────────────────────────────────┐
│ Octets 0-3: UTC Timestamp (Big Endian)     │
│ Octets 4-7: Local Timestamp (Big Endian)   │
└────────────────────────────────────────────┘

Exemple pour 2026-01-19 13:00:00 CET (UTC+1):
- UTC (époque 2000): 0x31A2B3C4
- Local: UTC + 3600s
```

---

## 6. Comportement "Sleepy Device"

### 6.1 Cycle de Vie

```
┌─────────────────────────────────────────────────────────────┐
│                    TIMELINE TYPIQUE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SLEEP ──────────────────────────────────────────── SLEEP   │
│    │                                                    │    │
│    ▼                                                    ▼    │
│  [WAKE] ─► Envoie DP1,DP2,DP4 ─► Attend ACK ─► [SLEEP]      │
│    │                                                         │
│    └── Si delta > sensibilité OU timer expiré               │
│                                                              │
│  Durée éveil: ~100ms à 2s                                   │
│  Durée sleep: DP17 minutes (défaut: 5-60 min)               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Implications

- **Commandes retardées**: Une commande (ex: changer unité °C/°F) est mise en file d'attente
- **Délai de réponse**: Peut atteindre plusieurs minutes
- **Time Sync**: Doit être envoyé IMMÉDIATEMENT lors du réveil

---

## 7. Implémentation Homey (Universal Tuya Zigbee)

### 7.1 Driver: `climate_sensor`

```javascript
// drivers/climate_sensor/device.js

get dpMappings() {
  return {
    1: { capability: 'measure_temperature', divisor: 10 },
    2: { capability: 'measure_humidity', divisor: 1 },
    4: { capability: 'measure_battery', transform: (v) => Math.min(v * 2, 100) },
    9: { capability: null, setting: 'temperature_unit' },
    // ... DPs 10-20 pour configuration
  };
}

get needsTuyaEpoch() {
  return this._manufacturerName?.startsWith('_TZE284') ||
         this._manufacturerName?.includes('vvmbj46n');
}
```

### 7.2 Time Sync Automatique

```javascript
// lib/tuya/TuyaTimeSync.js

// Détection automatique de l'époque
const needsTuyaEpoch = mfr.startsWith('_TZE284') || 
                       mfr.startsWith('_TZE204') || 
                       mfr.includes('vvmbj46n');

// Application de l'offset si nécessaire
const utcTimestamp = needsTuyaEpoch 
  ? (unixTimestamp - TUYA_EPOCH_OFFSET) 
  : unixTimestamp;
```

---

## 8. Troubleshooting

| Symptôme | Cause Probable | Solution |
|----------|----------------|----------|
| Heure affiche 2055 | Mauvaise époque | Vérifier `needsTuyaEpoch` |
| Pas de données | Device en sleep | Attendre DP17 minutes |
| Batterie toujours 50% | Diviseur manquant | Appliquer ×2 sur DP4 |
| Température erronée | Diviseur manquant | Vérifier ÷10 sur DP1 |
| Commandes ignorées | Sleepy device | Attendre prochain réveil |

---

## 9. Références

- [Z2M Issue #26078](https://github.com/Koenkk/zigbee2mqtt/issues/26078) - _TZE284_vvmbj46n TH05Z
- [Z2M Issue #19731](https://github.com/Koenkk/zigbee2mqtt/issues/19731) - _TZE200_vvmbj46n
- [Blakadder ZG227C](https://zigbee.blakadder.com/Tuya_ZG227C.html)
- [Tuya Developer Portal](https://developer.tuya.com/) - TS0601 Protocol

---

*Document généré pour Universal Tuya Zigbee App v5.5.687*
*https://github.com/dlnraja/com.tuya.zigbee*
