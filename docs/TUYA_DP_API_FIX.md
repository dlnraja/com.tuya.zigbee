# 🔧 TUYA DP API FIX - TS0601 Critical

**AUDIT V2:** Fix broken dataQuery API for TS0601 devices
**Status:** 🔴 CRITICAL - Values stuck at null
**Devices affected:** climate_sensor_soil, climate_monitor, presence_sensor_radar

---

## 🎯 PROBLEM

### Current error:
```
[TUYA] dataQuery failed: tuyaSpecific.dataQuery: dp is an unexpected property
```

### What's happening:
1. zigbee-clusters API changed
2. Old signature: `{ dp: 1 }` → ❌ Not recognized
3. New signature: `{ dpValues: [...] }` → ✅ Required
4. Fallback sendFrame fails: "Impossible de joindre l'appareil"
5. Values stay at `null` forever (temperature, humidity, soil, motion)

### Why it matters:
- TS0601 devices = Tuya DP protocol (cluster 0xEF00)
- Soil sensors, climate monitors, radar sensors ALL broken
- No data = useless devices

---

## ✅ SOLUTION

### Philosophy change:
**Before:** Poll with dataQuery → wait for response
**After:** Subscribe to reports → parse incoming data

### Priority:
1. **Event-based (best):** Listen to `tuyaData` reports
2. **Polling (fallback):** Use correct dataQuery API
3. **Hybrid:** Both for reliability

---

## 📖 NEW API SIGNATURE

### ❌ OLD (broken):
```javascript
await this.zclNode.endpoints[1].clusters.tuyaSpecific.dataQuery({
  dp: 1  // ❌ "dp is an unexpected property"
});
```

### ✅ NEW (correct):
```javascript
await this.zclNode.endpoints[1].clusters.tuyaSpecific.dataQuery({
  dpValues: [
    {
      dp: 1,        // DP number
      datatype: 2,  // Type: 0=raw, 1=bool, 2=value, 3=string, 4=enum, 5=bitmap
      value: 0      // Placeholder for query
    }
  ]
});
```

### Datatype reference:
```javascript
const TUYA_DATATYPES = {
  RAW: 0,      // Raw bytes
  BOOL: 1,     // Boolean (true/false)
  VALUE: 2,    // Integer value
  STRING: 3,   // String
  ENUM: 4,     // Enumeration
  BITMAP: 5    // Bitmap (flags)
};
```

---

## 🎯 EVENT-BASED APPROACH (Recommended)

### Step 1: Subscribe to tuyaData reports

```javascript
async onNodeInit({ zclNode }) {
  // Subscribe to Tuya DP reports
  this.registerAttrReportListener(
    'tuyaSpecific',
    'dataReport',
    (data) => this.onTuyaData(data),
    1 // endpoint
  );

  this.log('Tuya DP listener registered');
}
```

### Step 2: Parse incoming DP data

```javascript
async onTuyaData(data) {
  this.log('[TUYA-DP] Received data:', JSON.stringify(data));

  // Get DP mapping for this device
  const dpMap = this.getDpMapping();

  // Parse each DP value
  if (data.dpValues && Array.isArray(data.dpValues)) {
    for (const dpValue of data.dpValues) {
      const { dp, datatype, value } = dpValue;

      const mapping = dpMap[dp];
      if (mapping) {
        const convertedValue = this.convertDpValue(value, datatype, mapping);
        await this.setCapabilityValue(mapping.capability, convertedValue);

        this.log(`[TUYA-DP] DP ${dp} → ${mapping.capability} = ${convertedValue}`);
      }
    }
  }
}
```

### Step 3: DP mapping per device

