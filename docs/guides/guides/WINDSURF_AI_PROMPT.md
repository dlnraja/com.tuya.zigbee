# WINDSURF AI - COMPLETE FIX & ENHANCEMENT PROMPT

## 🎯 OBJECTIVE
Fix ALL issues from diagnostics, crash reports, and forum feedback for Homey Universal Tuya Zigbee app (local-first Zigbee, including Tuya).

## 📚 GUIDELINES & SOURCES

### Official Documentation
- **Homey Zigbee SDK3**: https://apps.developer.homey.app/wireless/zigbee
- **Homey SDK Reference**: https://apps-sdk-v3.developer.homey.app/
- **node-zigbee-clusters Custom Clusters**: https://github.com/athombv/node-zigbee-clusters#implementing-a-custom-cluster
- **Homey App Store Guidelines**: https://apps.developer.homey.app/app-store/publishing

### Community References
- **Forum Thread #407**: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/407
- **GitHub Repo**: https://github.com/dlnraja/com.tuya.zigbee
- **ChatGPT Analysis**: https://chatgpt.com/share/68f0e31a-7cb4-8000-96b7-dec4e3a85e13

## 🔴 CRITICAL ISSUES TO FIX

### 1. IAS Zone / Motion / SOS Button Failures
**Symptoms**: "Still no Motion and SOS triggered data", `v.replace is not a function`

**Root Causes** (from diagnostics):
- IEEE address contains malformed strings like `:4:ae:f:::9:fe:f:::f:6e:2:::0:bc`
- Calling `.replace()` on non-string values
- Zigbee not ready during enrollment (crashes with "Zigbee est en cours de démarrage")
- `Timeout: Expected Response` when reading clusters too early
- Multiple event listeners causing duplicates

**Required Fixes**:
```javascript
// lib/IASZoneEnroller.js - Line 114-135

// BEFORE (BROKEN):
const hexOnly = bridgeId.replace(/[^0-9a-fA-F]/g, '').toLowerCase();

// AFTER (FIXED):
const toSafeString = (val) => (val == null || val === undefined) ? '' : String(val);
const bridgeIdStr = toSafeString(bridgeId);
const hexOnly = bridgeIdStr.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
```

**Add Zigbee Ready Waiting**:
```javascript
// New helper: lib/zigbee/wait-ready.js
async function waitForZigbeeReady(device, maxAttempts = 15, delayMs = 300) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const ep1 = device?.zclNode?.endpoints?.[1];
      if (ep1?.clusters?.iasZone) return ep1;
      await new Promise(r => setTimeout(r, delayMs));
    } catch {}
  }
  return null;
}
module.exports = { waitForZigbeeReady };
```

**Add Retry Wrapper**:
```javascript
// New helper: lib/zigbee/safe-io.js
async function withRetry(fn, { tries = 3, backoffMs = 250 } = {}) {
  let lastError;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < tries - 1) {
        await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
      }
    }
  }
  throw lastError;
}
module.exports = { withRetry };
```

**Fix IASZoneEnroller.js**:
- Import `waitForZigbeeReady` and `withRetry`
- Call `waitForZigbeeReady(device)` BEFORE any cluster access
- Wrap ALL readAttributes/writeAttributes with `withRetry(() => ...)`
- Ensure listeners registered ONLY ONCE (check `device.__iasListenersRegistered` flag)

---

### 2. Battery Conversion Inconsistencies
**Symptom**: Battery shows 200% or 2% instead of 100% or 1%

**Root Cause** (from diagnostics):
- Zigbee `batteryPercentageRemaining` is 0..200 (0.5% resolution)
- Some drivers divide by 2, others don't
- No clamping to 0..100 range

**Required Fix**:
```javascript
// New converter: lib/tuya-engine/converters/battery.js
function fromZclBatteryPercentageRemaining(raw) {
  if (raw == null || isNaN(raw)) return null;
  // Zigbee spec: 0..200 = 0..100%
  const pct = Math.round(Math.max(0, Math.min(200, raw)) / 2);
  return Math.max(0, Math.min(100, pct));
}
module.exports = { fromZclBatteryPercentageRemaining };
```

**Apply to ALL battery drivers**:
- `drivers/temperature_sensor_battery/device.js`
- `drivers/sos_emergency_button_cr2032/device.js`
- `drivers/motion_sensor_battery/device.js`
- All other `*_battery` drivers

Replace:
```javascript
reportParser: value => value / 2
```
With:
```javascript
reportParser: value => require('../../lib/tuya-engine/converters/battery').fromZclBatteryPercentageRemaining(value)
```

---

### 3. Illuminance Log-Lux Conversion
**Symptom**: Illuminance values incorrect (31 lux showing as 31000)

**Root Cause**: Zigbee `measuredValue` is in log-lux format, needs conversion

