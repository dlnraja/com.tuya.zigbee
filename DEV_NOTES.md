# Developer Notes - Fingerprinting Rules

## 9. Strict Fingerprinting Rules (manufacturerName + productId/modelId)

When handling Zigbee fingerprinting in `com.dlnraja.tuya.zigbee`, you MUST respect the following rules.
The goal is to avoid random matches and "first driver wins" behaviour.

### 9.1. Matching Logic (What Homey Actually Uses)

- Homey selects a Zigbee driver based on:
  - `zigbee.manufacturerName` (manufacturerName from device),
  - AND `zigbee.productId` (modelId / zigbeeModel from device),
  - plus Zigbee profileId/deviceId when present.
- In this project, assume:
  - `manufacturerName`  ≈ e.g. `"_TZE284_vvmbj46n"`
  - `productId`        ≈ `modelId` / `zigbeeModel` (e.g. `"TS0601"`, `"TS0002"`)

You MUST NOT rely on `manufacturerName` alone when several different devices share the same Tuya manufacturer prefix.

---

### 9.2. Golden Rule

> **Do NOT "just take the first productId you find".
> Always verify it against the existing drivers and the real device type.**

Any automation / script that enriches drivers MUST:

1. Check the **type of device** (switch, plug, sensor, TRV, etc.).
2. Check if the **same `(manufacturerName, productId)` pair** already exists in another driver.
3. Only add `productId` when it clearly disambiguates, and does NOT conflict with a working driver.

---

### 9.3. Where to Get `productId` (modelId) From

When adding / fixing `productId` values, you may use:

1. **Homey Developer Tools / Zigbee nodes**:
   - Use the device's actual `modelId` as the primary source.
2. **Community data (logs, crash reports, forum posts)**:
   - Use manufacturerName + modelId combinations explicitly shown in logs.
3. **External ecosystems (Zigbee2MQTT, ZHA, etc.)**:
   - Only as hints to confirm or cross-check a modelId,
   - NEVER as the sole source if it contradicts real Homey logs.

If Homey logs and Z2M disagree, **Homey logs win**.

---

### 9.4. Adding `productId` to a Driver – Safe Procedure

Before you add or modify `zigbee.productId` in any driver:

1. **Identify the driver's intent**:
   - What kind of device is this driver for? (e.g. "2-gang switch", "climate sensor", "radar mmWave")
2. **Scan all drivers** in the app:
   - Look for any driver that already declares:
     - the same `manufacturerName`,
     - AND the same `productId` / `modelId`.
3. **Conflict handling**:
   - If another driver already handles `(manufacturerName, productId)` and is known to work:
     - DO NOT reuse this `(manufacturerName, productId)` in a different driver.
     - If the mapping is wrong, fix the existing driver instead of duplicating.
   - If no driver handles this `(manufacturerName, productId)` yet:
     - You MAY add it to the current driver, but only if the device type matches.

---

### 9.5. Handling Generic Tuya Chips (TS0601, TS0002, etc.)

Tuya often reuses generic `modelId`s like `TS0601` for many totally different devices.
To avoid chaos:

- Never assume that:
  - `manufacturerName = _TZE284_xxx`
  - `productId = TS0601`
  means "it is the same device as the other TS0601 we already know".
- Instead, you MUST also check:
  - Reported clusters,
  - Observed DPs / capabilities (soil, climate, radar, plug, etc.),
  - User description / screenshots.

If two devices share `(manufacturerName, productId)` but behave differently, treat it as a **data conflict** and:

- Prefer the behaviour confirmed by the majority of reports,
- Add clear comments / TODOs in code and DO NOT blindly overwrite a working mapping.

---

### 9.6. When You Are Not Sure

If there is any ambiguity about the correct `productId` → driver mapping:

- Do NOT add or change `productId`.
- Leave the driver as-is and:
  - Log the full fingerprint (`manufacturerName`, `modelId`, clusters, DPs),
  - Add a TODO comment with the conflicting information,
  - Prefer a generic / debug driver over a wrong specific driver.

Wrong fingerprinting is worse than partially generic support.

---

### 9.7. Refactoring Existing Drivers

When cleaning up / enriching existing drivers:

1. For drivers that only have `manufacturerName` and no `productId`:
   - Try to add `productId` **only** if you can identify the exact device type and there is no existing conflict.
2. For drivers with overly broad fingerprints:
   - Consider splitting them into multiple drivers (e.g. soil vs climate vs radar), each with:
     - Clear `(manufacturerName, productId)` lists,
     - Correct capabilities per device type.
3. After any change, always ensure:
   - No duplicate `(manufacturerName, productId)` across drivers,
   - No unused or dead drivers that silently "steal" devices.

---

# Notes Développeur - Règles de Fingerprinting (FR)

## Règle d'Or

> **NE PAS "prendre le premier productId trouvé".
> Toujours vérifier par rapport aux drivers existants et au type réel de l'appareil.**

## Logique de Matching Homey

Homey sélectionne un driver Zigbee basé sur:
- `zigbee.manufacturerName` (ex: `"_TZE284_vvmbj46n"`)
- ET `zigbee.productId` (= modelId, ex: `"TS0601"`, `"TS0002"`)
- Plus profileId/deviceId Zigbee si présents

## Procédure Sécurisée pour Ajouter productId

1. **Identifier l'intention du driver** - Quel type d'appareil?
2. **Scanner tous les drivers** - Chercher si `(manufacturerName, productId)` existe déjà
3. **Gestion des conflits**:
   - Si un autre driver gère déjà cette paire et fonctionne → NE PAS dupliquer
   - Si aucun driver ne gère cette paire → OK si le type correspond

