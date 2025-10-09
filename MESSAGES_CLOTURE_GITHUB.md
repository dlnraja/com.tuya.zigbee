# 📝 MESSAGES DE CLÔTURE GITHUB ISSUES

## Issue #26 - TS0210 Vibration Sensor

**Title:** [DEVICE] TS0210 vibration sensor
**Reporter:** gfi63
**Status:** ✅ CLOSED - FIXED

**Message de clôture:**
```
✅ **FIXED in v2.1.31**

Hi @gfi63,

Your TS0210 vibration sensor is now fully supported! The bug that was causing it to be detected as a "wall switch" instead of a "vibration sensor" has been fixed.

**What was fixed:**
- ✅ Added `TS0210` to productId list
- ✅ Added `_TZ3000_lqpt3mvr` manufacturer support
- ✅ Device now correctly detected as "Vibration Sensor"

**Driver:** `vibration_sensor`
**Location:** `drivers/vibration_sensor/`

**Capabilities:**
- `alarm_motion` - Vibration detection
- `measure_battery` - Battery level
- `measure_temperature` - Temperature
- `onoff` - On/off state
- `measure_luminance` - Luminance

**How to use:**
1. Update app to v2.1.31 (available on Test channel)
2. Remove old device if incorrectly paired
3. Re-pair the sensor
4. It will now be detected as "Vibration Sensor" ✅

Thank you for reporting this issue and providing the interview data! 🙏

**Links:**
- Test app: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
- Commit: https://github.com/dlnraja/com.tuya.zigbee/commit/d730fc7c1
```

---

## Issue #27 - TS011F Outlet with Metering

**Title:** [DEVICE] TS011F (not recognized by Homey)
**Reporter:** gfi63
**Status:** ✅ CLOSED - ADDED

**Message de clôture:**
```
✅ **ADDED in v2.1.31**

Hi @gfi63,

Your TS011F outlet with energy metering is now fully supported!

**What was added:**
- ✅ Added `_TZ3000_npg02xft` manufacturer support
- ✅ Full energy monitoring capabilities enabled

**Driver:** `energy_monitoring_plug_advanced`
**Location:** `drivers/energy_monitoring_plug_advanced/`

**Capabilities:**
- `onoff` - Switch on/off
- `measure_power` - Instantaneous power (W)
- `meter_power` - Total consumption (kWh)
- `measure_voltage` - Voltage (V)
- `measure_current` - Current (A)

**How to use:**
1. Update app to v2.1.31 (available on Test channel)
2. Add device via "Universal Tuya Zigbee" → "Energy Monitoring Plug Advanced"
3. Device will show all energy metrics in Homey

The device supports clusters: 3, 4, 5, 6, 1794 (metering), 2820 (electrical measurement), making it a full-featured smart outlet with real-time energy monitoring! ⚡

Thank you for the detailed interview data! 🙏

**Links:**
- Test app: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
- Commit: https://github.com/dlnraja/com.tuya.zigbee/commit/59c89f3ca
```

---

## Issue #28 - ZG-204ZV Motion + Temp + Humidity + Illumination Sensor

**Title:** [DEVICE] ZG-204ZV Motion, Temp, Humidity and Illumination Sensor
**Reporter:** kodalissri
**Status:** ✅ CLOSED - ADDED WITH NEW DRIVER

**Message de clôture:**
```
✅ **NEW DRIVER CREATED in v2.1.31**

Hi @kodalissri,

Your ZG-204ZV multi-sensor is now fully supported with a brand new dedicated driver! 🎉

**What was added:**
- ✅ New driver created: `motion_temp_humidity_illumination_sensor`
- ✅ Full support for all 5 sensors in one device

**Driver:** `motion_temp_humidity_illumination_sensor`
**Location:** `drivers/motion_temp_humidity_illumination_sensor/`

**Supported manufacturers:**
- HOBEIAN
- _TZE200_uli8wasj
- _TZE200_grgol3xp
- _TZE200_rhgsbacq
- _TZE200_y8jijhba

**Supported products:**
- TS0601
- ZG-204ZM (model variant)

**All 5 sensor capabilities:**
1. `alarm_motion` - Millimeter wave radar motion detection
2. `measure_temperature` - Temperature in °C (with calibration support)
3. `measure_humidity` - Humidity in % (with calibration support)
4. `measure_luminance` - Illuminance in lux
5. `measure_battery` - Battery level

**Zigbee clusters supported:**
- Cluster 0 (Basic)
- Cluster 1 (Power Configuration)
- Cluster 1024 (Illuminance Measurement)
- Cluster 1026 (Temperature Measurement)
- Cluster 1029 (Relative Humidity)
- Cluster 1280 (IAS Zone)
- Cluster 61184 (Tuya Proprietary)

**How to use:**
1. Update app to v2.1.31 (available on Test channel)
2. Add device via "Universal Tuya Zigbee" → "Motion Temp Humidity Illumination Sensor (ZG-204ZV)"
3. All 5 sensors will be available in Homey

This is a fantastic all-in-one sensor! Perfect for smart home automation. Thank you for the detailed interview and product links! 🙏

**Product link:** https://a.aliexpress.com/_mrlhbgN

**Links:**
- Test app: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
- Commit: https://github.com/dlnraja/com.tuya.zigbee/commit/d730fc7c1
```