**Required Fix**:
```javascript
// lib/tuya-engine/converters/illuminance.js
function zigbeeMeasuredToLux(measuredValue) {
  if (measuredValue == null || isNaN(measuredValue)) return null;
  // Zigbee spec: lux = 10 ^ ((measuredValue - 1) / 10000)
  const lux = Math.round(Math.pow(10, (measuredValue - 1) / 10000));
  return Math.max(0, Math.min(100000, lux));
}
module.exports = { zigbeeMeasuredToLux };
```

**Apply with Profile Option**:
```json
// lib/tuya-engine/profiles.json
{
  "th_sensor.generic.v1": {
    "capabilities": ["measure_temperature", "measure_humidity", "measure_battery", "measure_luminance"],
    "options": {
      "tempScale": 0.1,
      "useLogLux": true  // <-- Enable conversion
    }
  }
}
```

---

### 4. Debug Display 0xNaN
**Symptom**: Cluster IDs showing as `0xNaN` in logs

**Root Cause**: Trying to convert `undefined` cluster IDs to hex

**Required Fix**:
```javascript
// In any debug/logging code:
const toHex = (id) => Number.isFinite(id) ? `0x${id.toString(16)}` : 'n/a';
console.log('Cluster:', toHex(cluster?.ID));
```

---

### 5. Orphaned Code & Syntax Errors
**Found in**:
- `drivers/motion_sensor_battery/device.js` - Line 32: orphaned `catch` block

**Required Fix**:
- Remove orphaned catch block (lines 32-35)
- Ensure all motion sensors use IASZoneEnroller like SOS button

---

### 6. Device Fingerprint Routing

**Ian Gibbo Interview** (from PDFs):
- **TS011F** / `_TZ3000_00mk2xzy` → Smart Plug (On/Off + Energy if available)
- **Hue LOM003** → Not Tuya, redirect to "Philips Hue without bridge" app

**Required Actions**:
```json
// lib/tuya-engine/fingerprints.json - ADD:
{
  "manufacturerName": "_TZ3000_00mk2xzy",
  "modelId": "TS011F",
  "endpoints": [1],
  "profile": "smart_plug.ts011f.v1"
}
```

```json
// lib/tuya-engine/profiles.json - ADD:
{
  "smart_plug.ts011f.v1": {
    "capabilities": ["onoff"],
    "dpMap": { "onoff": 1 }
  }
}
```

**Hue LOM003 Pairing Redirect**:
During pairing, if `manufacturerName` contains `Signify` and `modelId` is `LOM003`:
```javascript
throw new Error('This Philips Hue device is best supported by the "Philips Hue without bridge" app. That app offers better compatibility for Hue Zigbee devices.');
```

---

## 🏗️ ARCHITECTURE IMPROVEMENTS

### Create Tuya DP Engine Skeleton

```
lib/tuya-engine/
  ├── fingerprints.json          # mfr+model → profile
  ├── profiles.json              # profile → capabilities + dpMap
  ├── capability-map.json        # capability → type/unit/scale
  ├── converters/
  │   ├── battery.js
  │   ├── temperature.js
  │   ├── illuminance.js
  │   └── onoff.js
  └── traits/
      ├── OnOff.js
      ├── Temperature.js
      └── Battery.js
```

**capability-map.json**:
```json
{
  "measure_temperature": { "type": "number", "unit": "°C", "scale": 0.1 },
  "measure_humidity": { "type": "percent" },
  "measure_battery": { "type": "percent" },
  "measure_luminance": { "type": "number", "unit": "lux" },
  "onoff": { "type": "boolean" }
}
```

---

## 🔧 CI/CD & AUTOMATION

### GitHub Actions Workflow
**.github/workflows/build.yml**:
```yaml
name: Build & Validate & Matrix
on:
  push:
    branches: [ master, main, tuya-light ]
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx eslint . || true
      - run: npx homey app validate --level publish || true
      - run: node ./scripts/build-device-matrix.js
      - uses: actions/upload-artifact@v4
        with:
          name: build-artifacts
          path: |
            ./reports/**
            ./matrix/devices.json
            ./matrix/devices.csv
```

