# DEVICE RESEARCH: 6 Specific Nodes - Complete Specifications

**Date:** Nov 8, 2025 1:10am  
**Context:** User requested detailed research for battery/KPI fixes  
**Sources:** Zigbee2MQTT, GitHub, Zigbee Blakadder

---

## CRITICAL FINDINGS:

### **Node 1: TS0002 (_TZ3000_h1ipgkwn) - USB ADAPTER ⚠️**
**CORRECTION:** NOT a "Switch 1gang" → **USB Power Adapter 2-Channel**
- 2 USB ports controlled independently  
- AC powered (NO battery!)
- Blue LED + clickable button
- GitHub #26121 confirms: https://github.com/Koenkk/zigbee2mqtt/issues/26121
- Zigbee2MQTT: https://www.zigbee2mqtt.io/devices/TZ3000_h1ipgkwn.html

**Capabilities:** `onoff.l1`, `onoff.l2`, `power_on_behavior`

### **Node 2: TS0601 (_TZE200_rhgsbacq) - Presence Sensor**
- mmWave radar presence detection
- Battery powered
- Tuya DP protocol (cluster 0xEF00)
- **Problem:** Presence not mapped ("Unknown → skip!")

**Capabilities:** `alarm_motion`, `measure_battery`

### **Node 3: TS0215A (_TZ3000_0dumfk2z) - SOS Button**
- Emergency button
- Battery (CR2032)
- IAS Zone cluster
- Zigbee2MQTT: https://www.zigbee2mqtt.io/devices/TS0215A_sos.html

**Capabilities:** `measure_battery`, `alarm_contact`

### **Node 4: TS0601 (_TZE284_vvmbj46n) - Climate Monitor**
- Temperature + Humidity + Soil sensor
- Battery powered
- Tuya DP protocol
- **Problem:** Battery KPI removed by Smart-Adapt

**Capabilities:** `measure_temperature`, `measure_humidity`, `measure_battery`

### **Node 5: TS0044 (_TZ3000_bgtzm4ny) - 4-Button Controller**
- 4 buttons × 3 actions = 12 total
- Battery (24h report delay)
- Zigbee2MQTT: https://www.zigbee2mqtt.io/devices/TS0044.html

**Capabilities:** `measure_battery`, 12 flow triggers

### **Node 6: TS0043 (_TZ3000_bczr4e10) - 3-Button Controller**
- 3 buttons × 3 actions = 9 total
- Battery (24h report delay)
- Zigbee2MQTT: https://www.zigbee2mqtt.io/devices/TS0043.html

**Capabilities:** `measure_battery`, 9 flow triggers

---

## CORRECTIONS NEEDED:

| Node | Current | Should Be |
|------|---------|-----------|
| 1 | Switch 1gang | **USB Adapter 2-Channel** |
| 2 | Unknown capability | alarm_motion + battery |
| 3 | No battery? | measure_battery + alarm |
| 4 | Battery removed | measure_battery preserved |
| 5 | No battery? | measure_battery + actions |
| 6 | No battery? | measure_battery + actions |

---

## DETECTION RULES:

```javascript
// Node 1: USB Adapter
if (modelId === 'TS0002' && manufacturer === '_TZ3000_h1ipgkwn') {
  deviceType = 'usb_outlet';
  subType = '2gang';
  powerSource = 'ac'; // NO BATTERY!
}

// Nodes 2,4: TS0601 Battery Devices
if (modelId === 'TS0601' && manufacturer.startsWith('_TZE')) {
  powerSource = 'battery';
  // NEVER remove measure_battery for TS0601!
}

// Node 3: SOS Button
if (modelId === 'TS0215A') {
  deviceType = 'button';
  subType = 'emergency';
  powerSource = 'battery';
  capabilities = ['measure_battery', 'alarm_contact'];
}

// Nodes 5,6: Multi-Button
if (modelId === 'TS0044' || modelId === 'TS0043') {
  deviceType = 'button';
  powerSource = 'battery';
  endpoints = modelId === 'TS0044' ? 4 : 3;
  capabilities = ['measure_battery'];
}
```

---

**END OF RESEARCH**
