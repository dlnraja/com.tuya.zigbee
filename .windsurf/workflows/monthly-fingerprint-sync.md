---
description: Monthly workflow to sync new Tuya Zigbee fingerprints from Z2M, GitHub issues, and forum
---

# Monthly Fingerprint Sync Workflow

## Overview
This workflow syncs new manufacturerName/productId fingerprints from community sources into the Universal Tuya Zigbee app.

## Steps

### 1. Fetch Latest Z2M Fingerprints
// turbo
```bash
node scripts/automation/fetch-z2m-fingerprints.js
```

### 2. Scan GitHub Issues for New Device Requests
Check these sources:
- https://github.com/JohanBendz/com.tuya.zigbee/issues
- https://github.com/dlnraja/com.tuya.zigbee/issues
- Homey Forum Tuya threads

Look for patterns:
- `_TZ*_*` or `_TS*_*` manufacturerName
- `TS0601`, `TS0001`, etc. productId
- Device type keywords (sensor, switch, button, etc.)

### 3. Run Monthly Scan
// turbo
```bash
node scripts/automation/monthly-scan.js
```

### 4. Analyze Pending Devices
Read the generated files:
- `docs/MONTHLY_REPORT.md` - Collision report
- `data/community-sync/pending-fingerprints.json` - New fingerprints to add

### 5. For Each New Fingerprint
1. **Identify driver** using `inferDeviceType()`:
   - `_TZE*` → Usually TS0601 sensors (climate_sensor, presence_sensor_radar, etc.)
   - `_TZ3000_*` with TS0001/2/3/4 → switch_Xgang
   - `_TZ3000_*` with TS0043/44/45 → button_wireless_X

2. **Check for collisions** - same mfr+pid in multiple drivers

3. **Add to driver.compose.json**:
   ```json
   "zigbee": {
     "manufacturerName": ["_TZE200_newdevice", ...existing...],
     "productId": ["TS0601", ...existing...]
   }
   ```

4. **Add sensor config if needed** (for presence_sensor_radar, climate_sensor):
   ```javascript
   '_TZE200_newdevice': {
     sensors: ['_TZE200_newdevice'],
     configName: 'NEW_DEVICE_NAME',
     dpMap: { ... }
   }
   ```

### 6. Update Changelog
Add entry to `.homeychangelog.json`:
```json
"X.Y.Z": {
  "en": "🔌 NEW FINGERPRINTS: Added X new device fingerprints from community (list devices). GitHub #issue."
}
```

### 7. Bump Version
// turbo
```bash
npm version patch --no-git-tag-version
```

### 8. Run Validation
// turbo
```bash
node scripts/automation/monthly-scan.js
```
Check that collision count hasn't increased unexpectedly.

## Data Sources

| Source | URL | Update Frequency |
|--------|-----|------------------|
| Z2M Supported Devices | https://www.zigbee2mqtt.io/supported-devices/ | Weekly |
| JohanBendz Issues | https://github.com/JohanBendz/com.tuya.zigbee/issues | As needed |
| Homey Forum | https://community.homey.app/c/apps/universal-tuya-zigbee | Daily |

## Files Modified

- `drivers/{driver}/driver.compose.json` - Add fingerprints
- `drivers/{driver}/device.js` - Add sensor configs (if needed)
- `.homeychangelog.json` - Document changes
- `app.json` / `.homeycompose/app.json` - Version bump