### Device Matrix Export Script
**scripts/build-device-matrix.js**:
```javascript
const fs = require('fs');
const path = require('path');

function walk(dir, out=[]) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name === 'driver.compose.json') out.push(p);
  }
  return out;
}

const files = walk(path.join(__dirname, '..', 'drivers'));
const rows = [];

for (const file of files) {
  try {
    const compose = JSON.parse(fs.readFileSync(file, 'utf8'));
    const fp = compose.fingerprint || {};
    rows.push({
      category: compose.category || path.basename(path.dirname(file)),
      manufacturerName: fp.manufacturerName || '',
      modelId: fp.modelId || '',
      capabilities: (compose.capabilities || []).join('|')
    });
  } catch (e) {
    console.error('Failed:', file, e.message);
  }
}

fs.mkdirSync(path.join(__dirname, '..', 'matrix'), { recursive: true });
fs.writeFileSync(
  path.join(__dirname, '..', 'matrix', 'devices.json'),
  JSON.stringify(rows, null, 2)
);

// CSV
const headers = Object.keys(rows[0] || {});
const csv = [
  headers.join(','),
  ...rows.map(r => headers.map(h => `"${String(r[h] || '')}"`).join(','))
].join('\n');
fs.writeFileSync(path.join(__dirname, '..', 'matrix', 'devices.csv'), csv);

console.log(`Exported ${rows.length} devices`);
```

---

## 📝 TEMPLATES & DOCUMENTATION

### GitHub Issue Templates

**.github/ISSUE_TEMPLATE/01_device_request.md**:
```markdown
---
name: "Device Request (Zigbee Tuya)"
about: "Request support for a new device (local Zigbee)"
labels: ["device-request"]
---

## Basic info
- Brand & model:
- Purchase link:
- Power: Battery / Mains

## Zigbee fingerprint (MANDATORY)
- ManufacturerName:
- ModelId:
- Endpoints/clusters (screenshot from Homey Dev Tools):

## TS0601 DP list (if applicable)
- DP → meaning (with example values):

## References
- Zigbee2MQTT:
- Home Assistant/ZHA:

## Expected capabilities
- e.g. measure_temperature, onoff, etc.
```

**.github/ISSUE_TEMPLATE/02_bug_report.md**:
```markdown
---
name: "Bug Report"
labels: ["bug"]
---

**Describe the bug**

**Device details**
- Brand/model:
- Fingerprint:

**Steps to reproduce**
1. ...

**Logs/diagnostic**
```

**.github/pull_request_template.md**:
```markdown
## What changed
- ...

## Why
- ...

## Checklist
- [ ] ESLint OK
- [ ] `homey app validate --level publish` OK
- [ ] Matrix updated
- [ ] Linked issue
```

---

### Zigbee Cookbook
**docs/cookbook.md**:
```markdown
# Zigbee Local Cookbook (Homey)

## Pairing
- Reset device, start inclusion near hub
- Avoid 2.4GHz Wi-Fi interference
- Wait 2-5 min for first reports

## Mesh & Stability
- Add Zigbee routers (mains devices)
- Check LQI, reduce distance

## Repair / Re-pair
1. Remove from Homey cleanly
2. Factory reset device
3. Re-pair next to hub
4. Wait for initial reporting

## Tuya (TS0601 / DPs)
- Map Data Points (DPs) to capabilities via profiles
- Some modes (thermostat/cover) use separate DPs

## Frequent Fixes
- **Battery 0%** → wait for reports, check mesh
- **Inverted covers** → set `invertPosition: true`
- **Thermostat modes** → confirm supported modes
```

---

## 📊 README TRANSPARENCY BLOCK

Add to README.md:
```markdown
## 🔍 Transparency (CI)

This project publishes build artifacts for verification:

- **Validation logs**: `homey app validate --level publish` → see CI artifacts
- **Device matrix**: JSON/CSV generated by `scripts/build-device-matrix.js`

[![Build](https://img.shields.io/github/actions/workflow/status/dlnraja/com.tuya.zigbee/build.yml?branch=master)](https://github.com/dlnraja/com.tuya.zigbee/actions)
[![Device Matrix](https://img.shields.io/badge/device%20matrix-json%2Fcsv-blue)](https://github.com/dlnraja/com.tuya.zigbee/actions)
```

---

## 🔍 GIT HISTORY ANALYSIS

### Bisect Instructions
```bash
cd "c:\Users\HP\Desktop\homey app\tuya_repair"

# Find when IAS broke:
git bisect start
git bisect bad 0fa02eb3f  # IAS fix commit
git bisect good 58288251d  # Before issues
# Test each: pair motion/SOS, check if triggers work
# Mark good/bad until first breaking commit found
git bisect reset

# Find when battery broke:
git bisect start
git bisect bad 4e1959b2f   # Battery fix commit
git bisect good 58288251d
# Test: check battery % correct (not 200%)
git bisect reset
```

### Key Commits to Review
- `0fa02eb3f` - IAS Zone enrollment fix (Oct 17)
- `4e1959b2f` - Battery reporting fix (Oct 17)
- `5deefa725` - Cluster ID registration fix (Oct 17)

---

## ✅ ACCEPTANCE CRITERIA

