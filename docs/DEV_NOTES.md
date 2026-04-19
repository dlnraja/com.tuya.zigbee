# Universal Tuya Zigbee - Developer Notes

## Table of Contents

1. [Overview](#1-overview)
2. [Project Structure](#2-project-structure)
3. [Automation Scripts](#3-automation-scripts)
4. [Driver Priority System](#4-driver-priority-system)
5. [Zigbee Fingerprinting Rules](#5-zigbee-fingerprinting-rules)
6. [TS0601 Trap](#6-ts0601-trap)
7. [3-Pillar Validation](#7-3-pillar-validation)
8. [Category Placement](#8-category-placement)
9. [Expansion Rules](#9-expansion-rules)
10. [Non-Regression Protection](#10-non-regression-protection)
11. [Validation Checklist](#11-validation-checklist)
12. [Version Française](#12-version-française)

---

# 1. Overview

**Universal Tuya Zigbee** is a Homey SDK3 app that supports 3743+ Tuya-compatible Zigbee devices.

### Key Stats
- **Manufacturers**: 3,743 unique
- **ProductIds**: 272 unique
- **Drivers**: 83
- **Collisions**: 0

### Supported Brands
- Tuya (all _TZ*, _TY*, _TS* prefixes)
- Moes, Zemismart, Lonsonho, BlitzWolf, Neo, Immax
- Any Tuya OEM / white-label brand

---

# 2. Project Structure

```
com.dlnraja.tuya.zigbee/
 drivers/                    # 83 device drivers
    switch_1gang/          # Switches
    plug_smart/            # Plugs
    bulb_rgb/              # Lights
    climate_sensor/        # Sensors
    motion_sensor/         # Motion
    thermostat_tuya_dp/    # Thermostats
    curtain_motor/         # Covers
    smoke_detector_*/      # Alarms
    generic_tuya/          # Generic (priority 10)
    zigbee_universal/      # Catch-all (priority 5)
 automation/                 # Automation scripts
    MASTER_APPLY_ALL_RULES.js
    DETECT_COLLISIONS.js
    RESOLVE_COLLISIONS.js
    EXHAUSTIVE_ENRICHMENT.js
    SAFE_AUDIT.js
    FETCH_ALL_ZIGBEE.js
 lib/                        # Shared libraries
 assets/                     # App images
 locales/                    # Translations
 DEV_NOTES.md               # This file
```

---

# 3. Automation Scripts

| Script | Purpose | Safe |
|--------|---------|------|
| `MASTER_APPLY_ALL_RULES.js` | Apply ALL rules in one pass |  |
| `DETECT_COLLISIONS.js` | Find HIGH/MEDIUM collisions |  |
| `RESOLVE_COLLISIONS.js` | Resolve by priority system |  |
| `EXHAUSTIVE_ENRICHMENT.js` | Add all productIds from Z2M |  |
| `SAFE_AUDIT.js` | Read-only analysis |  |
| `FETCH_ALL_ZIGBEE.js` | Fetch all Z2M manufacturers |  |

### Usage

```bash
# Apply all rules (recommended)
node automation/MASTER_APPLY_ALL_RULES.js

# Audit only (no changes)
node automation/SAFE_AUDIT.js smoke_detector_advanced

# Check for collisions
node automation/DETECT_COLLISIONS.js

# Validate for publish
npx homey app validate --level publish
```

---

# 4. Driver Priority System

Higher priority = more specific driver. Manufacturers are assigned to highest priority driver only.

```
PRIORITY 100 (Most Specific):
  climate_sensor, motion_sensor, contact_sensor, water_leak_sensor,
  smoke_detector_advanced, presence_sensor_radar, vibration_sensor, soil_sensor

PRIORITY 90:
  thermostat_tuya_dp, radiator_valve, curtain_motor, plug_energy_monitor

PRIORITY 80:
  switch_1gang, switch_2gang, switch_3gang, switch_4gang,
  plug_smart, dimmer_wall_1gang, button_wireless_1, bulb_rgb

PRIORITY 70:
  temphumidsensor, air_quality_co2, weather_station_outdoor

PRIORITY 10:
  generic_tuya

PRIORITY 5 (Catch-all):
  zigbee_universal
```

**Rule**: One manufacturer = ONE driver (the highest priority)

---

# 5. Zigbee Fingerprinting Rules

## 5.1. Homey Matching Logic

Homey selects a driver using:
- `zigbee.manufacturerName` (e.g., `"_TZE284_vvmbj46n"`)
- AND `zigbee.productId` (e.g., `"TS0601"`)
- AND (optional) profileId + deviceId

> **NEVER rely on manufacturerName alone.**
> **ALWAYS use the pair (manufacturerName + productId).**

## 5.2. The Sacred Couple Rule

```json
//  WRONG - manufacturerName alone
"manufacturerName": ["_TZ3000_abcde"]

//  CORRECT - coupled with productId
"manufacturerName": ["_TZ3000_abcde"],
"productId": ["TS011F", "TS0001"]
```

## 5.3. Source Priority

1. **Homey Developer Tools** (PRIMARY) - Real device logs
2. **Community data** (SECONDARY) - Forum posts, crash reports
3. **Z2M / ZHA** (TERTIARY) - Hints only, never sole source

> **If Homey and Z2M disagree  Homey wins.**

---

# 6. TS0601 Trap

## The Problem

TS0601 is a **GENERIC** productId used for COMPLETELY DIFFERENT devices:
- Thermostatic valves (TRV)
- mmWave presence sensors
- Alarm sirens
- Curtain controllers
- Soil sensors
- And 20+ more types!

## Catastrophe Scenario

```json
//  CATASTROPHE - Adding TS0601 alone to motion sensor
// drivers/motion_sensor/driver.compose.json
{
  "zigbee": {
    "manufacturerName": ["_TZE200_xxx"],
    "productId": ["TS0601"]  // ALL TS0601 devices will pair as motion!
  }
}
```

**Result**: Thermostats, sirens, TRVs all try to pair as motion sensors = **CHAOS**

## Safe Structure

```json
//  SAFE - TS0601 coupled with specific manufacturers
// drivers/thermostat_tuya_dp/driver.compose.json
{
  "zigbee": {
    "manufacturerName": ["_TZE200_hue3yfsn", "_TZE200_b6wax7g0"],
    "productId": ["TS0601"]
    // Only these specific manufacturers will match
  }
}

// drivers/presence_sensor_radar/driver.compose.json
{
  "zigbee": {
    "manufacturerName": ["_TZE204_sxm7l9xa"],
    "productId": ["TS0601"]
    // Different manufacturer = different driver
  }
}
```

## Generic ProductIds List

These require extra caution:
- `TS0601` - Tuya DP protocol (most dangerous)
- `TS0001`, `TS0002`, `TS0003`, `TS0004` - Basic switches
- `TS0011`, `TS0012`, `TS0013`, `TS0014` - Wall switches
- `TS011F` - Smart plugs (relatively safe)

---

# 7. 3-Pillar Validation

Before ANY fingerprint change, validate against all 3 pillars:

## Pillar 1: Data Source Validation

Confirm `manufacturerName + productId` using:
1. Homey Zigbee nodes table (PRIMARY)
2. Z2M converters (SECONDARY)
3. ZHA fingerprints (TERTIARY)

## Pillar 2: Cluster & DP Compatibility

| Driver Type | Expected Clusters |
|-------------|-------------------|
| Switch | `onOff`, `levelControl` |
| Plug | `onOff`, `metering`, `electricalMeasurement` |
| Light | `levelControl`, `colorControl`, `onOff` |
| Sensor | `temperatureMeasurement`, `relativeHumidity` |
| Motion | `occupancySensing` |
| Thermostat | Tuya DP (0xEF00) |
| Alarm | `iasZone`, `iasWd` |
| Cover | `windowCovering` |

**If clusters don't match  DO NOT assign**

## Pillar 3: Anti-Collision Check

Before saving:
- Scan ALL drivers
- Ensure `(manufacturerName + productId)` is UNIQUE
- If conflict exists  STOP and resolve

---

# 8. Category Placement

## Category  Folder Mapping

| Category | Clusters | Folder Pattern |
|----------|----------|----------------|
| **Switches** | `onOff`, `levelControl` | `/drivers/switch_*/` |
| **Plugs** | `onOff`, `metering` | `/drivers/plug_*/` |
| **Lights** | `colorControl`, `levelControl` | `/drivers/bulb_*`, `/drivers/dimmer_*` |
| **Sensors** | `temperatureMeasurement` | `/drivers/climate_sensor/` |
| **Motion** | `occupancySensing` | `/drivers/motion_sensor/`, `/drivers/presence_*` |
| **Soil** | Tuya DP | `/drivers/soil_sensor/` |
| **Thermostats** | Tuya DP | `/drivers/thermostat_*`, `/drivers/radiator_*` |
| **Alarms** | `iasZone`, `iasWd` | `/drivers/siren/`, `/drivers/smoke_*` |
| **Covers** | `windowCovering` | `/drivers/curtain_*`, `/drivers/shutter_*` |
| **Buttons** | `genScenes` | `/drivers/button_*`, `/drivers/scene_*` |

## Assignment Rules

1. Determine device CATEGORY from clusters & DPs
2. Select correct DRIVER FOLDER
3. Verify category matches driver purpose
4. **If mismatch  DO NOT assign**

---

# 9. Expansion Rules

## 9.1. ManufacturerName Expansion (MAXIMAL)

> **Expand as much as possible, but only for same device family.**

### AI MUST:
- Gather ALL manufacturerName variants from Z2M
- Add to SAME driver IF clusters & DPs match
- **PRESERVE all existing entries** (non-regression)

### AI MUST NOT:
- Mix unrelated device families
- Remove existing manufacturers
- Merge different device types

### Example
```json
// TRV Thermostat - collect ALL variants
"manufacturerName": [
  "_TZE200_b6wax7g0",
  "_TZE200_2atgpdho",
  "_TZE200_fhn3negr",
  "_TZE200_husqqvux",
  "_TZE204_aoclfnxz"
  // Add ALL known TRV variants
]
```

## 9.2. ProductId Expansion (EXHAUSTIVE)

> **When adding productId, list MUST be EXHAUSTIVE.**

###  Forbidden
```json
"productId": ["TS0601"]  // Single entry = risky
```

###  Required
```json
"productId": ["TS0601", "TS0601_v2", "TS0601_climate"]
// ALL known variants for this device family
```

### Mandatory Rule
If adding productId to a driver that had NONE:
> **MUST add ALL known productIds for all manufacturerNames involved.**

---

# 10. Non-Regression Protection

> **"Le mieux est l'ennemi du bien"**
> **NEVER reduce compatibility.**

## 10.1. The Real Risk

```json
// BEFORE: Works "by chance" for many variants
"manufacturerName": ["_TZ3000_abcde"]
// No productId  Homey accepts ALL modelIds

// AFTER: Too restrictive!
"productId": ["TS011F"]
// RISK: If user has TS0001, it STOPS WORKING!
```

## 10.2. Non-Regression Rules

### Rule 1: NEVER Delete Existing ManufacturerNames
Unless clearly in wrong category, NEVER remove.

### Rule 2: Unknown Variant Safety Net
If manufacturerName exists but productId unknown:
```json
"manufacturerName": [
  "_TZ3000_verified",
  "_TZ3000_unknown"  // TODO: Verify - keep for compatibility
]
```

### Rule 3: Exhaustive ProductId
When adding productId to driver that had none:
- List MUST include ALL known variants
- Use Z2M database as reference

### Rule 4: Conflict Check
Before saving ANY change:
- Verify unique pairs across ALL drivers
- No duplicates allowed

## 10.3. AI Mistakes to REJECT

| Mistake | Example | Why Wrong |
|---------|---------|-----------|
| Single productId | `["TS0601"]` | Missing variants |
| Mixing types | `["TS0601", "_TZE200_xxx"]` | _TZE is manufacturerName! |
| Removing mfr | 10  3 manufacturers | Lost devices |
| Wrong category | Smoke in Light driver | Collision |

---

# 11. Validation Checklist

Before ANY change, verify:

- [ ] No manufacturerName removed (unless wrong category)
- [ ] If productId added, list is EXHAUSTIVE
- [ ] No duplicate `(mfr, pid)` pairs across drivers
- [ ] Category matches device function
- [ ] 3-Pillar validation passed
- [ ] Existing working devices will NOT break
- [ ] `npx homey app validate --level publish` passes

---

# 12. Version Française

## Règles de Fingerprinting

### Logique de Matching Homey
- `manufacturerName` + `productId` = Paire obligatoire
- JAMAIS se fier au manufacturerName seul

### Piège TS0601
- TS0601 = ID GÉNÉRIQUE pour 20+ types d'appareils
- TOUJOURS coupler avec manufacturerName spécifique

### Règles d'Expansion
- **ManufacturerName = MAXIMAL** (tous les variants)
- **ProductId = EXHAUSTIF** (toutes les variantes connues)

### Protection Non-Régression
- JAMAIS supprimer de manufacturerName existant
- JAMAIS réduire la compatibilité
- En cas de doute  GARDER

### Ordre de Priorité
```
1 CATÉGORIE  Quel type d'appareil?
2 DOSSIER  Où le placer?
3 MANUFACTURERNAME  Expansion maximale
4 PRODUCTID  Exhaustif mais sûr
5 VALIDATION  Pas de collision
```

### Principe d'Or
> **Le fingerprinting DOIT maximiser la compatibilité, JAMAIS la réduire.**
> **Un mauvais fingerprinting est pire qu'un fingerprinting manquant.**

---

# Quick Reference Card

```

              FINGERPRINTING QUICK REFERENCE                  

                                                              
   DO:                                                      
      Always use (manufacturerName + productId) pair         
      Expand manufacturerName MAXIMALLY                      
      Expand productId EXHAUSTIVELY                          
      Check 3 pillars before any change                      
      Run DETECT_COLLISIONS.js after changes                 
                                                              
   DON'T:                                                   
      Add TS0601 alone                                       
      Remove existing manufacturerNames                      
      Mix manufacturerName in productId array                
      Add single productId without checking variants         
      Place device in wrong category                         
                                                              
   COMMANDS:                                                
     node automation/MASTER_APPLY_ALL_RULES.js               
     node automation/SAFE_AUDIT.js [driver_name]             
     node automation/DETECT_COLLISIONS.js                    
     npx homey app validate --level publish                  
                                                              

```
