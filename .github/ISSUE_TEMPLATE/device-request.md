---
name: 🆕 Device Request
about: Request support for a new Tuya Zigbee device
title: '[DEVICE] '
labels: enhancement, device-request
assignees: ''

---

## 📸 Device Information

**Device Photos** (front + back with labels visible):
- [ ] Attached photos

**Device Details**:
- **Model ID**: (e.g., TS0202, TS0601) - _REQUIRED_
- **Manufacturer**: (e.g., _TZ3000_xyz, Tuya) - _REQUIRED_
- **Device Type**: (e.g., Motion Sensor, Smart Plug, Thermostat)
- **Power Source**: Battery / AC Powered / Both
- **Purchase Link**: (optional, helps verification)

---

## 🔍 Current Status

Select one:
- [ ] Device is **not recognized** by Homey (doesn't show in pairing)
- [ ] Device **pairs** but some/all features don't work
- [ ] Device **works** but could be improved (missing features/settings)

**What doesn't work** (be specific):
```
Example: "Motion detection works but battery always shows 0%"
         "Device pairs as wrong type (shows as switch instead of light)"
```

---

## 📡 Zigbee Fingerprint

**From Homey Developer Tools** → Zigbee → Devices → [Your Device]:

```json
{
  "modelId": "",
  "manufacturerName": "",
  "endpoints": {
    "1": {
      "clusters": [],
      "deviceId": 0,
      "profileId": 0
    }
  }
}
```

**OR** paste entire fingerprint here (preferred).

---

## 🔗 External References

**Help us map this device faster!**

- **Zigbee2MQTT**: https://zigbee2mqtt.io/supported-devices/ (search your model)
- **Home Assistant**: https://devices.home-assistant.io/ (search your model)
- **Blakadder**: https://zigbee.blakadder.com/ (Tuya device database)

**Links to your device** (if found):
- Z2M: 
- HA: 
- Blakadder: 

---

## 🔢 DataPoints (TS0601 devices only)

If your device is **TS0601**, we need DataPoint information:

**From Zigbee2MQTT "Exposes" section** (or HA integration):
```
DP 1 = on/off
DP 2 = mode
DP 3 = temperature
...
```

**OR** link to Z2M device page showing DPs.

---

## 📋 Additional Context

- **Diagnostic Code** (if device paired): Homey App → Device → Settings → Diagnostics
- **Error Messages**: (if any shown during pairing)
- **Similar Devices**: (other models that work similarly)
- **Expected Behavior**: (what should work)

---

## ✅ Checklist (before submitting)

- [ ] Model ID provided (e.g., TS0202)
- [ ] Manufacturer ID provided (e.g., _TZ3000_xyz)
- [ ] Photos attached (or external link)
- [ ] Checked Zigbee2MQTT / Home Assistant for existing support
- [ ] Zigbee fingerprint included (if device paired)
- [ ] Described what doesn't work specifically

---

**Thank you for contributing!** We typically respond within 48 hours and add devices within 1-2 weeks.