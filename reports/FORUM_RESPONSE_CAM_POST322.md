# Forum Response - Cam Post #322 - Device Pairing Issues

## User Report
**Post**: #322  
**User**: Cam  
**Date**: 2025-10-13  
**Thread**: Universal TUYA Zigbee Device App - test

## Issues Reported

### 1. Button/Scene Switch Device
**Problem**: Couldn't find "1-Button Wireless Scene Switch (Battery)" in pairing list  
**Attempted**: Tried "Scene Switch" device instead  
**Result**: No luck with pairing

### 2. Motion Sensor Device  
**Problem**: Motion sensor won't pair  
**Attempted**: Used `motion_temp_humidity_illumination_multi_battery` driver  
**Result**: No luck with pairing

---

## Investigation Results

### Driver Status
✅ **wireless_switch_1gang_cr2032** EXISTS in app with correct name:
- Display Name: "1-Button Wireless Scene Switch (Battery)"
- ID: `wireless_switch_1gang_cr2032`
- Class: socket
- Batteries: CR2032
- Capabilities: measure_battery, onoff, dim

✅ **motion_temp_humidity_illumination_multi_battery** EXISTS:
- Display Name: "Multi-Sensor (Motion + Lux + Temp) (Battery)"
- ID: `motion_temp_humidity_illumination_multi_battery`
- Class: sensor
- Batteries: AAA, CR2032
- Capabilities: alarm_motion, measure_battery, measure_luminance, measure_temperature, measure_humidity

### Current Manufacturer IDs

**wireless_switch_1gang_cr2032** includes:
- TS0001, TS0002, TS0003, TS0004, TS0005, TS0006
- TS0011, TS0012, TS0013, TS0014
- TS0041, TS0042, TS0043, TS0044, TS004F
- TS011F, TS0121, TS0203, TS0205, TS0502, TS0502B, TS0505, TS0505B, TS0601
- _TZ1800_ejwkn2h2, _TZ1800_fcdjzz3s
- _TZ2000_a476raq2, _TZ2000_avdnvykf, _TZ2000_hjsgdkfl
- _TZ3000_ series (40+ IDs)
- _TZ3400_keyjqthh, _TZ3400_tk3s5tyg
- _TYZB02_key8kk7r
- _TZE200_ series (3 IDs)

**motion_temp_humidity_illumination_multi_battery** includes:
- HOBEIAN
- _TZE200_uli8wasj, _TZE200_grgol3xp, _TZE200_rhgsbacq, _TZE200_y8jijhba
- _TZ3000_ series (25+ IDs)
- Product IDs: TS0601, ZG-204ZV, ZG-204ZL

---

## Possible Root Causes

### 1. Driver Not Visible in Pairing List
- **Cause**: App might not be updated to latest version (2.15.72)
- **Solution**: Ask Cam to verify app version and update if needed

### 2. Device Manufacturer ID Not in Database
- **Cause**: Cam's specific devices may have manufacturer IDs not yet in our database
- **Solution**: Need diagnostic data from Cam's Homey to identify exact manufacturer IDs

### 3. Pairing Mode Issues
- **Cause**: Devices may require specific pairing procedure
- **Solution**: 
  - Fresh batteries (critical for reliable pairing - mentioned in Memory 450d9c02)
  - Proper reset procedure
  - Close proximity to Homey during pairing

### 4. Device Recognition Timing
- **Cause**: Some Tuya devices take longer to identify during pairing
- **Solution**: Wait longer during pairing process

---

## Recommended Response to Cam

**Subject**: Re: Device Pairing Issues - Post #322

Hi Cam,

Thank you for the detailed report! I've investigated both issues:

### 1-Button Wireless Scene Switch (Battery)

✅ **Good news**: This driver DOES exist in the app with exactly that name!  
📍 **Driver ID**: `wireless_switch_1gang_cr2032`

**If you can't see it in the pairing list:**

1. **Verify your app version**: Make sure you're on v2.15.72 (latest)
   - Open Homey app → Settings → Apps → Universal Tuya Zigbee
   - Check version number

2. **Try these pairing steps:**
   - Use **fresh CR2032 batteries** (critical for reliable pairing)
   - Reset the device: Press and hold reset button for 3 seconds until LED blinks rapidly
   - In Homey app → Add Device → Universal Tuya Zigbee → "1-Button Wireless Scene Switch (Battery)"
   - Keep device very close to Homey during pairing (within 30cm)

### Motion Sensor

The `motion_temp_humidity_illumination_multi_battery` driver is correct for multi-function sensors.

**Troubleshooting steps:**

1. **Replace batteries** - old/weak batteries are the #1 cause of pairing failures
2. **Reset properly**: Press pairing button until LED blinks rapidly (usually 5-10 seconds)
3. **Stay close**: Keep sensor within 30cm of Homey during entire pairing process
4. **Wait longer**: Some sensors take 30-60 seconds to fully pair
5. **Check LED**: Blue blinking LED usually means it's searching - this is normal

### Get Device Information

If the above doesn't work, we need to identify your exact device IDs:

1. In Homey app → Settings → Zigbee
2. Try to pair the device (even if it fails)
3. Take a screenshot of any Zigbee log entries
4. Share here or send diagnostic report

**Alternative**: If you can provide the AliExpress item number or device model, I can check if we need to add specific manufacturer IDs to the drivers.

### Known Issue from Memory

Your button issue matches a known problem (Memory 450d9c02):
- **Symptom**: Device pairs then immediately disconnects, blue LED keeps blinking
- **Main cause**: Weak batteries or incorrect pairing sequence
- **Solution**: Always use fresh batteries + correct reset procedure

Let me know the results, and we'll get your devices working!

Best regards,
Dylan

---

## Technical Action Items

### Immediate Actions Needed:

1. **Request diagnostic data from Cam**:
   - App version
   - Exact device model/AliExpress item number
   - Zigbee log entries during pairing attempt
   - Screenshots of pairing process

2. **Prepare driver updates if needed**:
   - If Cam provides new manufacturer IDs, add them to appropriate drivers
   - Update learnmode instructions if pairing procedure differs

3. **Documentation improvement**:
   - Add battery freshness warning to all battery-powered driver instructions
   - Enhance pairing troubleshooting guide

### Follow-up Actions:

1. **Monitor forum** for Cam's response
2. **Update drivers** based on any new manufacturer IDs discovered
3. **Create FAQ** for common pairing issues
4. **Add to changelog** any driver improvements made

---

## Related Memories Referenced

- **Memory 450d9c02**: Button connectivity problems - LED blinking, fresh batteries critical
- **Memory 117131fa**: Forum analysis complete - device pairing failures fixed
- **Memory 9f7be57a**: Unbranded categorization structure
- **Memory 6c89634a**: Manufacturer IDs and endpoints standards

---

## Status: AWAITING CAM'S RESPONSE WITH DIAGNOSTIC DATA
