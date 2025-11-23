# ⚡ CURSOR QUICK PATTERNS - Search & Replace

**Ultra-fast reference for automated refactoring**

---

## 🔍 FIND PROBLEMATIC DRIVERS

### Find Buttons with Wrong Class

```bash
# Find button drivers with socket class
find drivers -name "driver.compose.json" -exec grep -l "button\|wireless\|remote" {} \; | xargs grep -l '"class".*"socket"'

# Find button drivers with onoff capability
find drivers -name "driver.compose.json" -path "*/button_*/*" -o -path "*/wireless_*/*" | xargs grep -l '"onoff"'

# Find TS004x references
grep -r "TS0041\|TS0043\|TS0044" drivers/*/driver.compose.json | grep -v "button_ts004"
```

### Find Missing Battery Declarations

```bash
# Drivers using BatteryManager but missing static capability
grep -l "BatteryManager" drivers/*/device.js | while read f; do
  dir=$(dirname "$f")
  compose="$dir/driver.compose.json"
  if [ -f "$compose" ] && ! grep -q "measure_battery" "$compose"; then
    echo "MISSING: $compose"
  fi
done
```

### Find Old dataQuery Calls

```bash
# Find old dataQuery signature
grep -rn "dataQuery.*{.*dp:" --include="*.js" lib/ drivers/

# Should be: dpValues: [{ dp }]
```

---

## 🔧 AUTOMATED FIXES (Cursor AI)

### Fix 1: Button Class Socket → Button

**Search (regex):**
```regex
("name".*[Bb]utton.*\n.*)"class":\s*"socket"
```

**Replace:**
```
$1"class": "button"
```

**Files:** `drivers/button_*/driver.compose.json`

---

### Fix 2: Remove onoff from Button Capabilities

**Search (regex):**
```regex
"capabilities":\s*\[\s*"onoff",?\s*
```

**Replace:**
```
"capabilities": [
```

**Context:** Only in button/remote drivers

---

### Fix 3: Add alarm_battery After measure_battery

**Search:**
```json
    "measure_battery"
  ],
```

**Replace:**
```json
    "measure_battery",
    "alarm_battery"
  ],
```

**Files:** All driver.compose.json with measure_battery

---

### Fix 4: Add Energy Batteries Section

**Search (regex):**
```regex
(  "capabilities": \[[\s\S]*?"measure_battery"[\s\S]*?\],\n)(  "zigbee":)
```

**Replace:**
```
$1  "energy": {
    "batteries": ["CR2032"]
  },
$2
```

---

### Fix 5: Remove dim Capability from Buttons

**Search:**
```json
    "dim",
```

**Replace:** (empty)

**Context:** Only in button/remote drivers

---

## 📝 FILE-SPECIFIC PATTERNS

### Pattern: driver.compose.json (Button/Remote)

**Template:**
```json
{
  "name": {"en": "Wireless Button (TS0041)"},
  "class": "button",
  "capabilities": [
    "measure_battery",
    "alarm_battery"
  ],
  "energy": {
    "batteries": ["CR2032"]
  },
  "zigbee": {
    "manufacturerName": ["_TZ3000_..."],
    "productId": ["TS0041"],
    "endpoints": {...}
  }
}
```

---

### Pattern: device.js (TS0601 Integration)

**Add at top:**
```javascript
const TuyaDPMapper = require('../../lib/tuya/TuyaDPMapper');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');
```

**Add in onNodeInit:**
```javascript
if (this.isTuyaDPDevice()) {
  // Auto DP Mapping
  this.log('[DEVICE-V4] 🤖 Starting auto DP mapping...');
  await TuyaDPMapper.autoSetup(this, zclNode).catch(err => {
    this.log('[DEVICE-V4] ⚠️  Auto-mapping failed:', err.message);
  });

  // Battery V4
  this.batteryManagerV4 = new BatteryManagerV4(this, 'CR2032');
  await this.batteryManagerV4.startMonitoring().catch(err => {
    this.log('[DEVICE-V4] ⚠️  Battery V4 init failed:', err.message);
  });
}
```

---

### Pattern: TuyaDPDatabase.js (New Device Profile)

**Template:**
```javascript
'DEVICE_TYPE_KEY': {
  name: 'Device Type Name',
  manufacturers: ['_TZE284_...', '_TZ3000_...'],
  model: 'TS0601',
  dps: {
    1: {
      name: 'temperature',
      type: 0x02,  // VALUE
      divider: 10,
      unit: '°C',
      capability: 'measure_temperature'
    },
    2: {
      name: 'humidity',
      type: 0x02,
      unit: '%',
      capability: 'measure_humidity'
    },
    4: {
      name: 'battery',
      type: 0x02,
      unit: '%',
      capability: 'measure_battery'
    }
  }
}
```

