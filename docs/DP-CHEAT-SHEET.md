# 🧩 Universal Tuya Zigbee – DP Cheat-Sheet (v1.0)

> Cette page résume **les patterns de Data-Points (DP) les plus fréquents** dans l'écosystème **Tuya Zigbee**.
> ⚠️ Un **DP n'est pas normé** : sa signification dépend du **produit** (schéma Tuya IoT).
> Utilise cette table comme **fallback heuristique** uniquement si **pas de match officiel**.

---

## ⚠️ IMPORTANT: Vérité de Base

**Il n'existe PAS de table officielle DP 1–255 universelle.**

Chez Tuya:
- Un **DP = fonction logique d'un produit**, définie dans le **schéma JSON** sur la **Tuya IoT Platform**
- Le **même DP 1** peut être:
  - `switch_1` sur une prise
  - `alarm` sur un capteur
  - `start` sur une machine
- **Source unique de vérité**: PID → JSON schema sur [Tuya IoT Platform](https://iot.tuya.com)

---

## 🔍 Niveaux de Confiance

| Niveau | Source | Utilisation |
|--------|--------|-------------|
| **0 — Official** | Schéma Tuya IoT (PID) | **Prioritaire** |
| **1 — Community** | Z2M, ZHA, deCONZ | **Référence** |
| **2 — Heuristic** | Table ci-dessous | **Dernier recours** |

### Dans ton app Universal Tuya Zigbee:

```
1. Chercher d'abord: PID → JSON schema officiel
2. Sinon: Z2M/ZHA/deCONZ converter
3. Fallback: Table heuristique (ce document)
```

---

## ✅ DP Ultra-Fréquents (Confidence: Community/Heuristic)

| DP | Type | Range | Capacité Homey | Exemples | Cluster ZCL |
|----|------|-------|----------------|----------|-------------|
| **1** | bool | 0,1 | `onoff` | TS0001, TS0002, SNZB-01 | 0x0006 |
| **2** | enum | 0-2 | `windowcoverings_state` | TS0601_cover, MS-108 | 0x0102 |
| **3** | value | 0-100% | `windowcoverings_set` | curtain motors | 0x0102 |
| **4** | value | 0-1000 (÷10) | `target_temperature` | BHT-002, BRT-100 | 0x0201 |
| **5** | bool | 0,1 | `alarm_motor` | curtain, lock | — |
| **10** | value | 0-100 | `measure_battery` | sensors | 0x0001 |
| **13** | bool | 0,1 | `child_lock` | plugs, thermostats | — |
| **101** | value | 0-1000 (÷10) | `measure_temperature` | climate monitors | 0x0402 |
| **102** | value | 0-1000 (÷10) | `measure_humidity` | climate monitors | 0x0405 |
| **108** | bool | 0,1 | `child_lock` (alt) | plugs, switches | — |

---

## 🌡️ Capteurs Climatiques

| DP | Type | Range | Unit | Capability | Note |
|----|------|-------|------|------------|------|
| **101** | value | 0-1000 | °C×10 | `measure_temperature` | Diviser par 10 |
| **102** | value | 0-1000 | %×10 | `measure_humidity` | Diviser par 10 |
| **103** | value | 0-2000 | hPa×100 | `measure_pressure` | Diviser par 100 |
| **119** | value | 0-65535 | lux | `measure_luminance` | Direct |

---

## 🪟 Volets / Rideaux

| DP | Type | Values | Capability | Note |
|----|------|--------|------------|------|
| **2** | enum | 0=open, 1=stop, 2=close | `windowcoverings_state` | Très stable |
| **3** | value | 0-100% | `windowcoverings_set` | Position |
| **4** | value | 0-100% | `windowcoverings_tilt_set` | Angle lamelles |
| **5** | bool | 0,1 | `alarm_motor` | Protection moteur |

---

## 🔥 Thermostats

| DP | Type | Range | Capability | Note |
|----|------|-------|------------|------|
| **1** | bool | 0,1 | `onoff` | Marche/arrêt |
| **2** | enum | 0-3 | `thermostat_mode` | Mode (auto/heat/cool/off) |
| **4** | value | 50-350 | `target_temperature` | ÷10, parfois DP 16 |
| **24** | raw | N bytes | — | Programme hebdo |

---

## 🌬️ Qualité de l'Air

| DP | Type | Range | Unit | Capability |
|----|------|-------|------|------------|
| **114** | value | 0-5000 | ppm | `measure_co2` |
| **115** | value | 0-500 | µg/m³ | `measure_pm25` |
| **116** | value | 0-500 | µg/m³ | `measure_pm10` |
| **117** | value | 0-1000 | ppb | `measure_voc` |
| **118** | value | 0-100 | µg/m³ | `measure_ch2o` |

---

## 🧪 DPs Exotiques (Observés, NON Garantis)

| DP | Type | Usage | Vu sur | Confiance |
|----|------|-------|--------|-----------|
| **240–242** | mixed | MCU test, boot-counter, reset-reason | Tuya modules | Heuristic |
| **243–249** | raw/value | RF calib, supply-mV, key-hash, heap | Tuya debug | Heuristic |
| **250–253** | enum/value | Xmas-pattern, frost-limit, valve-protect | Lidl, Moes | Heuristic |
| **254–255** | raw | energy-history, passthrough | Nous, factory | Heuristic |

⚠️ **Ces DPs sont firmware-spécifiques.** Observés via reverse-engineering communautaire uniquement.

---

## 📁 Mapping Clusters ZCL → DPs

| Cluster | Nom | DPs Associés | Usage |
|---------|-----|--------------|-------|
| 0x0000 | Basic | — | HW/SW version |
| 0x0001 | PowerCfg | 10, 100 | Batterie |
| 0x0006 | OnOff | 1 | Interrupteur |
| 0x0008 | LevelCtrl | 3 | Dimmer |
| 0x0102 | WindowCovering | 2, 3, 5 | Volets |
| 0x0201 | Thermostat | 4, 101 | HVAC |
| 0x0300 | ColorCtrl | 111, 112, 113 | RGB |
| 0x0402 | Temperature | 101 | Capteur temp |
| 0x0405 | Humidity | 102 | Capteur hum |
| 0x0500 | IASZone | 1 | Alarmes |
| **0xEF00** | **TuyaPrivate** | **TOUS** | Cluster privé Tuya |

---

## 📚 Sources Ouvertes

| Source | URL | Usage |
|--------|-----|-------|
| Z2M Devices | https://www.zigbee2mqtt.io/devices/ | Recherche modelID |
| Z2M Converters | https://github.com/Koenkk/zigbee-herdsman-converters | Code source |
| ZHA Quirks | https://github.com/zigpy/zha-device-handlers | Corrections |
| Blakadder | https://zigbee.blakadder.com | Méta-index |
| Tuya DP Docs | https://developer.tuya.com/en/docs/iot/title?id=K9nmje3twsy7n | Officiel |
| ZCL Spec | https://zigbeealliance.org/developer_resources/zigbee-cluster-library/ | Clusters |

---

## 🛠️ Besoin du Vrai Schéma d'un Produit?

1. Récupère son **PID** (dans l'app Tuya → device info)
2. Va sur [Tuya IoT Platform](https://iot.tuya.com) → Product → Functions
3. Télécharge le **JSON schema** → c'est la **vérité officielle**

---

## 📦 Fichiers Associés

| Fichier | Description |
|---------|-------------|
| `data/dp-patterns.json` | Table JSON structurée avec niveaux de confiance |
| `data/tuya-dp-complete.csv` | Export CSV flat |
| `scripts/enrichment/parse-z2m-tuya-dps.js` | Script parser Z2M |

---

## 🔄 Workflow de Résolution DP

```
┌─────────────────────────────────────────┐
│  Nouveau device détecté                 │
└─────────────────┬───────────────────────┘
                  ▼
┌─────────────────────────────────────────┐
│  1. PID connu?                          │
│     → Charger schema Tuya IoT           │
│     → OFFICIAL (100% fiable)            │
└─────────────────┬───────────────────────┘
                  │ Non
                  ▼
┌─────────────────────────────────────────┐
│  2. Match Z2M/ZHA/deCONZ?               │
│     → Utiliser converter                │
│     → COMMUNITY (très fiable)           │
└─────────────────┬───────────────────────┘
                  │ Non
                  ▼
┌─────────────────────────────────────────┐
│  3. Patterns connus?                    │
│     → Utiliser dp-patterns.json         │
│     → HEURISTIC (fallback)              │
└─────────────────┬───────────────────────┘
                  │ Non
                  ▼
┌─────────────────────────────────────────┐
│  4. Mode découverte                     │
│     → Log raw DP traffic                │
│     → Demander contribution utilisateur │
└─────────────────────────────────────────┘
```

---

**Version**: 1.0
**Dernière mise à jour**: 2025-12-02
