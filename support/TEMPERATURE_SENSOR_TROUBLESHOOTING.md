# Temperature Sensor Troubleshooting Guide

**Created:** Oct 17, 2025  
**Purpose:** Resolve common issues with Tuya Zigbee temperature sensors based on 8+ diagnostic reports

---

## 🔍 Common Issues

### Issue 1: Battery Not Reporting (Most Common)

**Symptoms:**
- Temperature readings work
- Humidity readings work
- Battery level shows 0% or never updates
- "Only temperature data and no battery level"

**Root Causes:**
1. **Wrong Driver Selected**
   - Device paired with generic driver
   - Missing manufacturer ID in correct driver
   
2. **Battery Cluster Not Configured**
   - Device doesn't support standard Zigbee battery reporting
   - Uses proprietary Tuya cluster instead

3. **Reporting Not Configured**
   - Battery reporting interval too long
   - Min/max interval mismatch

**Solutions:**

#### Step 1: Verify Manufacturer ID
```
Homey App → Device → Advanced Settings → Zigbee Information
Look for: "manufacturerName" and "modelId"
```

**Common Manufacturer IDs:**
- `_TZ3000_xxxxxxxxx` (standard Tuya)
- `_TZE200_xxxxxxxxx` (Tuya E series)
- `_TZE284_xxxxxxxxx` (Tuya advanced)
- `TS0201` (generic model)

#### Step 2: Check Driver Match
If your manufacturer ID is NOT in the driver list:
1. Submit diagnostic report
2. Provide manufacturer ID in response email
3. Wait for driver update
4. Re-pair device with updated driver

#### Step 3: Adjust Battery Settings
```
Device Settings → Battery Management:
- Battery reporting interval: 60 min (default)
- Low battery threshold: 20% (default)
- Enable battery notifications: ON
```

Try reducing interval to 30 minutes if battery not updating.

#### Step 4: Force Battery Read
1. Remove device battery for 10 seconds
2. Reinsert battery
3. Wait 2 minutes for device initialization
4. Check battery level in Homey app

---

### Issue 2: No Readings at All

**Symptoms:**
- "No reading" or "No data last 5 days"
- Temperature shows unavailable
- Humidity shows unavailable

**Root Causes:**
1. **Device Not Initialized**
   - Pairing incomplete
   - Zigbee mesh issue
   
2. **Wrong Driver Type**
   - TS0601 device using standard driver
   - Requires Tuya cluster handler
   
3. **Weak Zigbee Signal**
   - Device too far from Homey
   - Interference

**Solutions:**

#### For TS0601 Devices
TS0601 uses proprietary Tuya Zigbee protocol:
- ✅ App has special TS0601 handler
- ✅ Supported in temperature_sensor_battery driver
- ⚠️ May need specific manufacturer ID

**Check if TS0601:**
```
Device → Advanced Settings → Zigbee Information
If modelId = "TS0601" → Uses Tuya cluster 0xEF00 (61184)
```

**Fix:**
1. Verify app version ≥ v3.0.35 (TS0601 handler improved)
2. Re-pair device within 2m of Homey
3. Wait 5 minutes for full initialization
4. Check if temperature starts reporting

#### For Standard Devices
1. **Improve Zigbee Mesh:**
   - Add AC-powered Tuya devices as routers
   - Reduce distance to Homey
   - Minimize 2.4GHz interference

2. **Re-pair Device:**
   ```
   - Factory reset sensor (hold button 10s)
   - Remove from Homey
   - Clear Zigbee network entry
   - Pair again within 2m
   - Wait 5 minutes
   ```

---

### Issue 3: Temperature Identified Incorrectly

**Symptoms:**
- "Temperature sensor identified incorrectly"
- Wrong device icon
- Missing capabilities (humidity, motion, etc.)

**Root Cause:**
Multiple driver types match device fingerprint:
- `temperature_sensor_battery`
- `temperature_humidity_sensor_battery`
- `temp_sensor_pro_battery`
- `temp_humid_sensor_advanced_battery`

**Solution:**

#### Identify Correct Driver
1. **Check Device Features:**
   - Temperature only → `temperature_sensor_battery`
   - Temp + Humidity → `temperature_humidity_sensor_battery`
   - Temp + Humidity + Motion → `temp_sensor_pro_battery`
   - Temp + Humidity + Display → `temp_humid_sensor_dd_battery`

2. **Re-pair with Correct Driver:**
   ```
   - Remove device from Homey
   - Start pairing process
   - Search for SPECIFIC driver name
   - Don't use "Any device" option
   - Pair device
   ```

3. **Provide Manufacturer ID:**
   If driver not found, send diagnostic with:
   - Manufacturer ID
   - Model ID
   - Device features list
   → We'll add to correct driver

---

### Issue 4: Partial Data Reporting

**Symptoms:**
- "Temp reading now, rest no data last 5 days"
- Temperature works, humidity doesn't
- Random data gaps

