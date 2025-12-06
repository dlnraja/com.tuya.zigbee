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

# 12. Smart Category Placement & Driver Folder Auto-Selection

When adding or updating fingerprints, the AI MUST place each device inside the correct driver folder according to its REAL functional category.

**A device MUST NEVER be placed in the wrong type of driver.**
This prevents catastrophic collisions (TS0601, TS0002, TS011F, etc.).

## 12.1. Allowed Categories & Folder Mapping

| Category | Description | Clusters | Folder Pattern |
|----------|-------------|----------|----------------|
| **Switches/Relays** | ON/OFF, multi-gang, relays | `onOff`, `levelControl` | `/drivers/switch_xxx/` |
| **Plugs/Energy** | Smart plugs, USB, energy | `onOff`, `metering`, `electricalMeasurement` | `/drivers/plug_xxx/` |
| **Lights/Dimmers** | Bulbs, RGB, WW/CW, dimmers | `levelControl`, `colorControl`, `onOff` | `/drivers/bulb_xxx/`, `/drivers/dimmer_xxx/` |
| **Sensors (Env)** | Temp, humidity, lux, VOC | `temperatureMeasurement`, `relativeHumidity` | `/drivers/climate_sensor/` |
| **Motion/Presence** | PIR, mmWave, radar | `occupancySensing`, Tuya DP | `/drivers/motion_sensor/`, `/drivers/presence_sensor_xxx/` |
| **Soil/Agriculture** | Soil moisture, temp | Tuya DP only | `/drivers/soil_sensor/` |
| **Thermostats/TRV** | Radiator valves, HVAC | DPs: mode, setpoint, temp | `/drivers/thermostat_xxx/`, `/drivers/radiator_valve/` |
| **Alarms/Sirens** | Sirens, SOS, smoke | `iasZone`, `iasWD` | `/drivers/siren/`, `/drivers/smoke_detector_xxx/` |
| **Covers** | Curtains, blinds, shutters | `windowCovering` | `/drivers/curtain_xxx/`, `/drivers/shutter_xxx/` |
| **Buttons** | Scene switches, remotes | `genScenes`, Tuya DP | `/drivers/button_xxx/`, `/drivers/scene_switch_xxx/` |

---

## 12.2. Smart Driver Assignment Rules

Before assigning a device to a folder, AI MUST verify:

1. **Does the cluster layout match the folder category?**
2. **Do the DPs match the behaviour expected for that category?**
3. **Does Zigbee2MQTT classify this device in the same category?**
4. **Do Homey logs confirm the device behaviour?**

**If ANY check fails:**
→ DO NOT assign the device to this driver
→ Mark it "needs manual categorisation"

---

## 12.3. Safe Rule: Maximum ManufacturerName Expansion

> **ManufacturerName lists MUST be expanded as much as possible,
> to include ALL known Tuya manufacturer variants,
> but WITHOUT causing collisions with existing drivers.**

### Why?
Tuya produces the **same device** with many variations of `_TZE200_xxxxxx` or `_TZ3000_xxxxxx`.

### AI MUST:
- Collect ALL manufacturerName variants for a given device category
- Example for a TRV: `_TZE200_b6wax7g0`, `_TZE200_2atgpdho`, `_TZE200_fhn3negr`, etc.
- Add them into the SAME driver IF and ONLY IF:
  - Clusters match
  - DPs match
  - Z2M/ZHA confirm same behaviour
  - No existing driver already handles the pair

### AI MUST NOT:
- Add manufacturerName from a different category
- Merge unrelated devices
- Add a manufacturerName that conflicts with another driver's fingerprint

---

## 12.4. ProductId Expansion Rules (Advanced)

### The AI MUST:
- Add ALL confirmed `productId` values for a device family
- BUT ONLY IF:
  - `manufacturerName+productId` pair is unique
  - Category matches
  - No conflict with another driver
  - Device behaviour is identical

### ❌ BAD (Forbidden)
```json
"productId": ["TS0601"]
```
Forbidden because TS0601 covers 20+ unrelated devices.

### ✅ GOOD (Allowed)
```json
"manufacturerName": ["_TZE200_fhn3negr", "_TZE200_b6wax7g0"],
"productId": ["TS0601"]
```
Allowed only if ALL manufacturerNames correspond to the same device family (e.g., TRV thermostats).

---

## 12.5. Automatic Driver Folder Creation (If Missing)

If a device does not fit ANY existing folder:

**AI MUST:**
1. Create a new driver folder with correct naming: `/drivers/<category_device_name>/`
2. Add the multi-language naming block
3. Create:
   - `driver.compose.json`
   - `device.js`
   - `capabilities` folder if needed
4. Add a TODO note if DPs are incomplete

---

## 12.6. Priority Order: Category → Manufacturer → ProductId

**Always follow this exact order:**

1️⃣ Determine device **category** from clusters & DPs
2️⃣ Locate the **driver folder** that matches this category
3️⃣ Expand **manufacturerName** list to include ALL variants for this device family
4️⃣ Add **productId** ONLY when fully validated
5️⃣ Check **uniqueness** across all drivers
6️⃣ Apply changes only if **100% safe**

**If NOT 100% sure → DO NOTHING and mark as ambiguous.**

---

## 12.7. Final Golden Rule

