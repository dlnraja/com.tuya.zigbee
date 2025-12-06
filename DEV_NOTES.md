# Developer Notes - ULTRA-STRICT ZIGBEE FINGERPRINTING RULESET

## 9. UNIVERSAL STRICT ZIGBEE FINGERPRINTING RULES
**(Mandatory for ALL AI actions: generation, enrichment, refactor, merging)**

This section defines the definitive rules for safely handling fingerprinting inside `com.dlnraja.tuya.zigbee`.

**These rules are ABSOLUTE and NON-NEGOTIABLE.**

---

## 9.1. True Homey Matching Logic (Authoritative)

Homey selects the correct driver using:
- `zigbee.manufacturerName`
- AND `zigbee.productId` (zigbee modelId, e.g. "TS0601")
- AND (if available) profileId + deviceId

Therefore:

> **NEVER rely on manufacturerName alone.**
> **ALWAYS rely on the pair `(manufacturerName + productId)`.**

---

## 9.2. Tuya Generic IDs (TS0601 / TS0001 / TS0002 / TS011F)

Tuya reuses these IDs for DOZENS of unrelated devices.

Therefore:

> **TS0601 MUST NEVER be added alone.**
> **TS0601 MUST be paired with manufacturerName AND validated.**

AI MUST confirm device type, clusters and DP behaviour.

---

## 9.3. Smart Category Placement (Correct Driver Folder Selection)

AI MUST determine the REAL device category FIRST, then assign fingerprints to the correct driver folder accordingly.

### Folder Mapping

| Category | Folder Pattern | Clusters |
|----------|----------------|----------|
| **Switches / Relays** | `/drivers/switch_xxx/` | `onOff`, `levelControl` |
| **Plugs / Energy** | `/drivers/plug_xxx/` | `onOff`, `metering`, `electricalMeasurement` |
| **Lights / Dimmers** | `/drivers/bulb_xxx/`, `/drivers/dimmer_xxx/` | `levelControl`, `colorControl`, `onOff` |
| **Motion / mmWave** | `/drivers/motion_sensor/`, `/drivers/presence_sensor_xxx/` | `occupancySensing`, Tuya DP |
| **Environmental Sensors** | `/drivers/climate_sensor/` | `temperatureMeasurement`, `relativeHumidity` |
| **Soil / Misc Sensors** | `/drivers/soil_sensor/` | Tuya DP only |
| **Thermostats / TRV** | `/drivers/thermostat_xxx/`, `/drivers/radiator_valve/` | Tuya DP (mode, setpoint, temp) |
| **Alarms / SOS / Smoke** | `/drivers/siren/`, `/drivers/smoke_detector_xxx/` | `iasZone`, `iasWD` |
| **Covers** | `/drivers/curtain_xxx/`, `/drivers/shutter_xxx/` | `windowCovering` |
| **Buttons** | `/drivers/button_xxx/`, `/drivers/scene_switch_xxx/` | `genScenes`, Tuya DP |

**A device MUST NEVER be placed in a mismatched category.**

---

## 9.4. 3-Pillar Validation System (Mandatory Before Any Edit)

### **Pillar 1 – Data Source Validation**
AI MUST confirm `manufacturerName + productId` using:
1. **Homey Zigbee nodes table** (PRIMARY)
2. **Z2M converters** (SECONDARY)
3. **ZHA fingerprints** (TERTIARY)

### **Pillar 2 – Cluster & DP Compatibility**
AI MUST check that:
- SWITCH driver → has `onOff` / `levelControl`
- SENSOR driver → has measurement clusters or DP sensors
- PLUG driver → has `metering` / `electricalMeasurement`
- THERMOSTAT → has TRV / DP setpoints
- ALARM → has IAS clusters

**If behaviour/DPs mismatch → DO NOT assign.**

### **Pillar 3 – Anti-Collision Check**
Before modifying ANY driver:
- AI MUST scan all existing drivers
- AI MUST ensure `(manufacturerName + productId)` is UNIQUE
- **If a conflict exists → STOP and request manual resolution**

---

## 9.5. Maximum ManufacturerName Expansion (Coverage Maximisation)

Tuya produces the SAME device under MANY variant manufacturerNames.

