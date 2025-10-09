# 🎯 ACTIONS À FAIRE MAINTENANT

## ✅ ÉTAPE 1: POSTER SUR LE FORUM HOMEY

### 📍 Lien du forum:
https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352

### 📝 Actions:
1. Ouvre le lien ci-dessus
2. Scroll jusqu'en bas pour "Reply"
3. Copie **TOUT** le contenu de `FORUM_POST_ENGLISH.md`
4. Colle dans la réponse
5. Clique "Reply" pour publier

**Le message va automatiquement notifier:** @Gerrit_Fikse, @kodalissri, @askseb, @gfi63

---

## ✅ ÉTAPE 2: CLÔTURER LES ISSUES GITHUB

### 📌 Issue #26 - TS0210 Vibration Sensor
**Lien:** https://github.com/dlnraja/com.tuya.zigbee/issues/26

**Texte à poster:**
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

**Actions:**
1. Ouvre le lien de l'issue
2. Scroll jusqu'en bas
3. Copie-colle le texte ci-dessus
4. Clique "Comment"
5. Clique "Close issue"
6. Ajoute les labels: `bug`, `fixed`

---

### 📌 Issue #27 - TS011F Outlet
**Lien:** https://github.com/dlnraja/com.tuya.zigbee/issues/27

**Texte à poster:**
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

**Actions:** Même chose (Comment → Close → Labels: `enhancement`, `added`)

---

### 📌 Issue #28 - ZG-204ZV Multi-Sensor
**Lien:** https://github.com/dlnraja/com.tuya.zigbee/issues/28

**Texte à poster:**
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

**All 5 sensor capabilities:**
1. `alarm_motion` - Millimeter wave radar motion detection
2. `measure_temperature` - Temperature in °C
3. `measure_humidity` - Humidity in %
4. `measure_luminance` - Illuminance in lux
5. `measure_battery` - Battery level

**How to use:**
1. Update app to v2.1.31 (available on Test channel)
2. Add device via "Universal Tuya Zigbee" → "Motion Temp Humidity Illumination Sensor (ZG-204ZV)"
3. All 5 sensors will be available in Homey

This is a fantastic all-in-one sensor! Perfect for smart home automation. Thank you for the detailed interview! 🙏

**Product link:** https://a.aliexpress.com/_mrlhbgN
**Test app:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/
**Commit:** https://github.com/dlnraja/com.tuya.zigbee/commit/d730fc7c1
```

**Actions:** Comment → Close → Labels: `enhancement`, `new-driver`

---

### 📌 Issue #29 - ZG-204ZM PIR Radar Sensor
**Lien:** https://github.com/dlnraja/com.tuya.zigbee/issues/29

**Texte à poster:**
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

**Sensor capabilities:**
1. `alarm_motion` - Hybrid PIR + 24GHz radar (reduces false positives!)
2. `measure_luminance` - Illuminance in lux
3. `measure_battery` - Battery level

**Advanced features:**
- Motion state: none / large / small / static presence
- Configurable fading time: 0-28800s
- Static detection distance: 0-10m (0.01m precision)
- Detection modes: only_pir / pir_and_radar / only_radar
- Adjustable sensitivity levels

**How to use:**
1. Update app to v2.1.31 (available on Test channel)
2. Add device via "Universal Tuya Zigbee" → "PIR Radar Illumination Sensor (ZG-204ZM)"
3. Configure settings in device options

Perfect for accurate presence detection with minimal false alarms! 🚀

**Product link:** https://a.aliexpress.com/_mKcJ8RJ
**Test app:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/
**Zigbee2MQTT:** https://www.zigbee2mqtt.io/devices/ZG-204ZM.html
**Commit:** https://github.com/dlnraja/com.tuya.zigbee/commit/d730fc7c1
```

**Actions:** Comment → Close → Labels: `enhancement`, `new-driver`

---

### 📌 Issue #30 - TS0041 Button
**Lien:** https://github.com/dlnraja/com.tuya.zigbee/issues/30

**Texte à poster:**
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
2. Add device via "Universal Tuya Zigbee" → "Wireless Switch 1-Gang"
3. Configure button actions in Homey flows

Perfect for wireless smart home controls! 🎮

**Test app:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/
**Commit:** https://github.com/dlnraja/com.tuya.zigbee/commit/59c89f3ca
```

**Actions:** Comment → Close → Labels: `enhancement`, `added`

---

### 📌 Issue #31 - TS0203 Door Sensor
**Lien:** https://github.com/dlnraja/com.tuya.zigbee/issues/31

**Texte à poster:**
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
- `alarm_contact` - Door/window open/closed (PRIMARY)
- `onoff` - On/off state
- `measure_battery` - Battery level
- `measure_temperature` - Temperature
- `alarm_motion` - Motion detection
- `measure_luminance` - Luminance

**How to use:**
1. Update app to v2.1.31 (available on Test channel)
2. Add device via "Universal Tuya Zigbee" → "Door Window Sensor"
3. Use in flows for automation

Perfect for:
- Security monitoring
- Automation triggers
- Notifications
- Energy saving

**Test app:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/
**Commit:** https://github.com/dlnraja/com.tuya.zigbee/commit/59c89f3ca
```

**Actions:** Comment → Close → Labels: `enhancement`, `added`

---

### 📌 Issue #32 - TS0201 Temp/Humidity Screen
**Lien:** https://github.com/dlnraja/com.tuya.zigbee/issues/32

**Texte à poster:**
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
- **LCD Screen** - Local display without app!

**How to use:**
1. Update app to v2.1.31 (available on Test channel)
2. Add device via "Universal Tuya Zigbee" → "Temperature Humidity Sensor"
3. Use in climate automation flows

Perfect for climate monitoring and HVAC automation! 📊

**Product link:** https://www.aliexpress.com/item/1005007816835463.html
**Test app:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/
**Commit:** https://github.com/dlnraja/com.tuya.zigbee/commit/59c89f3ca
```

**Actions:** Comment → Close → Labels: `enhancement`, `added`

---

## 📊 RÉSUMÉ DES ACTIONS

✅ **1 post forum Homey** (avec notifications automatiques)
✅ **7 issues GitHub à clôturer** avec messages détaillés

**Temps estimé:** 10-15 minutes pour tout faire

**Ordre recommandé:**
1. D'abord poster sur le forum (impact immédiat sur la communauté)
2. Ensuite clôturer les issues GitHub une par une

**Tous les textes sont prêts à copier-coller !** 🚀
