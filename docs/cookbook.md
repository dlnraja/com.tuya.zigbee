# 📖 Zigbee Local Cookbook (Homey)

**Guide for pairing, troubleshooting, and optimizing Zigbee Tuya devices on Homey**

---

## 🔌 Pairing Devices

### General Pairing Steps
1. **Factory Reset** your device (see device-specific instructions below)
2. **Start Inclusion** in Homey app
3. **Keep device close** to Homey (< 2 meters) during pairing
4. **Wait 2-5 minutes** for device to send first reports
5. **Verify** capabilities work (motion, temperature, battery, etc.)

### Device-Specific Reset Instructions

#### Motion Sensors / Contact Sensors
- Remove battery for 10 seconds
- Reinsert battery while holding reset button (5-10s)
- LED should blink rapidly

#### Smart Plugs
- Press and hold button for 5-10 seconds
- LED blinks rapidly = pairing mode
- Release button

#### Temperature/Humidity Sensors
- Remove battery for 10 seconds
- Reinsert and wait for LED indication
- Some models: hold reset button 5s

#### SOS Buttons
- Remove battery
- Hold button while reinserting battery
- Keep holding for 5-10 seconds
- LED blinks = ready

---

## 🔍 Troubleshooting

### Device Not Found During Pairing

**Symptoms**: Homey searching indefinitely, device not detected

**Solutions**:
1. **Move closer to Homey** (< 1 meter)
2. **Avoid 2.4GHz Wi-Fi interference**: Turn off nearby Wi-Fi temporarily
3. **Factory reset again**: Some devices need 2-3 reset attempts
4. **Check battery**: Use fresh batteries (especially CR2032)
5. **Remove other coordinators**: Turn off Z

2MQTT, other hubs temporarily

### Device Paired But Not Working

**Symptoms**: Device shows in Homey but no motion/temperature/battery

**Solutions**:
1. **Wait 5 minutes**: First reports can be slow
2. **Trigger manually**: Wave hand in front of motion sensor, press button
3. **Check diagnostics**: Create diagnostic report and check errors
4. **Re-pair device**: Remove from Homey, factory reset, pair again
5. **Check distance**: Too far from Homey or router devices

### Battery Shows 0% or Incorrect

**Symptoms**: Battery always 0%, or shows 200%, or never updates

**Solutions**:
1. **Wait for report**: Battery updates every 1-12 hours (device-dependent)
2. **Trigger event**: Motion, temperature change forces battery report
3. **App version**: Ensure using v3.0.45+ with battery fix
4. **Replace battery**: Low battery may report incorrectly

### Motion Sensor Not Triggering

**Symptoms**: Motion detected but no flow triggers, lights don't turn on

**Solutions**:
1. **Check capability**: Device must have `alarm_motion` capability
2. **IAS Zone enrollment**: Check diagnostic for enrollment status
3. **Distance/sensitivity**: Adjust settings, move sensor
4. **Re-pair**: Motion sensors often need fresh pairing
5. **App version**: Ensure v3.0.45+ with IAS Zone fix

### SOS Button Not Responding

**Symptoms**: Press button but no alarm, no flow trigger

**Solutions**:
1. **IAS Zone**: Same as motion sensor above
2. **Battery**: Fresh battery required (SOS uses high current)
3. **Distance**: Must be within Zigbee mesh range
4. **App version**: v3.0.45+ critical for SOS fix

### Illuminance Shows Huge Values

**Symptoms**: Shows 31000 lux instead of 31, or values unrealistic

**Solutions**:
1. **App version**: v3.0.45+ includes log-lux fix
2. **Check device settings**: Some sensors have lux/log-lux toggle
3. **Re-pair**: May fix reporting format

---

## 🌐 Mesh & Network Stability

### Building a Strong Mesh

**Router Devices** (always powered, extend mesh):
- Smart plugs
- Mains-powered switches
- Bulbs (if always powered)

**End Devices** (battery, do not route):
- Sensors (motion, temperature, contact)
- Buttons
- Battery devices

**Best Practices**:
1. **Add routers first**: 2-3 smart plugs strategically placed
2. **Max distance**: 10 meters between devices (walls reduce)
3. **Avoid obstacles**: Microwaves, metal, thick walls
4. **Balance load**: Don't connect 20 sensors to 1 router

### Improving Weak Signals

**Symptoms**: Devices offline frequently, slow response

**Solutions**:
1. **Add routers**: Place smart plug between Homey and problem device
2. **Reduce interference**: Move away from Wi-Fi router, microwave
3. **Firmware update**: Update Homey firmware
4. **Remove weak devices**: Some cheap devices cause mesh issues

---

## 🔧 Advanced: Tuya Data Points (DPs)

### What Are DPs?

**TS0601 devices** use proprietary Tuya Data Points instead of standard Zigbee clusters:

- **DP 1**: Usually on/off or motion
- **DP 2**: Brightness, position, or mode
- **DP 4**: Battery percentage
- **DP 18**: Temperature (÷10 for °C)
- **DP 19**: Power (W)
- **DP 20**: Voltage (V)

### Finding DPs for New Devices

1. **Check Zigbee2MQTT**: https://www.zigbee2mqtt.io/supported-devices/
2. **Check ZHA**: https://github.com/zigpy/zha-device-handlers
3. **Check Blakadder**: https://zigbee.blakadder.com/tuya.html
4. **Request support**: Use GitHub issue template with diagnostic

---

## 🛠️ Maintenance

### Regular Checks
- **Battery every 3-6 months** (sensors)
- **Firmware updates** (Homey)
- **App updates** (Universal Tuya Zigbee)
- **Mesh health** (check for offline devices)

### When to Re-Pair
- After Homey factory reset
- After major app update (rare)
- Device permanently offline (after battery change)
- Capabilities not working after pairing

---

## 📚 Resources

**App GitHub**: https://github.com/dlnraja/com.tuya.zigbee  
**Forum Thread**: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352  
**Homey Developer**: https://apps.developer.homey.app/  
**Zigbee Alliance**: https://zigbeealliance.org/

---

## 💡 Tips & Tricks

### Battery Life
- Reduce motion sensitivity (settings)
- Increase reporting interval (if available)
- Use quality batteries (Duracell, Energizer)
- Avoid extreme temperatures

### Faster Response
- Add router devices near sensors
- Reduce Zigbee mesh congestion
- Use mains-powered devices when possible

### Debugging
1. **Diagnostic reports**: Always create before asking for help
2. **Logs**: Enable in Homey Developer Tools
3. **Screenshots**: Helpful for visual issues
4. **Patience**: Some devices slow to initialize

---

**Questions?** Ask in the Homey Community Forum!