> **A device MUST be placed in the correct category FIRST.**
> **Fingerprints MUST then be enriched safely using:**
> - **manufacturerName MAXIMALLY** (all variants)
> - **productId MINIMALLY but PRECISELY** (only when safe)

---

# 13. NON-REGRESSION & COVERAGE PROTECTION (VITAL)

**"Le mieux est l'ennemi du bien"** - This section prevents losing device coverage during updates.

## 13.1. The Real Risk

### ❌ DANGER SCENARIO
```json
// BEFORE: Works "by chance" for many variants
"manufacturerName": ["_TZ3000_abcde"],
// No productId → Homey accepts ALL modelIds for this manufacturer

// AFTER: Too restrictive!
"manufacturerName": ["_TZ3000_abcde"],
"productId": ["TS011F"]
// RISK: If user has _TZ3000_abcde with modelId TS0001, it STOPS WORKING!
```

## 13.2. The Solution: Expansion, NOT Restriction

When adding productId to a driver that previously had none:
> **The list MUST be EXHAUSTIVE based on Z2M/community data.**

### ❌ BAD (Too Risky)
```json
"manufacturerName": ["_TZ3000_abcde"],
"productId": ["TS011F"]
// RISK: Missing variants will break!
```

### ✅ GOOD (Safe Coverage)
```json
"manufacturerName": ["_TZ3000_abcde"],
"productId": ["TS011F", "TS0001", "TS0003"]
// SAFE: All known variations covered
```

## 13.3. Non-Regression Rules

### Rule 1: Do NOT Delete Existing Manufacturers
Unless a manufacturer is clearly in the WRONG functional folder (e.g., Smoke Detector in Light driver):
**NEVER remove a manufacturerName that already exists.**

### Rule 2: The "Unknown Variant" Safety Net
If you find a manufacturerName in existing code but CANNOT confirm its productId in Z2M/GitHub:

**Option A (Preferred):** Keep it in the list, add comment:
```json
"manufacturerName": [
  "_TZ3000_abcde",
  "_TZ3000_unknown"  // TODO: Verify productId - keeping for backward compatibility
]
```

**Option B (Legacy Mode):** If strict productId filtering risks breaking unknown versions:
- Keep productId array broad/inclusive for that manufacturer
- Or create a separate "legacy" entry

### Rule 3: Exhaustive ProductId When Adding
If you ADD a productId array to a driver that had NONE:
```json
// BEFORE (no productId)
"manufacturerName": ["_TZ3000_abcde"]

// AFTER (MUST list ALL known variants)
"manufacturerName": ["_TZ3000_abcde"],
"productId": ["TS011F", "TS0001", "TS0121"]  // ALL variants from Z2M
```

### Rule 4: Conflict Check Before Save
Before saving ANY change, verify:
- `manufacturerName + productId` combinations are UNIQUE across entire `/drivers/` directory
- No duplicate pairs in different drivers

## 13.4. Common AI Mistakes to REJECT

### ❌ REJECT: Single productId without exhaustive list
```json
"productId": ["TS0601"]  // WRONG: Missing other variants
```

### ❌ REJECT: Mixing productId and manufacturerName
```json
"productId": ["TS0601", "_TZE200_aaaaa"]  // WRONG: _TZE is manufacturerName!
```

### ❌ REJECT: Removing existing manufacturerName
```json
// BEFORE: Had 10 manufacturers
// AFTER: Only 3 manufacturers
// WRONG: Lost 7 manufacturers = 7 potential broken devices!
```

### ✅ ACCEPT: Expansion only
```json
// BEFORE: 10 manufacturers, no productId
// AFTER: 12 manufacturers (added 2), productId with ALL variants
// CORRECT: Only additions, exhaustive productId
```

## 13.5. Validation Checklist Before Any Change

- [ ] No manufacturerName removed (unless clearly wrong category)
- [ ] If productId added, list is EXHAUSTIVE from Z2M
- [ ] No duplicate `(mfr, pid)` pairs across drivers
- [ ] Category matches device function
- [ ] Existing working devices will NOT break

---

# 14. Règles de Placement (FR)

## 14.1. Règle du Couple Sacré
- JAMAIS ajouter un productId sans vérifier le manufacturerName associé
- C'est la COMBINAISON qui compte

## 14.2. Expansion Maximale des ManufacturerNames
- Collecter TOUS les variants connus pour une famille d'appareils
- Les ajouter au MÊME driver SI ET SEULEMENT SI:
  - Les clusters correspondent
  - Les DPs correspondent
  - Z2M/ZHA confirment le même comportement
  - Aucun conflit avec un autre driver

## 14.3. Expansion Minimale des ProductIds
- Ajouter UNIQUEMENT quand:
  - La paire `manufacturerName+productId` est unique
  - La catégorie correspond
  - Aucun conflit
  - Comportement identique vérifié

## 14.4. Ordre de Priorité
```
1. CATÉGORIE (clusters + DPs) → Quel type d'appareil?
2. DOSSIER (driver folder) → Où le placer?
3. MANUFACTURERNAME (expansion) → Tous les variants
4. PRODUCTID (validation) → Seulement si sûr à 100%
```

## 14.5. Règle Finale
- Appareil = Bonne catégorie D'ABORD
- ManufacturerName = MAXIMAL (tous les variants)
- ProductId = MINIMAL mais PRÉCIS

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