Therefore:

> **AI MUST expand the manufacturerName list as much as possible**
> **BUT ONLY if the device family is truly identical.**

### AI MUST:
- Gather ALL manufacturerName variants from Z2M for this device family
- Add them to the SAME driver if clusters & DP profile match
- **Preserve ALL existing manufacturerName entries (NON-REGRESSION)**
- Comment unverified ones instead of deleting them

### AI MUST NOT:
- Mix unrelated families
- Assign wrong variants
- **Remove existing working manufacturers**

---

## 9.6. ProductId Expansion Rules (Precision Without Restriction)

### AI MUST:
- Add productId values ONLY if verified by Pillars 1+2+3
- Expand productId list to include ALL known variants for this device
- **Ensure the list is EXHAUSTIVE when productId filtering is activated**
- Validate against Z2M's full set of zigbeeModel variants
- Preserve working behaviour (NON-REGRESSION)

### ❌ Forbidden:
```json
"productId": ["TS0601"]
```
→ **NEVER allowed alone.**

### ✅ Safe:
```json
"productId": ["TS0601", "TS0601_b", "TS0601_c"]
```

### Mandatory Rule:
> **If AI adds productId filtering in a driver that previously had NONE,**
> **it MUST add ALL known productIds for the manufacturerNames involved.**
> **Never restrict compatibility.**

---

## 9.7. Automatic Driver Folder Creation (When Needed)

If no existing driver fits the category:

**AI MUST:**
1. Create a new folder `/drivers/<category_name>/`
2. Generate:
   - `driver.compose.json`
   - `device.js`
   - `capabilities` folder (if needed)
3. Add TODO markers for incomplete DPs

---

## 9.8. Non-Regression Safety Layer (CRITICAL)

> **The AI MUST NEVER reduce compatibility.**
> **Zero regression is an absolute rule.**

### AI MUST:
- **NEVER delete manufacturerName** unless proven invalid
- **NEVER delete a productId** without a valid technical reason
- **KEEP all legacy manufacturerName entries** when in doubt
- **ADD comments** instead of removing uncertain items

### Example:
```json
"manufacturerName": [
  "_TZE200_verified",
  "_TZE200_abcxyz"  // Valid? Check Z2M – keep for compatibility
]
```

### If manufacturerName exists but its productId is unknown:
- Keep manufacturerName
- Add comment: `// ProductId unknown – keep for backward compatibility`

### ALWAYS preserve drivers that users have confirmed functional.

### If strict filtering risks breaking coverage:
**AI MUST:**
- Use "broad mode" for this manufacturerName
- Keep all productId variants for this manufacturer
- Avoid narrowing the list

---

## 9.9. Final Priority Order

**AI MUST follow in this EXACT sequence:**

```
1️⃣ Identify device CATEGORY (clusters + DPs)
2️⃣ Select correct DRIVER FOLDER
3️⃣ Expand MANUFACTURERNAME intelligently (MAX coverage)
4️⃣ Expand PRODUCTID EXHAUSTIVELY but SAFELY
5️⃣ Check COLLISIONS across all drivers
6️⃣ Apply only SAFE changes
7️⃣ NEVER break existing support
```

---

## 9.10. Golden Principle

> **Fingerprinting MUST maximise compatibility, NEVER reduce it.**
> **Wrong fingerprinting is worse than missing fingerprinting.**
> **No regression. No collision. No misclassification.**

---

## 9.11. Validation Checklist (Before ANY Change)

- [ ] No manufacturerName removed (unless clearly wrong category)
- [ ] If productId added, list is EXHAUSTIVE from Z2M
- [ ] No duplicate `(mfr, pid)` pairs across drivers
- [ ] Category matches device function
- [ ] Existing working devices will NOT break
- [ ] 3-Pillar validation passed

---

## 9.12. Common AI Mistakes to REJECT

| Mistake | Example | Why Wrong |
|---------|---------|-----------|
| Single productId | `["TS0601"]` | Missing other variants |
| Mixing types | `["TS0601", "_TZE200_xxx"]` | `_TZE` is manufacturerName! |
| Removing mfr | 10 mfr → 3 mfr | Lost 7 = broken devices |
| Wrong category | Smoke detector in Light driver | Catastrophic collision |
| No exhaustive check | Adding without Z2M full scan | Missing variants |