---

## Issue #29 - ZG-204ZM PIR Radar Illumination Sensor

**Title:** [DEVICE] ZG-204ZM PIR radar and illumination sensor
**Reporter:** kodalissri
**Status:** ✅ CLOSED - ADDED WITH NEW DRIVER

**Message de clôture:**
```
✅ **NEW DRIVER CREATED in v2.1.31**

Hi @kodalissri,

Your ZG-204ZM PIR + Radar + Illumination sensor is now fully supported with a brand new dedicated driver! 🎉

**What was added:**
- ✅ New driver created: `pir_radar_illumination_sensor`
- ✅ Hybrid PIR + 24GHz radar motion detection
- ✅ Illuminance measurement support

**Driver:** `pir_radar_illumination_sensor`
**Location:** `drivers/pir_radar_illumination_sensor/`

**Supported manufacturers:**
- HOBEIAN
- _TZE200_2aaelwxk
- _TZE200_kb5noeto
- _TZE200_tyffvoij

**Supported products:**
- TS0601
- ZG-204ZM

**Sensor capabilities:**
1. `alarm_motion` - Hybrid PIR + 24GHz radar motion detection (reduces false positives!)
2. `measure_luminance` - Illuminance measurement in lux
3. `measure_battery` - Battery level monitoring

**Advanced features (via Tuya datapoints):**
- Motion state detection: none / large motion / small motion / static presence
- Configurable fading time (presence keep time): 0-28800s
- Static detection distance: 0-10m with 0.01m precision
- Static detection sensitivity: 0-10 levels
- LED indicator control
- Motion detection modes: only_pir / pir_and_radar / only_radar
- Motion detection sensitivity: 0-10 levels

**Zigbee clusters supported:**
- Cluster 0 (Basic)
- Cluster 1 (Power Configuration)
- Cluster 1024 (Illuminance Measurement)
- Cluster 1030 (Occupancy Sensing)
- Cluster 1280 (IAS Zone)
- Cluster 61184 (Tuya Proprietary)

**How to use:**
1. Update app to v2.1.31 (available on Test channel)
2. Add device via "Universal Tuya Zigbee" → "PIR Radar Illumination Sensor (ZG-204ZM)"
3. Configure motion detection mode and sensitivity in device settings

This sensor combines PIR and 24GHz radar for accurate human presence detection with minimal false alarms. Perfect for automation! 🚀

Thank you for the comprehensive interview data and Zigbee2MQTT compatibility info! 🙏

**Product link:** https://a.aliexpress.com/_mKcJ8RJ

**Links:**
- Test app: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
- Zigbee2MQTT reference: https://www.zigbee2mqtt.io/devices/ZG-204ZM.html
- Commit: https://github.com/dlnraja/com.tuya.zigbee/commit/d730fc7c1
```

---

## Issue #30 - TS0041 1-Gang Button

**Title:** [DEVICE] TS0041
**Reporter:** askseb
**Status:** ✅ CLOSED - ADDED

**Message de clôture:**
```
✅ **ADDED in v2.1.31**

Hi @askseb,

Your TS0041 1-gang button is now fully supported!

**What was added:**
- ✅ Added `_TZ3000_yj6k7vfo` manufacturer support
- ✅ Support for 1 push and 2 push (single/double click)

**Driver:** `wireless_switch_1gang_cr2032`
**Location:** `drivers/wireless_switch_1gang_cr2032/`

**Capabilities:**
- `onoff` - Button press detection
- `dim` - Dimmer control support
- `measure_battery` - Battery level (CR2032)

**Button functions:**
- Single press (1 push)
- Double press (2 push)
- Long press support

**How to use:**
1. Update app to v2.1.31 (available on Test channel)
2. Add device via "Universal Tuya Zigbee" → "Aqara Button" (or "Wireless Switch 1-Gang")
3. Configure button actions in Homey flows

Perfect for creating wireless smart home controls! You can use it to:
- Toggle lights on/off
- Control dimmers
- Trigger scenes
- Execute any Homey flow

Thank you for the request! 🙏

**Links:**
- Test app: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
- Commit: https://github.com/dlnraja/com.tuya.zigbee/commit/59c89f3ca
```