### Must Pass Before Commit
- [ ] `npx homey app validate --level publish` → 0 errors
- [ ] `npx eslint .` → 0 errors
- [ ] Motion sensor triggers flow on movement
- [ ] SOS button triggers flow on press
- [ ] Battery shows 0-100% (not 0-200%)
- [ ] Illuminance shows realistic lux values
- [ ] No `v.replace is not a function` errors
- [ ] No `0xNaN` in logs
- [ ] No `Timeout: Expected Response` crashes during pairing
- [ ] CI produces valid `matrix/devices.json`
- [ ] All templates present in `.github/ISSUE_TEMPLATE/`

---

## 💬 COMMUNICATION POSTURE

### Forum/README Tone
**DO**: 
- "This app focuses on local Zigbee (Tuya included). It's complementary to other approaches."
- "We publish CI artifacts (validation + matrix) for transparency."
- Link to CI artifacts instead of arguing

**DON'T**:
- Bash other apps
- Make claims without CI proof
- Use aggressive language

### Comparison Table (Neutral)
```markdown
| Feature            | This App (Zigbee Local) | Other Apps (e.g. Cloud) |
|--------------------|------------------------|------------------------|
| Internet Required  | No (normal operation)  | Yes (API required)     |
| Latency            | Very low (local)       | Variable (network)     |
| Device Support     | Zigbee Tuya            | Wi-Fi Tuya + more      |
| Complementary      | Yes                    | Yes                    |
```

---

## 🚀 QUICK WINS (Implement First)

1. **Fix IASZoneEnroller.js** - Add `toSafeString()`, wait-ready, retries
2. **Fix motion_sensor_battery/device.js** - Remove orphaned catch, use IASZoneEnroller
3. **Create lib/tuya-engine/converters/battery.js** - Apply to all battery drivers
4. **Create lib/tuya-engine/converters/illuminance.js** - Apply to lux sensors
5. **Add CI workflow** - `.github/workflows/build.yml`
6. **Add templates** - Device Request, Bug Report, PR template
7. **Create scripts/build-device-matrix.js** - Export matrix
8. **Add docs/cookbook.md** - Zigbee pairing/troubleshooting guide
9. **Update README** - Add Transparency block + badges
10. **Add TS011F fingerprint** - Support Ian Gibbo's smart plug

---

## 📦 COMMIT MESSAGE

```
fix(critical): IAS Zone + Battery + Illuminance + CI transparency

FIXES:
- IAS Zone: wait Zigbee ready, safe string handling, retries, single listeners
- Battery: uniform 0..200 → % conversion with clamping (all drivers)
- Illuminance: log-lux → lux conversion (profile option)
- Debug: no more 0xNaN cluster IDs
- Motion sensor: remove orphaned catch block, use IASZoneEnroller

ADDS:
- lib/zigbee/wait-ready.js: safe Zigbee init waiting
- lib/zigbee/safe-io.js: retry wrapper for timeouts
- lib/tuya-engine/converters/battery.js: standard converter
- lib/tuya-engine/converters/illuminance.js: log-lux converter
- .github/workflows/build.yml: CI validation + matrix export
- scripts/build-device-matrix.js: auto-generate device matrix
- .github/ISSUE_TEMPLATE/*: Device Request, Bug, Feature, PR
- docs/cookbook.md: Zigbee pairing/troubleshooting guide
- TS011F fingerprint (_TZ3000_00mk2xzy): Ian Gibbo smart plug

SOURCES:
- Homey SDK: https://apps.developer.homey.app/wireless/zigbee
- node-zigbee-clusters: https://github.com/athombv/node-zigbee-clusters
- Forum #407: https://community.homey.app/t/.../140352/407
- ChatGPT Analysis: https://chatgpt.com/share/68f0e31a-7cb4-8000-96b7-dec4e3a85e13

Closes: Forum #407 diagnostics, Ian Gibbo interview issues
```

---

## 🎯 EXECUTION PLAN

### Phase 1: Critical Fixes (1-2 hours)
1. Fix IASZoneEnroller.js (safe strings, wait-ready, retries)
2. Fix motion_sensor_battery/device.js (remove orphaned code)
3. Create & apply battery converter
4. Create & apply illuminance converter
5. Test: Motion sensor + SOS button + Battery %

### Phase 2: Infrastructure (30-60 min)
1. Create CI workflow (.github/workflows/build.yml)
2. Create build-device-matrix.js script
3. Run matrix generation
4. Verify artifacts

### Phase 3: Templates & Docs (30 min)
1. Add GitHub issue templates
2. Add PR template
3. Create docs/cookbook.md
4. Update README with Transparency block

### Phase 4: New Devices (15 min)
1. Add TS011F fingerprint + profile
2. Add Hue LOM003 pairing redirect
3. Test pairing flow

### Phase 5: Validation & Commit (15 min)
1. Run `homey app validate --level publish`
2. Run `eslint .`
3. Fix any remaining issues
4. Commit with detailed message
5. Push & monitor CI

---

END OF PROMPT