---

# 10. VERSION FRANÇAISE (FR)

## 10.1. Logique de Matching Homey

Homey sélectionne un driver via:
- `zigbee.manufacturerName` (ex: `"_TZE284_vvmbj46n"`)
- ET `zigbee.productId` (= modelId, ex: `"TS0601"`)
- Plus profileId/deviceId si disponibles

> **JAMAIS se fier au manufacturerName seul.**
> **TOUJOURS utiliser la paire (manufacturerName + productId).**

## 10.2. Piège TS0601

TS0601 est un ID GÉNÉRIQUE utilisé pour des appareils TOTALEMENT DIFFÉRENTS:
- Vannes thermostatiques (TRV)
- Capteurs de présence mmWave
- Sirènes d'alarme
- Contrôleurs de rideaux
- Capteurs de sol

> **TS0601 NE DOIT JAMAIS être ajouté seul.**

## 10.3. Expansion Maximale des ManufacturerNames

- Collecter TOUS les variants connus pour une famille d'appareils
- Les ajouter au MÊME driver SI ET SEULEMENT SI:
  - Les clusters correspondent
  - Les DPs correspondent
  - Z2M/ZHA confirment le même comportement
  - Aucun conflit avec un autre driver

## 10.4. Règles de Non-Régression (CRITIQUE)

> **L'IA NE DOIT JAMAIS réduire la compatibilité.**
> **Zéro régression est une règle absolue.**

- **JAMAIS supprimer un manufacturerName** existant
- **JAMAIS supprimer un productId** sans raison technique valide
- **GARDER** les entrées legacy en cas de doute
- **AJOUTER des commentaires** au lieu de supprimer

## 10.5. ProductId EXHAUSTIF

Si on ajoute productId à un driver qui n'en avait pas:
> **La liste DOIT être EXHAUSTIVE basée sur Z2M.**

```json
// ❌ INTERDIT
"productId": ["TS0601"]

// ✅ CORRECT
"productId": ["TS0601", "TS0601_b", "TS0601_c"]
```

## 10.6. Ordre de Priorité

```
1️⃣ CATÉGORIE (clusters + DPs) → Quel type d'appareil?
2️⃣ DOSSIER (driver folder) → Où le placer?
3️⃣ MANUFACTURERNAME (expansion) → Tous les variants (MAXIMAL)
4️⃣ PRODUCTID (validation) → Exhaustif mais sûr (PRÉCIS)
5️⃣ VÉRIFICATION COLLISIONS → Pas de doublon
6️⃣ APPLIQUER → Seulement si 100% sûr
```

## 10.7. Principe d'Or

> **Le fingerprinting DOIT maximiser la compatibilité, JAMAIS la réduire.**
> **Un mauvais fingerprinting est pire qu'un fingerprinting manquant.**
> **Zéro régression. Zéro collision. Zéro mauvaise classification.**

---

# 11. Scripts de Validation

| Script | Usage |
|--------|-------|
| `automation/DETECT_COLLISIONS.js` | Détecte les collisions HIGH/MEDIUM |
| `automation/RESOLVE_COLLISIONS.js` | Résout par système de priorité |
| `automation/FETCH_ALL_ZIGBEE.js` | Enrichit depuis Z2M |
| `automation/SAFE_AUDIT.js` | Audit sécurisé (lecture seule) |

## Système de Priorité des Drivers

```
PRIORITY 100: climate_sensor, motion_sensor, contact_sensor, water_leak_sensor,
              smoke_detector_advanced, presence_sensor_radar, vibration_sensor

PRIORITY 90:  thermostat_tuya_dp, radiator_valve, curtain_motor, plug_energy_monitor

PRIORITY 80:  switch_1gang, plug_smart, dimmer_wall_1gang, button_wireless_1, bulb_rgb

PRIORITY 70:  temphumidsensor, air_quality_co2, weather_station_outdoor

PRIORITY 10:  generic_tuya

PRIORITY 5:   zigbee_universal (catch-all)
```

**Un manufacturerName doit être dans UN SEUL driver (le plus prioritaire).**
