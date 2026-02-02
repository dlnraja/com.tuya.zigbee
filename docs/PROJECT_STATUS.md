# Universal Tuya Zigbee - Project Status
> Last Updated: February 2, 2026 | Version: 5.8.1

## 📊 Project Statistics

| Metric | Value |
|--------|-------|
| Total Drivers | 109+ |
| Manufacturer Fingerprints | 193,000+ |
| Supported Device Types | 70+ |
| Base Classes | 8 |

## 🔧 Recent Implementations (v5.8.x)

### v5.8.1 (February 2, 2026)
- **Scene Mode Re-application on Wake** - TS004F devices automatically re-apply scene mode after button press
- **Hardware Limitation Documentation** - Documented first button press loss after sleep as Zigbee limitation
- **New Curtain Motor Fingerprint** - Added `_TZE204_wzre8hu2` from Z2M #27188
- **New Drivers Created** - `illuminance_sensor` (TS0222), `zigbee_repeater` (TS0207)

### v5.8.0 (January 2026)
- **Scene Mode Recovery** - 4-hour periodic recovery for battery devices (`_scheduleSceneModeRecovery`)
- **15+ MOES/Tuya Button Profiles** - Enhanced timing profiles from Hubitat research
- **TS0046 6-Button Support** - LoraTap 6-button fingerprints added

## 🏗️ Architecture

### Base Device Classes
| Class | File | Purpose |
|-------|------|---------|
| BaseHybridDevice | lib/devices/BaseHybridDevice.js | Ultimate base, Tuya DP + ZCL |
| HybridSwitchBase | lib/devices/HybridSwitchBase.js | Wall switches, multi-gang |
| HybridSensorBase | lib/devices/HybridSensorBase.js | All sensors |
| HybridPlugBase | lib/devices/HybridPlugBase.js | Smart plugs, energy monitors |
| HybridCoverBase | lib/devices/HybridCoverBase.js | Curtain motors, blinds |
| HybridLightBase | lib/devices/HybridLightBase.js | Bulbs, LED strips |
| HybridThermostatBase | lib/devices/HybridThermostatBase.js | TRVs, thermostats |
| ButtonDevice | lib/devices/ButtonDevice.js | Wireless buttons, scene switches |

### Key Mixins
| Mixin | Purpose |
|-------|---------|
| PhysicalButtonMixin | Detects physical vs app button presses |
| VirtualButtonMixin | Virtual button capability support |
| TuyaDPMixin | Tuya DataPoint protocol handling |

## 🔑 Critical Implementation Rules

### Settings Keys (MUST USE)
```javascript
// CORRECT:
const modelId = settings.zb_model_id;
const mfr = settings.zb_manufacturer_name;

// WRONG (causes "unknown/unknown"):
const modelId = settings.zb_modelId;      // ❌
const mfr = settings.zb_manufacturerName; // ❌
```

### Protocol Detection
```javascript
const isTuyaDP = modelId === 'TS0601' || 
                 modelId.startsWith('TS0601') || 
                 mfr.startsWith('_TZE');
```

### Flow Card Pattern (PR #120)
- NO `titleFormatted` with `[[device]]` in triggers
- Use `"args": []` (empty array)
- Put descriptive text in `title` field

## 📋 Supported Device Categories

### Switches & Relays
- TS0001-TS0008 (1-8 gang switches)
- TS0011-TS0016 (wall switches)
- TS0726 (BSEED 4-gang ZCL-only)

### Buttons & Remotes
- TS0041-TS0046 (1-6 button)
- TS004F (scene switch with mode)
- TS0215/TS0215A (SOS emergency)

### Sensors
- TS0201 (temp/humidity)
- TS0202 (PIR motion)
- TS0203 (contact/door)
- TS0207 (water leak, repeater)
- TS0222 (illuminance)
- TS0225 (radar presence)

### Covers
- TS0302, TS130F (curtain motors)
- TS0601 (Tuya DP covers)

### Thermostats
- TS0601 TRVs (radiator valves)
- Thermostatic controllers

### Plugs & Energy
- TS011F (energy monitoring plug)
- TS0121 (smart plug)

## 🐛 Known Issues & Fixes

| Issue | Root Cause | Solution |
|-------|------------|----------|
| "unknown/unknown" | Wrong settings keys | Use `zb_model_id` not `zb_modelId` |
| Physical buttons not triggering | No app/physical distinction | PhysicalButtonMixin + state tracking |
| TS004F single press only | Device in dimmer mode | Write `0x8004=1` to OnOff cluster |
| Battery always 0% | No polling | Poll on button press wake |
| First press lost after sleep | Zigbee sleepy device behavior | Hardware limitation, documented |

## 📚 Key Documentation Files

| File | Content |
|------|---------|
| PHYSICAL_BUTTON_ANALYSIS.md | Button detection methods, cross-platform issues |
| ZHA_Z2M_QUIRKS_ANALYSIS.md | Protocol constants, DP mappings |
| TUYA_TIME_SYNC_PROTOCOL.md | mcuSyncTime (0x24) implementation |
| DEVICE_MATRIX.md | All drivers with capabilities |
| FORUM_ISSUES_ANALYSIS.md | Community bug reports and fixes |

## 🔗 External References

- **Z2M Converters**: `Koenkk/zigbee-herdsman-converters/src/devices/tuya.ts`
- **ZHA Quirks**: `zigpy/zha-device-handlers/zhaquirks/tuya/`
- **Hubitat Driver**: `kkossev/Hubitat/Drivers/Tuya TS004F/`
- **JohanBendz App**: `JohanBendz/com.tuya.zigbee`

## 🏆 Athom SDK3 Compliance

### Official Patterns Implemented ✅

| Pattern | Status | Files |
|---------|--------|-------|
| `BoundCluster` | ✅ | OnOffBoundCluster, LevelControlBoundCluster, TuyaBoundCluster |
| `onEndDeviceAnnounce()` | ✅ | TuyaHybridDevice, HybridSensorBase |
| `configureAttributeReporting` | ✅ | BaseHybridDevice, ZigbeeHelpers |
| `onNodeInit()` | ✅ | All device classes |
| `printNode()` | ✅ | TuyaZigbeeDevice |
| `triggerFlow()` | ✅ | ButtonRemoteManager, EnergyManager |

### Athom Libraries Used
- `homey-zigbeedriver` v2.x
- `zigbee-clusters` v2.x

### SDK3 Migration Complete
- ❌ `MeshDevice` → ✅ `ZigBeeDevice`
- ❌ `onMeshInit()` → ✅ `onNodeInit()`
- ❌ `registerReportListener` → ✅ `BoundCluster`

---
*Generated from project analysis - February 2, 2026*
*Athom compliance verified from athombv GitHub repositories*