## Sources de productId (Priorité)

1. **Homey Developer Tools** - Source primaire (logs réels)
2. **Données communauté** - Logs, crash reports, posts forum
3. **Z2M / ZHA** - Uniquement pour confirmer, jamais comme source unique

**Si Homey et Z2M divergent → Homey gagne**

## Cas Spéciaux TS0601

TS0601 est réutilisé pour des appareils totalement différents!
- NE JAMAIS supposer que deux `_TZE284_xxx` + `TS0601` sont identiques
- Toujours vérifier: clusters, DPs, capabilities, description utilisateur

## En Cas de Doute

- NE PAS ajouter/modifier productId
- Logger le fingerprint complet
- Ajouter un TODO avec les infos conflictuelles
- Préférer un driver générique à un mauvais driver spécifique

**Un mauvais fingerprinting est pire qu'un support partiellement générique.**

---

---

# 10. TS0601 Trap - The Tuya "Catch-All" Problem

## 10.1. What is TS0601?

TS0601 is a **generic modelId** used by Tuya for COMPLETELY DIFFERENT devices:
- Thermostatic valves (TRV)
- mmWave presence sensors
- Alarm sirens
- Curtain controllers
- Soil sensors
- And many more...

## 10.2. Catastrophe Scenario (What to AVOID)

If you blindly add:
```json
"productId": ["TS0601"]
```
...to a "Motion Sensor" driver, ALL thermostats, sirens, and TRVs with TS0601 will try to pair as motion sensors. **CHAOS.**

## 10.3. Safe Structure Examples

### Case A: Unique Device (Safe)
```json
// /drivers/tuya_plug_simple/driver.compose.json
{
  "zigbee": {
    "manufacturerName": ["_TZ3000_okaz980k"],
    "productId": ["TS011F"]  // TS011F = almost always a plug, safe
  }
}
```

### Case B: Complex Device (The Trap)
**NEVER put TS0601 alone. ALWAYS couple with specific manufacturerName.**

```json
// /drivers/tuya_thermostat/driver.compose.json
{
  "zigbee": {
    "manufacturerName": ["_TZE200_hue3yfsn", "_TZE200_b6wax7g0"],
    "productId": ["TS0601"]
    // Homey matches: IF manu = hue3yfsn AND prod = TS0601 -> Thermostat
  }
}
```

```json
// /drivers/tuya_mmwave_sensor/driver.compose.json
{
  "zigbee": {
    "manufacturerName": ["_TZE204_sxm7l9xa"],
    "productId": ["TS0601"]
    // Homey matches: IF manu = sxm7l9xa AND prod = TS0601 -> Presence Sensor
  }
}
```

## 10.4. The 3-Pillar Verification Method

### Pillar 1: Source of Truth (Z2M)
- Z2M's `tuya.ts` is the bible
- If Z2M says `_TZE200_aaaa` + `TS0601` = Thermostat → 99.9% true

### Pillar 2: Cluster Verification
Before adding ID to a "Light" driver, verify:
- Does device support `onOff` cluster (0x0006)?
- Does it support `levelControl` (0x0008)?
- If only `basic` + `tuya_specific` → SUSPICIOUS

### Pillar 3: Uniqueness (Anti-Collision)
- Before writing, check if `(manufacturerName, productId)` already exists in another driver

---

# 11. Strict Guidelines for AI Fingerprinting

## 11.1. Sacred Couple Rule
**NEVER add a productId without verifying its associated manufacturerName.**
It's the COMBINATION that matters.

## 11.2. TS0601/TS0001 Danger
If productId is generic (TS0601, TS0001, TS0002):
- **FORBIDDEN** to add it alone
- **MUST** verify in Z2M which device type corresponds to this specific manufacturerName

## 11.3. Category Verification
**DO NOT** add a fingerprint to a driver if device category (e.g., Plug) doesn't match driver category (e.g., Smoke Detector).

## 11.4. Duplicate Detection
Before modifying any driver.compose.json:
- **SCAN ALL** other drivers
- Ensure `(manufacturerName, productId)` pair doesn't exist elsewhere

## 11.5. Existing Priority
If a driver already has a working list:
- **DO NOT DELETE** it
- Only **ADD** new confirmed pairs

## 11.6. Work Method (Required Process)

1. Analyze target driver.compose.json
2. Find orphan manufacturerNames (without productId)
3. Find their real productId via Z2M database
4. **IF AND ONLY IF** type matches → add productId
5. **ALWAYS** run collision detection after changes

---

## Scripts de Validation

| Script | Usage |
|--------|-------|
| `automation/DETECT_COLLISIONS.js` | Détecte les collisions HIGH/MEDIUM |
| `automation/RESOLVE_COLLISIONS.js` | Résout par système de priorité |
| `automation/FETCH_ALL_ZIGBEE.js` | Enrichit depuis Z2M |
| `automation/SAFE_AUDIT.js` | Audit sécurisé (lecture seule) |

## Système de Priorité des Drivers

```
PRIORITY 100: climate_sensor, motion_sensor, contact_sensor, etc. (très spécifiques)
PRIORITY 90:  thermostat_tuya_dp, radiator_valve, curtain_motor
PRIORITY 80:  switch_1gang, plug_smart, bulb_rgb, button_wireless_1
PRIORITY 70:  air_quality_co2, weather_station_outdoor
PRIORITY 10:  generic_tuya
PRIORITY 5:   zigbee_universal (catch-all)
```

Un manufacturerName doit être dans UN SEUL driver (le plus prioritaire).
