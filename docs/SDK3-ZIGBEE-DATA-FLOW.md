# SDK3 Zigbee Data Flow - Universal Tuya Zigbee

## 1️⃣ Zigbee data path in Universal Tuya Zigbee (SDK-3)

| Step | Code location | What happens |
|------|---------------|--------------|
| 1 | `onPair()` | `Homey.zigbee.getDevices()` → list of **unpaired** Zigbee nodes |
| 2 | `onInit()` | `ZigBeeDevice` created → **clusters** parsed → **EF00** detected → **TuyaEF00Manager** started |
| 3 | `TuyaEF00Manager.init()` | Time-sync → **DP listeners** registered → **getData(DP_X)** queued |
| 4 | `dataReport` event | **Only asynchronous path** for battery devices → payload pushed to **capability setters** |
| 5 | `onSettings()` / Flow cards | **Synchronous** : read last cached value → **NO new Zigbee traffic** |

---

## 2️⃣ Typical failure patterns observed in the logs

| Symptom | Root cause | Quick check |
|---------|------------|-------------|
| **DP timeout** (DP 1,2,3… → "normal for battery devices") | Device is **sleeping** | Wait 4-24 h **or** force wake-up |
| **Battery % = 0** or **never updates** | No `dataReport` received | Look for **"ZCL Data: 0"** in status report |
| **Voltage = null** | `genPowerCfg` cluster **not present** on **mains** device | Log : *"Mains-powered device - no battery reporting needed"* |
| **Flow card error** : `Invalid Flow Card ID: xxx_measure_battery_changed` | Capability **removed** but **flow card still registered** | Search stderr for **"Invalid Flow Card ID"** |
| **KPI missing** (temp, humidity, etc.) | **DP not mapped** → capability **never set** → KPI = 0 | Look for **"Target capabilities: []"** |
| **Device added but driver wrong** | `manufacturerName` not in **driver filter** → falls back to **generic** | Log : *"No profile for unknown/unknown"* |

---

## 3️⃣ Fixes implemented in v5.3.15

### A. Battery / voltage not reported

**Problem** : mains-powered curtain motor tries to expose `measure_battery` → flow card missing.

**Fix** : remove capability **before** registering flow cards.

```js
// In device onInit()
if (this.isMainsPowered()) {
  await this.removeCapability('measure_battery');
}
```

### B. Flow card crash when capability removed

**Problem** : Homey pre-registers cards from `app.json` even if capability is absent.

**Fix** : Check capability exists before triggering flow cards.

```js
if (this.hasCapability('measure_battery')) {
  this.homey.flow.getDeviceTriggerCard('low_battery_warning')
    .trigger(this, { device_name: this.getName(), battery_level: level });
}
```

### C. Battery device never wakes up → KPI = 0

**Problem** : `getData()` always times out → no initial value.

**Fix** : Set **default value** on timeout so KPI ≠ null.

```js
// TuyaEF00Manager.js - on DP timeout for battery DPs
if ([4, 10, 14, 15, 101].includes(dp)) {
  const currentBattery = this.device.getCapabilityValue?.('measure_battery');
  if (currentBattery === null || currentBattery === undefined) {
    this.device.setCapabilityValue?.('measure_battery', 100).catch(() => {});
  }
}
```

### D. Voltage not shown (USB / mains)

**Problem** : `genPowerCfg` cluster absent → no `measure_voltage`.

**Fix** : Expose **raw supply mV** from **DP 247** (present on many Tuya USB devices).

```js
// TuyaEF00Manager.js - _applyDPValue()
if (dp === 247 && this.device.hasCapability?.('measure_voltage')) {
  const voltage = typeof value === 'number' ? value / 1000 :
                 (Buffer.isBuffer(value) ? value.readUInt16BE(0) / 1000 : 0);
  if (voltage > 0 && voltage < 300) {
    this.device.setCapabilityValue('measure_voltage', voltage).catch(() => {});
  }
}
```

### E. KPI / data not pushed to Insights

**Problem** : capability set **but** `preventInsights: true` in driver JSON.

**Fix** : remove or set to `false` in `capabilitiesOptions`.

```json
"capabilitiesOptions": {
  "measure_battery": {
    "preventInsights": false
  }
}
```

---

## 4️⃣ Check-list "data health" for support

| Check | How |
|-------|-----|
| ✅ Device wakes up | **Triple-press button** or **insert battery** |
| ✅ Right driver | **Settings → Advanced → Driver** matches product |
| ✅ Capabilities present | **Device tile** shows expected tiles |
| ✅ Flow cards exist | **Flow editor** → device → cards appear |
| ✅ Insights populated | **Device → Insights** → graph ≠ empty |
| ✅ Voltage visible | **Device settings** → "Show raw voltage" enabled |

---

## 5️⃣ Battery DP Reference

| DP | Usage | Device Types |
|----|-------|--------------|
| 4 | Battery % (0-100) | Most sensors |
| 10 | Battery % (alternate) | Some climate sensors |
| 14 | Battery % | PIR sensors |
| 15 | Battery % | Contact sensors |
| 33 | Battery voltage (mV) | Some devices |
| 35 | Battery low alarm | Older devices |
| 101 | Battery % | Some newer devices |
| 247 | Supply voltage (mV) | USB/mains devices |

---

## 6️⃣ Reply template for users

```
Hi <user>,

Thanks for the detailed logs!

### 1. Battery / voltage not updating
- **Cause**: device is sleeping → no data until it wakes up
- **Fix**: triple-press the button or remove/re-insert battery once
→ You should see "dataReport" in the log within 30s

### 2. Flow card error
- **Cause**: driver tried to expose measure_battery on a mains device
- **Fix**: v5.3.15+ removes wrong capability automatically

### 3. Driver mismatch
- **Cause**: device paired as generic
- **Fix**: remove device, re-pair and choose correct driver

### 4. KPI empty
- **Cause**: capability not set (timeout)
- **Fix**: wait for first wake-up or manually trigger sensor

Best regards,
Dylan Rajasekaram
Author – Universal Tuya Zigbee
```

---

*Last updated: 2025-12-02 - v5.3.15*
