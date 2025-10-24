---
name: Device Request
about: Request support for a Tuya Zigbee device
title: '[DEVICE] '
labels: 'device-request'
assignees: ''
---

## Basic Info
- **Brand**: 
- **Model** (printed on label): 
- **Manufacturer Name** (from Homey dev tools): 
- **Model ID** (e.g., TS0601, TS0011, TS011F): 
- **Purchase Link** (Amazon/AliExpress): 

## Evidence
### Required
- [ ] Photos attached (device label + device itself)
- [ ] Zigbee interview / cluster list (copy/paste below)
- [ ] Pairing logs attached

### Optional but Helpful
- **Zigbee2MQTT link** (if device is supported there): 
- **Home Assistant link** (if device is supported there): 
- **For TS0601 devices**: DP list with values (see logs during operation)

### Zigbee Interview
```
Paste your Zigbee interview output here
(Available in Homey Developer Tools > Zigbee)
```

## Expected Behavior
**What capabilities do you expect?**
- [ ] On/Off
- [ ] Dimming
- [ ] Temperature measurement
- [ ] Humidity measurement
- [ ] Contact sensor
- [ ] Motion sensor
- [ ] Cover position (curtain/blind)
- [ ] Thermostat controls
- [ ] Energy metering
- [ ] Other: _________________

**Describe the device's function**:


## Additional Context
Any other information that might help (device quirks, special modes, pairing issues, etc.):


---

### ⚡ Quick Tips
- **Photos**: Make sure the label is clearly visible
- **Logs**: Enable logs in Homey app settings before pairing
- **Reset**: Most devices require 3-5 seconds press to reset (LED blinks)
- **Distance**: Pair within 1 meter of Homey for best results
