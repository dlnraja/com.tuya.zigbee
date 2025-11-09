# 🎯 Tuya DP Complete Mapping Reference

Based on Tuya official documentation and community research.

## 📊 Common DP Mappings (TS0601 Devices)

### Temperature & Humidity Sensors
```
DP 1  → measure_temperature   (°C * 10)
DP 2  → measure_humidity       (% * 10)
DP 3  → measure_temperature    (soil temp, °C * 10)
DP 18 → measure_temperature    (alt temp)
DP 19 → measure_humidity       (alt humidity)
```

### Motion & Presence Sensors (PIR/Radar)
```
DP 1  → alarm_motion           (bool) - override for PIR
DP 9  → target_distance        (cm → m / 100)
DP 101 → radar_sensitivity     (0-9)
DP 102 → illuminance_threshold (lux)
DP 104 → detection_range       (meters)
```

### Soil Moisture Sensors
```
DP 1  → measure_temperature    (air temp)
DP 2  → measure_humidity       (air humidity)
DP 3  → measure_temperature    (soil temp)
DP 5  → measure_humidity       (soil moisture %) ← CRITICAL!
```

### Battery
```
DP 4  → measure_battery        (% direct)
DP 14 → alarm_battery          (bool - low battery)
DP 15 → measure_battery        (% most common)
```

### Contact Sensors
```
DP 1  → alarm_contact          (bool)
DP 7  → alarm_contact          (alt)
```

### Switches & Outlets
```
DP 1  → onoff                  (bool)
DP 2  → onoff.usb1             (USB port 1)
DP 3  → onoff.usb2             (USB port 2)
DP 103 → onoff.usb2            (alt)
```

### Power Monitoring
```
DP 6  → measure_power          (W * 10)
DP 17 → measure_current        (mA → A / 1000)
DP 20 → measure_voltage        (V * 10)
DP 21 → meter_power            (kWh * 100)
```

## 🔧 Implementation in TuyaEF00Manager

All mappings above are implemented in:
- `lib/tuya/TuyaEF00Manager.js` (lines 200-240)
- Auto-parsing with division by 10/100/1000 as needed
- Auto-add missing capabilities
- 3 live listeners (dataReport, response, frame)

## ✅ Status: ACTIVE in v4.9.321+
