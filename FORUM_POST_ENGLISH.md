# 📢 NEW VERSION 2.1.31 AVAILABLE ON TEST CHANNEL! 

Hello everyone! 👋

I'm excited to announce that **all devices requested** on the forum and GitHub have been added to the **Universal Tuya Zigbee** app! 

Version **2.1.31** is now available on the **Test channel** and will soon be certified for the Live channel.

---

## ✅ DEVICES ADDED - Your Requests Processed!

### 🔴 @Gerrit_Fikse - Vibration Sensor TS0210 (Issue #26)
**Status:** ✅ **FIXED AND WORKING**

Your vibration sensor is now correctly detected! The bug that made it appear as a "wall switch" has been fixed.

**Supported device:**
- ✅ Model: TS0210
- ✅ Manufacturer: _TZ3000_lqpt3mvr
- ✅ Type: Vibration Sensor
- ✅ Driver: `vibration_sensor`

**Homey Capabilities:**
- Vibration detection (`alarm_motion`)
- Battery level (`measure_battery`)
- Temperature (`measure_temperature`)

**🔗 Product:** [Amazon Link](https://www.amazon.nl/-/en/Aprilsunnyzone-Vibration-Sensor-Zigbee-Control/dp/B0DM6637SN)

**How to use:**
1. Install version 2.1.31 from the Test channel
2. Remove the old device (if incorrectly detected)
3. Re-pair the sensor
4. It will now be detected as "Vibration Sensor" ✅

---

### 🔴 @kodalissri - ZG-204ZM PIR Radar Illumination Sensor (Issue #29)
**Status:** ✅ **ADDED WITH NEW DRIVER**

**Supported device:**
- ✅ Model: ZG-204ZM / TS0601
- ✅ Manufacturer: HOBEIAN, _TZE200_2aaelwxk, _TZE200_kb5noeto, _TZE200_tyffvoij
- ✅ Type: PIR + Radar + Illumination Sensor
- ✅ Driver: `pir_radar_illumination_sensor`

**Homey Capabilities:**
- PIR + Radar motion detection (`alarm_motion`)
- Illuminance measurement in lux (`measure_luminance`)
- Battery level (`measure_battery`)

**🔗 Product:** [AliExpress Link](https://a.aliexpress.com/_mKcJ8RJ)

---

### 🔴 @kodalissri - ZG-204ZV Multi-Sensor (Issue #28)
**Status:** ✅ **ADDED WITH NEW DRIVER**

**Supported device:**
- ✅ Model: ZG-204ZV / TS0601
- ✅ Manufacturer: HOBEIAN, _TZE200_uli8wasj, _TZE200_grgol3xp, _TZE200_rhgsbacq, _TZE200_y8jijhba
- ✅ Type: Motion + Temp + Humidity + Illumination Sensor (4-in-1)
- ✅ Driver: `motion_temp_humidity_illumination_sensor`

**Homey Capabilities:**
- mmWave radar motion detection (`alarm_motion`)
- Temperature in °C (`measure_temperature`)
- Humidity in % (`measure_humidity`)
- Illuminance in lux (`measure_luminance`)
- Battery level (`measure_battery`)

**🔗 Product:** [AliExpress Link](https://a.aliexpress.com/_mrlhbgN)

---

### 🔴 @askseb - TS0041 Button (Issue #30)
**Status:** ✅ **ADDED**

**Supported device:**
- ✅ Model: TS0041
- ✅ Manufacturer: _TZ3000_yj6k7vfo
- ✅ Type: 1-gang wireless button (single/double click)
- ✅ Driver: `wireless_switch_1gang_cr2032`

**Homey Capabilities:**
- Single/double click button support
- On/off control
- Dimmer support
- Battery level

---

### 🔴 @askseb - TS0203 Door Sensor (Issue #31)
**Status:** ✅ **ADDED**

**Supported device:**
- ✅ Model: TS0203
- ✅ Manufacturer: _TZ3000_okohwwap
- ✅ Type: Door/Window Contact Sensor
- ✅ Driver: `door_window_sensor`

**Homey Capabilities:**
- Door/window open/closed detection (`alarm_contact`)
- Optional motion detection
- Temperature
- Illuminance
- Battery level

---

### 🔴 @kodalissri - TS0201 Temp/Humidity with Screen (Issue #32)
**Status:** ✅ **ADDED**

**Supported device:**
- ✅ Model: TS0201
- ✅ Manufacturer: _TZ3000_bgsigers
- ✅ Type: Temperature & Humidity Sensor with LCD Screen
- ✅ Driver: `temperature_humidity_sensor`

**Homey Capabilities:**
- Temperature in °C (`measure_temperature`)
- Humidity in % (`measure_humidity`)
- Battery level (`measure_battery`)
- Built-in LCD display

**🔗 Product:** [AliExpress Link](https://www.aliexpress.com/item/1005007816835463.html)

---

### 🔴 @gfi63 - TS011F Outlet with Metering (Issue #27)
**Status:** ✅ **ADDED**

**Supported device:**
- ✅ Model: TS011F
- ✅ Manufacturer: _TZ3000_npg02xft
- ✅ Type: Smart Outlet with Energy Monitoring
- ✅ Driver: `energy_monitoring_plug_advanced`

**Homey Capabilities:**
- On/off control (`onoff`)
- Instantaneous power in W (`measure_power`)
- Total consumption in kWh (`meter_power`)
- Voltage in V (`measure_voltage`)
- Current in A (`measure_current`)

---

## 📋 OTHER REQUESTS PROCESSED

### 🔴 _TZE284_vvmbj46n Temperature & Humidity Sensor
**Status:** ✅ **ALREADY SUPPORTED**

This manufacturer is already supported in the `temperature_humidity_sensor` driver for several versions. If your device doesn't pair correctly, try:

1. Factory reset the sensor
2. Remove the old device from Homey
3. Re-pair in "Add Device" → "Tuya Zigbee" → "Temperature Humidity Sensor"

---

## 🚀 HOW TO INSTALL THE NEW VERSION

### Option 1: Test Channel (Recommended - Version 2.1.31 available now)
1. Open Homey App Store
2. Search for "Universal Tuya Zigbee"
3. Enable the **Test channel**
4. Install version **2.1.31**

### Option 2: Wait for Live certification
The version will be submitted for certification and available on the Live channel in a few days.

---

## 📊 VERSION 2.1.31 SUMMARY

✅ **7 GitHub requests closed** (#26, #27, #28, #29, #30, #31, #32)
✅ **2 new drivers created** (ZG-204ZM, ZG-204ZV)
✅ **5 existing drivers enhanced**
✅ **11 new manufacturers added**
✅ **1 critical bug fixed** (TS0210 vibration sensor)

---

## 🔗 USEFUL LINKS

- **GitHub Repository:** https://github.com/dlnraja/com.tuya.zigbee
- **GitHub Issues:** https://github.com/dlnraja/com.tuya.zigbee/issues
- **Test App:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/
- **Documentation:** See `NOUVEAUX_DRIVERS_v2.1.31.md` on GitHub

---

## 📢 FUTURE REQUESTS

For any new device request:
1. **Check first** if the device isn't already supported
2. Open a **GitHub issue** with complete information:
   - Zigbee interview of the device
   - Manufacturer Name and Model ID
   - Purchase link if possible
3. Or post on this forum thread with the same information

---

## ❤️ THANKS TO THE COMMUNITY!

A big thank you to everyone who contributed with their device interviews, tests, and feedback:
- @Gerrit_Fikse
- @kodalissri
- @askseb
- @gfi63
- And all other active members!

**Keep sharing your Tuya Zigbee devices, together we make this app more and more complete!** 🚀

---

*Dylan Raja*
*Developer - Universal Tuya Zigbee App*
*October 9, 2025*