**Root Causes:**
1. **Low Battery**
   - Device conserving power
   - Reduced reporting frequency

2. **Reporting Configuration**
   - Different intervals for temp/humidity
   - Attributes not bound correctly

3. **Zigbee Network Issues**
   - Intermittent connectivity
   - Weak signal

**Solutions:**

#### Check Battery Level
```
If battery < 20%:
1. Replace battery
2. Wait 5 minutes
3. Check if all readings return
```

#### Adjust Reporting Intervals
```
Device Settings → SDK3 Advanced Settings:
- Temperature threshold: 0.5°C change triggers report
- Humidity threshold: 5% change triggers report
- Battery reporting: 60 min
```

**Recommended Settings for Stable Reporting:**
```json
{
  "temperature_calibration": 0,
  "temperature_threshold": 0.5,
  "humidity_threshold": 5,
  "battery_reporting_interval": 30,
  "low_battery_threshold": 20
}
```

#### Force Re-initialization
```
1. Remove battery
2. Wait 30 seconds
3. Reinsert battery
4. Press reset button 3x quickly
5. Wait 5 minutes
6. Check all capabilities
```

---

## 📊 Diagnostic Checklist

Before submitting diagnostic report, verify:

- [ ] App version ≥ v3.0.37 (critical fixes)
- [ ] Device within 5m of Homey or router
- [ ] Battery > 30%
- [ ] Manufacturer ID noted
- [ ] Model ID noted
- [ ] Device features identified
- [ ] Driver name used for pairing
- [ ] Waited 5+ minutes after pairing
- [ ] Tested battery removal/reinsertion
- [ ] Checked Zigbee mesh health

---

## 🆔 Manufacturer ID Reference

### Temperature Only
| Manufacturer ID | Model | Notes |
|----------------|-------|-------|
| `_TZ3000_fllyghyj` | TS0201 | Standard temp sensor |
| `_TZ3000_8nkb7mof` | TS0201 | With battery |
| `_TZE200_bjawzodf` | TS0201 | E series |

### Temperature + Humidity
| Manufacturer ID | Model | Notes |
|----------------|-------|-------|
| `_TZ3000_bgsigers` | TY0201 | Standard temp/humid |
| `_TZE200_hhrtiq0x` | TS0201 | With display |
| `_TZ3210_ncw88jfq` | TY0201 | New 2024 model |

### Temperature + Humidity + Motion
| Manufacturer ID | Model | Notes |
|----------------|-------|-------|
| `_TZ3000_mmtwjmaq` | TS0202 | PIR motion |
| `_TZ3000_kmh5qpmb` | TS0202 | Advanced PIR |

### TS0601 (Proprietary)
| Manufacturer ID | Type | Handler |
|----------------|------|---------|
| `_TZE284_*` | Advanced | Tuya cluster 0xEF00 |
| `_TZE200_*` | E series | Tuya cluster 0xEF00 |

**If your manufacturer ID is NOT listed:**
→ Submit diagnostic report with manufacturer ID
→ We'll add it to correct driver in next update

---

## 📧 Submitting Diagnostic Report

**When to Submit:**
- Battery not reporting after 24 hours
- No readings after re-pairing
- Manufacturer ID not recognized
- Device features don't match driver

**What to Include:**
1. **Manufacturer ID** (from Zigbee Information)
2. **Model ID** (from Zigbee Information)
3. **Device Features** (temp only? temp+humid? motion?)
4. **Driver Used** (which driver did you pair with?)
5. **Active Diagnostic** (test device WHILE submitting log)
6. **App Version** (current installed version)

**How to Submit:**
```
Homey App → Settings → Apps → Universal Tuya Zigbee
→ Send Diagnostic Report
→ Include message with above info
→ Test device (press button, check readings)
→ Submit immediately
```

---

## 🔧 Quick Fixes Summary

| Symptom | Quick Fix |
|---------|-----------|
| Battery not reporting | Remove/reinsert battery, wait 5 min |
| No readings | Re-pair within 2m, wait 5 min |
| Wrong driver | Remove device, pair with specific driver |
| Partial data | Replace battery if < 20% |
| TS0601 issues | Update to v3.0.37+, re-pair |
| Weak signal | Add AC router devices |

---

## 🆘 Still Not Working?

1. **Update App:** Ensure v3.0.37+ installed
2. **Check Homey:** Version ≥ 12.2.0 required
3. **Factory Reset:** Device + clear Zigbee network entry
4. **Send Diagnostic:** With manufacturer ID + model ID
5. **Community Forum:** [Homey Community](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test)

---

**Last Updated:** Oct 17, 2025 @ 07:00  
**Based On:** 8 diagnostic reports (Oct 15-16, 2025)  
**Document:** `docs/support/TEMPERATURE_SENSOR_TROUBLESHOOTING.md`
