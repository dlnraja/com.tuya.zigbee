# Migration Guide v4.0.0

## ⚠️ Breaking Change Notice

Version 4.0.0 introduces a **COMPLETE REORGANIZATION** of all drivers.

**ALL YOUR DEVICES WILL NEED TO BE RE-PAIRED.**

## Why This Change?

Based on user feedback:
- Too many similar drivers without clear distinction
- Difficult to identify device brand
- Battery type not visible in driver name
- Confusion when pairing new devices

## What's New

### Brand Organization
Drivers are now prefixed by manufacturer:
- `tuya_` - Tuya devices (most common)
- `aqara_` - Aqara/Xiaomi devices
- `ikea_` - IKEA TRADFRI devices
- `philips_` - Philips Hue/Signify
- `sonoff_` - Sonoff/eWeLink
- And more...

### Battery Type Separation
Drivers supporting multiple battery types are now separate:

**Before:**
```
motion_sensor_battery  [supports AAA or CR2032]
```

**After:**
```
tuya_motion_sensor_pir_basic_cr2032
tuya_motion_sensor_pir_basic_aaa
```

### Naming Convention
```
{brand}_{category}_{type}_{battery}
```

Examples:
- `tuya_motion_sensor_pir_basic_cr2032`
- `aqara_door_window_sensor_basic_cr2032`
- `ikea_wireless_switch_4button_other`

## Migration Steps

### 1. Note Your Current Setup
- List all your devices
- Note your active flows
- Take screenshots if needed

### 2. Remove Old Devices
- Go to Devices in Homey
- Remove all devices from this app
- **Note:** This will break your flows temporarily

### 3. Update App
- App will auto-update to v4.0.0
- Wait for update to complete

### 4. Re-Pair Devices
- Add devices again
- Select correct driver (check brand & battery)
- Verify device works

### 5. Recreate Flows
- Rebuild your flows with new devices
- Test each flow

## Driver Mapping Examples

| Old Driver | New Driver(s) |
|------------|---------------|
| `motion_sensor_battery` | `tuya_motion_sensor_pir_basic_cr2032`<br>`tuya_motion_sensor_pir_basic_aaa` |
| `wireless_switch_3gang_cr2032` | `tuya_wireless_switch_3button_cr2032` |
| `temperature_humidity_sensor_battery` | `tuya_temp_humidity_sensor_basic_cr2032`<br>`tuya_temp_humidity_sensor_basic_aaa` |
| `smart_plug_ac` | `tuya_plug_smart_basic_ac` |
| `door_window_sensor_battery` | `tuya_door_window_sensor_basic_cr2032` |

Full mapping: [MIGRATION_MAP_v4.json](../scripts/migration/MIGRATION_MAP_v4.json)

## Benefits

✅ Clear brand identification  
✅ Battery type visible in name  
✅ Less confusion when pairing  
✅ Better organization (300+ drivers)  
✅ Optimized battery calculation per type  
✅ Easier troubleshooting  

## Support

Questions? Visit:
- [Community Forum](https://community.homey.app/)
- [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)

## Statistics

- Total drivers: 237
- Renamed: 109
- New (multi-battery): 128
- Brands supported: 3
- Battery types: 7