```javascript
getDpMapping() {
  const modelId = this.getData().modelId;
  const mfrName = this.getData().manufacturerName;

  // Soil sensor (_TZE284_oitavov2)
  if (mfrName === '_TZE284_oitavov2') {
    return {
      1: { capability: 'measure_temperature', divisor: 10 },      // Temp in 0.1°C
      2: { capability: 'measure_humidity', divisor: 1 },          // Humidity %
      3: { capability: 'measure_humidity.soil', divisor: 1 },     // Soil %
      4: { capability: 'measure_battery', divisor: 1 }            // Battery %
    };
  }

  // Climate monitor (_TZE284_vvmbj46n)
  if (mfrName === '_TZE284_vvmbj46n') {
    return {
      1: { capability: 'measure_temperature', divisor: 10 },
      2: { capability: 'measure_humidity', divisor: 1 },
      4: { capability: 'measure_battery', divisor: 1 }
    };
  }

  // Radar sensor (_TZE200_rhgsbacq)
  if (mfrName === '_TZE200_rhgsbacq') {
    return {
      1: { capability: 'alarm_motion', convert: 'bool' },         // Motion
      9: { capability: 'measure_luminance', divisor: 1 },         // Lux
      14: { capability: 'measure_battery', divisor: 1 }           // Battery %
    };
  }

  // Fallback to settings
  return this.getStoreValue('tuya_dp_configuration') || {};
}
```

### Step 4: Value conversion

```javascript
convertDpValue(value, datatype, mapping) {
  // Boolean conversion
  if (mapping.convert === 'bool') {
    return value === 1 || value === true;
  }

  // Divisor for temperature/humidity
  if (mapping.divisor) {
    return value / mapping.divisor;
  }

  // Direct value
  return value;
}
```

---

## 🔄 POLLING APPROACH (Fallback)

### When to use:
- Initial device read after pairing
- Fallback if reporting doesn't work
- User-requested refresh

### Correct implementation:

```javascript
async pollTuyaDp(dp, datatype = 2) {
  try {
    // Use CORRECT API signature
    const result = await this.zclNode.endpoints[1].clusters.tuyaSpecific.dataQuery({
      dpValues: [
        {
          dp: dp,
          datatype: datatype,
          value: 0  // Placeholder
        }
      ]
    });

    this.log(`[TUYA-DP] Poll DP ${dp} success:`, result);
    return result;

  } catch (err) {
    this.error(`[TUYA-DP] Poll DP ${dp} failed:`, err.message);
    return null;
  }
}

// Example: Poll temperature (DP 1)
await this.pollTuyaDp(1, 2); // datatype 2 = VALUE
```

### Reasonable polling intervals:

```javascript
const TUYA_POLL_INTERVALS = {
  climate: 30 * 60 * 1000,   // 30 minutes
  soil: 60 * 60 * 1000,      // 1 hour
  radar: 5 * 60 * 1000       // 5 minutes (motion needs faster)
};
```

---

## 🎯 HYBRID APPROACH (Best)

### Combine reporting + polling:

```javascript
async onNodeInit({ zclNode }) {
  // 1. Subscribe to reports (primary)
  this.registerAttrReportListener(
    'tuyaSpecific',
    'dataReport',
    (data) => this.onTuyaData(data),
    1
  );

  // 2. Initial poll to get current values
  await this.initialPoll();

  // 3. Periodic poll as fallback (if reports stop)
  this.startFallbackPolling();
}

async initialPoll() {
  const dpMap = this.getDpMapping();

  for (const dp of Object.keys(dpMap)) {
    await this.pollTuyaDp(parseInt(dp), 2);
    await this.sleep(1000); // Don't spam device
  }
}

startFallbackPolling() {
  const interval = this.getPollingInterval();

  this.pollTimer = this.homey.setInterval(async () => {
    // Only poll if no recent reports
    const lastReport = this.getStoreValue('last_tuya_report');
    const now = Date.now();

    if (!lastReport || (now - lastReport) > interval * 2) {
      this.log('[TUYA-DP] No recent reports, fallback polling...');
      await this.initialPoll();
    }
  }, interval);
}

async onTuyaData(data) {
  // Mark last report time
  await this.setStoreValue('last_tuya_report', Date.now());

  // ... parse data ...
}
```

---

## 📊 COMPLETE EXAMPLE: climate_sensor_soil

### device.js (complete):