---

## 🎯 BULK OPERATIONS

### Bulk Fix: All Button Drivers

```bash
# List all button driver paths
BUTTONS=(
  "drivers/button_ts0041"
  "drivers/button_ts0043"
  "drivers/button_ts0044"
  "drivers/button_wireless_1"
  "drivers/button_wireless_3"
  "drivers/button_wireless_4"
  "drivers/button_wireless"
  "drivers/button_remote_1"
  "drivers/button_remote_2"
  "drivers/button_remote_3"
  "drivers/button_remote_4"
  "drivers/button_remote_6"
  "drivers/button_remote_8"
)

# For each, check and fix
for dir in "${BUTTONS[@]}"; do
  compose="$dir/driver.compose.json"
  if [ -f "$compose" ]; then
    echo "Processing: $compose"
    # Use sed, jq, or manual edit
  fi
done
```

---

### Bulk Add: measure_battery to All Battery Drivers

```bash
# Find all drivers using BatteryManager
grep -l "new BatteryManager" drivers/*/device.js | while read devicejs; do
  dir=$(dirname "$devicejs")
  compose="$dir/driver.compose.json"

  if [ -f "$compose" ]; then
    if ! grep -q "measure_battery" "$compose"; then
      echo "ADD measure_battery to: $compose"
      # Use jq or manual edit
    fi
  fi
done
```

---

## 🚦 VALIDATION COMMANDS

### After Each Change

```bash
# Validate JSON syntax
find drivers -name "*.json" -exec node -e "require('fs').readFileSync('{}', 'utf8')" \; 2>&1 | grep -i error

# Check no syntax errors in JS
find drivers lib -name "*.js" -exec node --check {} \;

# Verify button classes
grep -r '"class".*"socket"' drivers/button_*/driver.compose.json
# Should be EMPTY

# Verify no onoff in buttons
grep -r '"onoff"' drivers/button_*/driver.compose.json
# Should be EMPTY

# Count battery declarations
grep -r "measure_battery" drivers/*/driver.compose.json | wc -l
# Should be ~50+
```

---

## 🏃‍♂️ QUICK START WORKFLOW

**1. Create branch:**
```bash
git checkout -b fix/cursor-audit-v2
```

**2. Fix buttons (5 min):**
```bash
# Search: drivers/button_*/driver.compose.json
# Pattern: class=socket → button
# Pattern: remove onoff, dim
```

**3. Add battery declarations (10 min):**
```bash
# Search: all drivers with BatteryManager
# Add: measure_battery + alarm_battery in compose
```

**4. TS0601 integrations (15 min):**
```bash
# Files: climate_monitor, climate_sensor_soil, presence_sensor_radar
# Add: TuyaDPMapper.autoSetup() calls
# Already done in Vague 2! ✅
```

**5. Test:**
```bash
npm run validate
# or
homey app validate
```

**6. Commit:**
```bash
git add -A
git commit -m "fix: CURSOR Audit V2 refactor - buttons + battery + TS0601"
git push
```

---

## 🎨 CURSOR-SPECIFIC TIPS

### Use Cursor Chat for Bulk Edits

**Prompt example:**
```
Find all files matching "drivers/button_*/driver.compose.json"
where "class" is "socket" and change it to "button".
Also remove "onoff" and "dim" from capabilities array.
```

### Use Cursor Multi-File Edit

1. Cmd/Ctrl + Shift + F (Find in files)
2. Search: `"class": "socket"`
3. Filter: `drivers/button_*/driver.compose.json`
4. Select all → Replace
5. Type: `"class": "button"`

### Use Cursor Code Actions

1. Open any driver.compose.json
2. Select `"capabilities": [...]` block
3. Right-click → "Refactor..."
4. Choose pattern or create custom

---

## 📋 ONE-LINER CHECKS

```bash
# Quick health check
echo "=== Buttons ===" && \
grep -c '"class".*"socket"' drivers/button_*/driver.compose.json 2>/dev/null && \
echo "=== Battery ===" && \
grep -c "measure_battery" drivers/*/driver.compose.json && \
echo "=== TS0601 ===" && \
grep -c "TuyaDPMapper.autoSetup" drivers/*/device.js
```

Expected output:
```
=== Buttons ===
0             ← No more socket class in buttons
=== Battery ===
50            ← ~50 drivers with battery
=== TS0601 ===
3             ← climate, soil, radar (minimum)
```

---

**🚀 READY FOR AUTOMATED REFACTOR! COPY & PASTE INTO CURSOR!**
