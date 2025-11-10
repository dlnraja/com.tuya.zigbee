# 📚 Zigbee Local Cookbook - Tuya Devices

**Complete troubleshooting guide for Tuya Zigbee devices on Homey (local control, no cloud)**

---

## 🎯 Table of Contents

1. [Pairing Best Practices](#-pairing-best-practices)
2. [Network Health (Channels, Routers, LQI)](#-network-health)
3. [Re-pairing Devices](#-re-pairing-devices)
4. [Tuya DataPoints (DP) Explained](#-tuya-datapoints-dp)
5. [Battery Reporting Issues](#-battery-reporting-issues)
6. [IAS Zone Enrollment (Motion/SOS)](#-ias-zone-enrollment)
7. [Cover/Curtain Inversion](#-covercurtain-inversion)
8. [Thermostat Modes](#-thermostat-modes)
9. [Common Issues & Solutions](#-common-issues--solutions)
10. [Getting Support](#-getting-support)

---

## 🔧 Pairing Best Practices

### Prerequisites
1. **Fresh battery**: Always use NEW batteries for battery-powered devices
2. **Proximity**: Pair within 1-2 meters of Homey during initial pairing
3. **Reset device**: Factory reset before pairing (hold button 5-10 seconds)
4. **Zigbee channel**: Ensure Homey's Zigbee channel doesn't overlap with Wi-Fi

### Pairing Procedure
```
1. Open Homey app → Devices → Add Device
2. Search for device type (e.g., "Motion Sensor Battery")
3. Put device in pairing mode:
   - Most sensors: Hold button 5-10 seconds until LED blinks
   - Plugs/switches: Power cycle 5x rapidly
   - Tuya devices: Often 3-5 second hold on reset button
4. Wait 30-60 seconds for discovery
5. If not found: Reset device and try again
```

### Why Pairing Fails
- ❌ **Old/weak battery** → Replace with fresh battery
- ❌ **Too far from Homey** → Move closer (< 2m) during pairing
- ❌ **Not properly reset** → Repeat factory reset procedure
- ❌ **Wrong driver selected** → Try alternative driver (check matrix)
- ❌ **Device already paired elsewhere** → Must unpair from old hub first

---

## 📡 Network Health

### Zigbee Channels & Wi-Fi Interference

**Problem**: Zigbee and Wi-Fi share 2.4GHz spectrum

**Recommended Zigbee Channels**:
- **Channel 15** (least overlap with Wi-Fi 1, 6, 11)
- **Channel 20** (if Wi-Fi on channels 1-6)
- **Channel 25** (if Wi-Fi on channels 8-11)

**Avoid Channels**: 11-14 (heavy Wi-Fi overlap)

**Check Your Setup**:
```
Homey App → Settings → Zigbee → Channel
Verify: Not on channel 11-14
```

### Routers vs End Devices

**Routers** (Always-powered, extend network):
- Smart plugs
- Light bulbs
- Wall switches
- AC-powered devices

**End Devices** (Battery-powered, don't route):
- Motion sensors
- Door sensors
- Buttons
- Temperature sensors

**Best Practice**: 
- Place 2-3 **routers** between Homey and distant battery devices
- Routers should be <10m apart
- Battery devices auto-connect to nearest router

### Link Quality (LQI)

**Check LQI**:
```
Homey Developer Tools → Zigbee → Devices → [Your Device]
LQI: 0-255 (higher = better)
```

**LQI Ranges**:
- ✅ **200-255**: Excellent
- ⚠️ **100-199**: Good (may have occasional issues)
- ❌ **0-99**: Poor (add routers, move device)

**Fix Poor LQI**:
1. Add powered device (router) between Homey and sensor
2. Move device closer to nearest router
3. Reduce physical obstacles (walls, metal)

---

## 🔄 Re-pairing Devices

### When to Re-pair
- Device shows as "unavailable"
- No data updates for >24h
- After Homey firmware update
- After moving device location

### Re-pairing Procedure (Keep Settings)
```
1. Note device name & settings (screenshot)
2. Homey App → Device → Settings → Remove Device
3. Wait 30 seconds
4. Re-add device using same driver
5. Restore name & settings
```

### Full Reset (Clean Slate)
```
1. Remove device from Homey
2. Factory reset device (hold button 10+ seconds)
3. Wait 1 minute
4. Add as new device
5. Reconfigure from scratch
```

---

## 🔢 Tuya DataPoints (DP)

### What are DataPoints?
Tuya devices use **DataPoints (DPs)** instead of standard Zigbee clusters.

**Example** (TS0601 devices):
```
DP 1  = On/Off state
DP 2  = Mode (auto/manual/schedule)
DP 3  = Temperature setpoint
DP 4  = Current temperature
DP 5  = Battery percentage
```

### Identifying Your Device's DPs

**Method 1: Zigbee2MQTT Database**
1. Go to https://zigbee2mqtt.io/supported-devices/
2. Search for your device model (e.g., "TS0601")
3. Check "Exposes" section for DP mappings

**Method 2: Home Assistant**
1. Search device on https://devices.home-assistant.io
2. Look for "Tuya" integration page
3. Check DP definitions in comments

**Method 3: Device Request** (this app)
1. Post in [Device Request template](https://github.com/dlnraja/com.tuya.zigbee/issues/new?template=device-request.md)
2. Include: Manufacturer ID, Model ID, Z2M/HA links
3. We'll map DPs and create driver

### Common DP Issues

**Problem**: Device pairs but shows wrong values
```
Example: Thermostat shows temperature as "255°C"
Cause: DP scale incorrect (should be × 0.1)
Fix: Report issue with device model + screenshot
```

**Problem**: Command doesn't work (e.g., "turn on" fails)
```
Cause: Wrong DP number or incorrect data format
Fix: Check Zigbee2MQTT for correct DP + format
```

---

## 🔋 Battery Reporting Issues

### "Battery shows 0% but device works"

**Causes**:
1. **Device doesn't report battery immediately** (normal for some Tuya devices)
2. **Incorrect battery converter** (shows 200% or 0%)
3. **Device sleeps** (battery only reported on wake)

**Solutions**:
1. **Wait 24-48h** - Many devices report battery daily
2. **Trigger device** - Press button, trigger motion, open/close
3. **Check logs** - Enable debug logging to see if battery data arrives
4. **Report issue** - If still 0% after 48h, report with diagnostic code

### "Battery shows 200%" or crazy values

**Cause**: Incorrect converter (raw value 0-200, not 0-100)

**Fix**: This is a **driver bug** - report with:
```
Device model: [e.g., TS0202]
Driver used: [e.g., "Motion Sensor Battery"]
Battery value shown: [e.g., 200%]
Diagnostic code: [from Homey app → device → diagnostics]
```

**Temporary Workaround**: Divide displayed value by 2

---

## 🚨 IAS Zone Enrollment (Motion/SOS)

### What is IAS Zone?
**IAS (Intruder Alarm System) Zone** = Zigbee standard for alarm sensors

**Devices using IAS**:
- Motion sensors (PIR, mmWave, radar)
- SOS/panic buttons
- Door/window contacts
- Water leak detectors
- Smoke/gas alarms

### "Motion sensor paired but doesn't trigger"

**Cause**: IAS Zone enrollment failed or incomplete

**Check Enrollment Status**:
```
Homey Developer Tools → Zigbee → Devices → [Sensor]
Look for: "iasZone" cluster
Check: iasCieAddress (should be Homey's IEEE address)
```

**Fix**:
1. **Re-pair device** (see Re-pairing section)
2. **Enable debug logging** - Device settings → Enable debug
3. **Check logs** - Look for "IAS Zone enrolled" message
4. **Report if fails** - Include diagnostic code + model

### "SOS button doesn't respond"

**Same cause as motion sensors** (IAS enrollment)

**Quick Test**:
```
1. Press SOS button
2. Check Homey Timeline immediately
3. Should see "alarm_generic turned on"
```

**If no Timeline entry**:
- Remove & re-pair device
- Ensure fresh battery (critical!)
- Report with diagnostic code if persists

---

## 🪟 Cover/Curtain Inversion

### "Curtain opens when I press close"

**Cause**: Motor wiring direction varies by manufacturer

**Fix Option 1: Driver Setting** (if available)
```
Device Settings → "Invert position"
Enable: Swaps open/close commands
```

**Fix Option 2: Physical Calibration**
```
1. Remove device from Homey
2. Use manufacturer app to calibrate motor direction
3. Re-pair to Homey
4. Test open/close
```

**Fix Option 3: Reverse Wires** (if accessible)
- Swap motor phase wires (requires electrical knowledge)
- Only if device has no calibration option

### "Position shows backwards (100% = closed)"

**Fix**: Driver setting
```
Device Settings → "Invert position percentage"
Enable: 0% = closed, 100% = open (standard Homey convention)
```

---

## 🌡️ Thermostat Modes

### Available Modes (Tuya thermostats)
```
auto     - Automatic temperature control
manual   - Manual on/off control
schedule - Follow programmed schedule
heat     - Heating mode (cooling disabled)
cool     - Cooling mode (heating disabled)
off      - Thermostat disabled
```

### "Mode change doesn't work"

**Cause**: Some Tuya thermostats have mode restrictions

**Check**:
1. Does device physically support the mode? (check manual)
2. Is device in correct power state?
3. Does mode require specific temperature range?

**Example Issue**:
```
Problem: Can't set "cool" mode
Reason: Device is heating-only thermostat
Solution: Use "heat" or "auto" mode only
```

### Temperature Scale Issues

**"Temperature shows 255°C"**
```
Cause: Wrong scale (should be × 0.1 or × 0.01)
Fix: Report device model - driver needs correction
```

**"Temperature in Fahrenheit but I want Celsius"**
```
Fix: Device Settings → Temperature unit → Celsius
(If setting unavailable, device reports in fixed unit)
```

---

## ⚠️ Common Issues & Solutions

### 1. "Device paired but shows as unavailable"

**Checklist**:
- ✅ Battery fresh? (replace if >6 months old)
- ✅ Device within router range? (check LQI)
- ✅ Zigbee channel optimal? (not 11-14)
- ✅ Device triggered recently? (press button, trigger motion)

**Solution**: Re-pair device closer to Homey

---

### 2. "Device was working, now stopped"

**Possible Causes**:
- Battery depleted (even if shows >0%)
- Router device removed (network topology changed)
- Zigbee channel changed (interference)
- Homey firmware updated (rare)

**Solution**:
1. Replace battery first (cheapest test)
2. Check LQI (may need new router position)
3. Re-pair device if LQI poor

---

### 3. "Wrong device type after pairing"

**Example**: Motion sensor paired as "Temperature Sensor"

**Cause**: Driver auto-detection picked wrong match

**Fix**:
1. Remove device
2. Reset device (factory reset)
3. Choose **correct driver manually** during pairing
4. Check [Device Matrix](matrix/DEVICE_MATRIX.md) for right driver

---

### 4. "Device shows black square icon"

**Cause**: Driver icon missing or corrupted

**Fix**:
1. Update app to latest version (may have icon fixes)
2. Temporary: Icons don't affect functionality
3. Report issue with driver name

---

### 5. "Temperature/humidity values frozen"

**Cause**: Battery-powered sensors sleep between reports

**Normal Behavior**:
- Most sensors report every 15-60 minutes
- Some only report on significant change (±0.5°C)

**Force Update**:
- Press button on sensor (wakes device)
- Wait 10-30 seconds
- Check Homey Timeline for new value

**If still frozen after 24h**: Re-pair device

---

### 6. "Illuminance shows 31000 lux"

**Cause**: Log-lux to lux conversion error

**This is a bug** - Report with:
- Device model
- Driver name
- Screenshot of value

**Expected Fix**: Driver update (converter correction)

---

### 7. "Nothing happens" during pairing

**Full Reset Procedure**:
```
1. Remove batteries (wait 30 seconds)
2. Hold reset button
3. Insert batteries while holding button
4. Keep holding 10 seconds (LED should blink rapidly)
5. Release button
6. Try pairing immediately (within 2 minutes)
```

**If still fails**:
- Try different batteries (brand new)
- Move closer to Homey (<1 meter)
- Check device compatibility in [Device Matrix](matrix/DEVICE_MATRIX.md)

---

## 💬 Getting Support

### Before Requesting Help

**Collect This Information**:
1. **Device Model** - Exact model number (e.g., "TS0202")
2. **Driver Used** - Which driver you selected during pairing
3. **Diagnostic Code** - Homey App → Device → Settings → Diagnostics → Copy
4. **What Doesn't Work** - Specific issue (e.g., "motion detection never triggers")
5. **What You Tried** - Steps already attempted from this cookbook

### Device Request (New Device)

**Use Template**: [Device Request Form](https://github.com/dlnraja/com.tuya.zigbee/issues/new?template=device-request.md)

**Required Information**:
```
📸 Photo of device (front + back with labels)
🔢 Manufacturer ID (found in Zigbee scan)
🔢 Model ID (found on device or Zigbee scan)
🔗 Zigbee2MQTT link (if supported)
🔗 Home Assistant link (if available)
📋 Fingerprint (Homey Developer Tools → Zigbee)
```

### Bug Report (Existing Driver)

**Forum**: [Homey Community - Universal Tuya Zigbee](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352)

**Include**:
```
✅ Driver name (e.g., "Motion Sensor Battery")
✅ Device model (e.g., "TS0202")
✅ Diagnostic code (from Homey app)
✅ What doesn't work (specific behavior)
✅ Steps to reproduce
✅ Expected vs actual behavior
```

### Priority Support

**High Priority** (fixed ASAP):
- Device paired but completely non-functional
- Data corruption (e.g., battery shows 200%)
- Safety-critical (smoke/gas alarms, water leak)

**Medium Priority** (fixed in next release):
- Feature missing (mode, setting)
- Incorrect unit conversion
- Icon/cosmetic issues

**Low Priority** (backlog):
- Feature requests (new capabilities)
- Performance optimizations
- Documentation improvements

---

## 🔗 Quick Links

- **📊 Device Matrix**: [Supported Devices](matrix/DEVICE_MATRIX.md)
- **🐛 Report Issue**: [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)
- **💬 Forum**: [Homey Community](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352)
- **📖 Local-First Guide**: [Why Local Control](docs/LOCAL_FIRST.md)
- **🔧 Logger System**: [Debugging Guide](LOGGING_GUIDE.md)

---

**Last Updated**: v3.0.50 - October 2025

**This cookbook is actively maintained** - suggestions welcome via GitHub issues!
