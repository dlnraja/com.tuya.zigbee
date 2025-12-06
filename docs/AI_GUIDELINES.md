# AI Guidelines for Zigbee Fingerprinting

**For: Cursor, Windsurf, GPT, Claude, or any AI assistant**

## ABSOLUTE RULES (Non-Negotiable)

### 1. Sacred Couple Rule
```
NEVER add productId without verifying manufacturerName.
It's the COMBINATION that matters.
```

### 2. TS0601 Danger
```
TS0601 MUST NEVER be added alone.
TS0601 covers 20+ unrelated device types.
ALWAYS couple with specific manufacturerName.
```

### 3. Non-Regression
```
NEVER delete existing manufacturerName.
NEVER reduce compatibility.
When in doubt, KEEP existing entries.
```

### 4. Exhaustive ProductId
```
When adding productId to a driver that had none,
list MUST include ALL known variants from Z2M.
```

## WORKFLOW

```
1️⃣ CATEGORY    → Determine device type from clusters/DPs
2️⃣ FOLDER      → Select correct driver folder
3️⃣ MFR EXPAND  → Add ALL manufacturerName variants
4️⃣ PID EXHAUST → Add ALL productId variants
5️⃣ COLLISION   → Verify unique pairs across drivers
6️⃣ VALIDATE    → Run homey app validate
7️⃣ APPLY       → Only if 100% safe
```

## BEFORE ANY CHANGE

Run these checks:
```bash
node automation/DETECT_COLLISIONS.js
node automation/SAFE_AUDIT.js [driver_name]
```

## CATEGORY → FOLDER MAPPING

| Category | Folder |
|----------|--------|
| Switches | `/drivers/switch_*/` |
| Plugs | `/drivers/plug_*/` |
| Lights | `/drivers/bulb_*`, `/drivers/dimmer_*` |
| Sensors | `/drivers/climate_sensor/` |
| Motion | `/drivers/motion_sensor/` |
| Thermostats | `/drivers/thermostat_*/` |
| Alarms | `/drivers/siren/`, `/drivers/smoke_*/` |
| Covers | `/drivers/curtain_*/` |

## MISTAKES TO REJECT

### ❌ Single productId
```json
"productId": ["TS0601"]  // WRONG
```

### ❌ Mixing types
```json
"productId": ["TS0601", "_TZE200_xxx"]  // WRONG: _TZE is mfr!
```

### ❌ Removing manufacturers
```
Before: 10 manufacturers
After: 3 manufacturers
→ REJECT (lost 7 devices)
```

### ❌ Wrong category
```
Smoke detector in Light driver → REJECT
```

## CORRECT PATTERNS

### ✅ Exhaustive productId
```json
"manufacturerName": ["_TZ3000_abc", "_TZ3000_def"],
"productId": ["TS011F", "TS0001", "TS0121"]
```

### ✅ TS0601 with specific manufacturers
```json
"manufacturerName": ["_TZE200_hue3yfsn"],
"productId": ["TS0601"]
```

### ✅ Expansion only
```json
// Before: 10 manufacturers
// After: 12 manufacturers (+2)
// CORRECT: Only additions
```

## SOURCE PRIORITY

1. **Homey logs** (PRIMARY)
2. **Community data** (SECONDARY)
3. **Z2M / ZHA** (TERTIARY - hints only)

> If Homey and Z2M disagree → **Homey wins**

## GOLDEN PRINCIPLE

> **Fingerprinting MUST maximise compatibility, NEVER reduce it.**
> **Wrong fingerprinting is worse than missing fingerprinting.**
> **No regression. No collision. No misclassification.**
