---
name: "Device Request (Zigbee Tuya)"
about: "Request support for a new device (local Zigbee)"
labels: ["device-request", "enhancement"]
assignees: []
---

## 📱 Basic Information

**Brand & Model**: 
**Purchase Link**: 
**Power Source**: [ ] Battery / [ ] Mains
**Current Status**: [ ] Not pairing / [ ] Pairs but missing features / [ ] Not working at all

---

## 🔍 Zigbee Fingerprint (MANDATORY)

Please provide this information from Homey Developer Tools:

**Manufacturer Name**: `_TZ____`  
**Model ID**: `TS____`  
**Endpoints**: `[ ]`  
**Clusters**: `[ ]`

### How to Get Fingerprint:
1. Pair device with Homey
2. Go to Developer Tools → Devices → [Your Device]
3. Click "Advanced" tab
4. Screenshot OR copy the information above

**Screenshot or fingerprint data**:
```
Paste fingerprint here
```

---

## 📊 TS0601 Data Points (if applicable)

If your device uses model `TS0601`, please provide DP mappings:

| DP ID | Function | Example Value | Read/Write |
|-------|----------|---------------|------------|
| 1     | (e.g., switch) | true/false | RW |
| 4     | (e.g., battery) | 87 (%) | R |
| ...   | ... | ... | ... |

---

## 🔗 References

**Zigbee2MQTT**: (link if exists)  
**Home Assistant/ZHA**: (link if exists)  
**Other documentation**: (any other helpful links)

---

## ✨ Expected Capabilities

What features should work? Check all that apply:

- [ ] On/Off
- [ ] Brightness/Dim
- [ ] Temperature
- [ ] Humidity
- [ ] Motion detection
- [ ] Contact sensor
- [ ] Battery level
- [ ] Energy monitoring (power, current, voltage)
- [ ] Other: _________

---

## 📝 Additional Notes

Any other relevant information (e.g., specific modes, known issues, etc.)