---

## Issue #31 - TS0203 Door Sensor

**Title:** [DEVICE] TS0203
**Reporter:** askseb
**Status:** ✅ CLOSED - ADDED

**Message de clôture:**
```
✅ **ADDED in v2.1.31**

Hi @askseb,

Your TS0203 door sensor is now fully supported!

**What was added:**
- ✅ Added `_TZ3000_okohwwap` manufacturer support
- ✅ Full door/window contact detection

**Driver:** `door_window_sensor`
**Location:** `drivers/door_window_sensor/`

**Capabilities:**
- `alarm_contact` - Door/window open/closed detection (PRIMARY)
- `onoff` - On/off state
- `measure_battery` - Battery level
- `measure_temperature` - Temperature (if supported by your variant)
- `alarm_motion` - Motion detection (if supported)
- `measure_luminance` - Luminance (if supported)

**How to use:**
1. Update app to v2.1.31 (available on Test channel)
2. Add device via "Universal Tuya Zigbee" → "Door Window Sensor"
3. Use in Homey flows to trigger actions when door/window opens or closes

Perfect for:
- Security monitoring
- Automation triggers (lights on when door opens)
- Notifications when doors/windows are left open
- Energy saving (HVAC control based on window state)

Thank you for the request! 🙏

**Links:**
- Test app: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
- Commit: https://github.com/dlnraja/com.tuya.zigbee/commit/59c89f3ca
```

---

## Issue #32 - TS0201 Temperature & Humidity Sensor with Screen

**Title:** [DEVICE] TS0201 Temp and Humidity Sensor with Screen
**Reporter:** kodalissri
**Status:** ✅ CLOSED - ADDED

**Message de clôture:**
```
✅ **ADDED in v2.1.31**

Hi @kodalissri,

Your TS0201 temperature & humidity sensor with LCD screen is now fully supported!

**What was added:**
- ✅ Added `_TZ3000_bgsigers` manufacturer support
- ✅ Full temperature & humidity monitoring
- ✅ LCD screen compatibility

**Driver:** `temperature_humidity_sensor`
**Location:** `drivers/temperature_humidity_sensor/`

**Capabilities:**
- `measure_temperature` - Temperature in °C
- `measure_humidity` - Humidity in %
- `measure_battery` - Battery level
- `alarm_motion` - Motion detection (if variant supports it)
- `measure_luminance` - Luminance (if variant supports it)

**Special feature:**
- ✅ **LCD Screen** - Your device has a built-in display showing temperature and humidity locally

**How to use:**
1. Update app to v2.1.31 (available on Test channel)
2. Add device via "Universal Tuya Zigbee" → "Temperature Humidity Sensor"
3. Monitor temperature and humidity in Homey
4. Use in flows for climate automation

Perfect for:
- Climate monitoring
- HVAC automation
- Humidity control (dehumidifier/humidifier triggers)
- Comfort notifications
- Data logging

The LCD screen provides local viewing without needing to open the Homey app! 📊

Thank you for providing the AliExpress link! 🙏

**Product link:** https://www.aliexpress.com/item/1005007816835463.html

**Links:**
- Test app: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
- Commit: https://github.com/dlnraja/com.tuya.zigbee/commit/59c89f3ca
```

---

## 📝 INSTRUCTIONS POUR CLÔTURER

Pour chaque issue, copiez le message correspondant et postez-le sur GitHub, puis fermez l'issue avec le label `✅ Fixed` ou `✅ Added`.

**Ordre de clôture:**
1. #26 (Bug Fix) → Label: `bug`, `fixed`
2. #27 (Added) → Label: `enhancement`, `added`
3. #28 (New Driver) → Label: `enhancement`, `new-driver`
4. #29 (New Driver) → Label: `enhancement`, `new-driver`
5. #30 (Added) → Label: `enhancement`, `added`
6. #31 (Added) → Label: `enhancement`, `added`
7. #32 (Added) → Label: `enhancement`, `added`