```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const BatteryManagerV2 = require('../../lib/BatteryManagerV2');

class TS0601SoilSensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('TS0601 Soil Sensor initialized');

    // Subscribe to Tuya DP reports
    this.registerAttrReportListener(
      'tuyaSpecific',
      'dataReport',
      (data) => this.onTuyaData(data),
      1
    );

    // Initial poll
    await this.initialPoll();

    // Battery manager
    this.batteryManager = new BatteryManagerV2(this);
    await this.batteryManager.startMonitoring();

    // Fallback polling (1h)
    this.startFallbackPolling(3600000);

    this.log('✅ Soil sensor ready');
  }

  async onTuyaData(data) {
    this.log('[TUYA-DP] Received:', JSON.stringify(data));
    await this.setStoreValue('last_tuya_report', Date.now());

    const dpMap = {
      1: { capability: 'measure_temperature', divisor: 10 },
      2: { capability: 'measure_humidity', divisor: 1 },
      3: { capability: 'measure_humidity.soil', divisor: 1 },
      4: { capability: 'measure_battery', divisor: 1 }
    };

    if (data.dpValues) {
      for (const dpValue of data.dpValues) {
        const { dp, value } = dpValue;
        const mapping = dpMap[dp];

        if (mapping) {
          const converted = mapping.divisor ? value / mapping.divisor : value;
          await this.setCapabilityValue(mapping.capability, converted);
          this.log(`DP ${dp} → ${mapping.capability} = ${converted}`);
        }
      }
    }
  }

  async initialPoll() {
    this.log('[TUYA-DP] Initial poll...');

    for (const dp of [1, 2, 3, 4]) {
      try {
        await this.zclNode.endpoints[1].clusters.tuyaSpecific.dataQuery({
          dpValues: [{ dp: dp, datatype: 2, value: 0 }]
        });
        await this.sleep(1000);
      } catch (err) {
        this.error(`Poll DP ${dp} failed:`, err.message);
      }
    }
  }

  startFallbackPolling(interval) {
    this.pollTimer = this.homey.setInterval(async () => {
      const lastReport = this.getStoreValue('last_tuya_report');
      const now = Date.now();

      if (!lastReport || (now - lastReport) > interval * 2) {
        await this.initialPoll();
      }
    }, interval);
  }

  async onDeleted() {
    if (this.pollTimer) this.homey.clearInterval(this.pollTimer);
    if (this.batteryManager) this.batteryManager.stopMonitoring();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = TS0601SoilSensor;
```

---

## ✅ CHECKLIST

### For each TS0601 driver:

- [ ] Subscribe to `tuyaData` reports
- [ ] Create DP mapping table (manufacturer-specific)
- [ ] Use correct dataQuery signature (dpValues)
- [ ] Initial poll with correct API
- [ ] Fallback polling (reasonable interval)
- [ ] Convert values correctly (divisor, bool, etc.)
- [ ] Update capabilities (no null values!)
- [ ] Test with real device

---

## 🎯 PRIORITY DEVICES

1. **climate_sensor_soil** (_TZE284_oitavov2)
   - DP 1: temperature
   - DP 2: humidity
   - DP 3: soil humidity
   - DP 4: battery

2. **climate_monitor_temp_humidity** (_TZE284_vvmbj46n)
   - DP 1: temperature
   - DP 2: humidity
   - DP 4: battery

3. **presence_sensor_radar** (_TZE200_rhgsbacq)
   - DP 1: motion (bool)
   - DP 9: luminance
   - DP 14: battery

---

## 📝 SUMMARY

### Before (broken):
```
dataQuery({ dp: 1 }) → ERROR
sendFrame fallback → FAIL
Values → null forever
```

### After (fixed):
```
1. Subscribe to tuyaData reports → Values arrive automatically
2. dataQuery({ dpValues: [...] }) → Correct API
3. Fallback polling → Reliability
4. Values → Real data!
```

---

**Created:** 2025-11-22
**Status:** 🔴 CRITICAL FIX REQUIRED
**Target:** v5.0.0 "Stable Edition"
