# DEVICE_SPECIFIC_ISSUES.md - Device-Specific Known Issues

> **Last Updated**: 2026-06-15 | **Version**: 9.0.36

## Climate Sensors

### LCD Temperature/Humidity Sensors (_TZE284_ prefix)
- **Issue**: Time sync failures on some firmware versions
- **Affected DPs**: DP18 (temperature), DP19 (humidity), DP20 (battery)
- **Time Format**: TUYA_DUAL_2000 (8 bytes: [Local:4BE][UTC:4BE] epoch 2000)
- **Workaround**: App retries time sync; uses guessFormat() auto-detection with fallback chain
- **Known models**: `_TZE284_vvmbj46n`, `_TZE284_5n2lbgku`, `_TZE284_5m4nchbm`

### Air Quality Sensors (_TZE200_8ygsuhe1)
- **Issue**: High DP count (DP2=CO2, DP18=temp, DP19=humidity, DP20=PM2.5, DP21=VOC, DP22=formaldehyde)
- **Mitigation**: SmartDivisorManager auto-detects divisors (temp/10, humidity/10, formaldehyde/100)
- **Double-division**: Fixed in v5.11.15; TuyaEF00Manager skips auto-convert when dpMappings divisor !== 1

### MCU-Based Sensors (TUYA_MCU format)
- **Affected**: `_TZE200_3towulqd` (PIR), `_TZE200_rhgsbacq` (ZG-204ZM), `_TZE204_sxm7l9xa` (mmWave radar)
- **Time Format**: TUYA_MCU (9 bytes: [0x00,0x07, YY,MM,DD,HH,MM,SS,Weekday])
- **Issue**: Some MCU devices require v3.3+ protocol with sequence echo
- **Mitigation**: TuyaTimeSyncFormats auto-detects MCU format; fallback to TUYA_SEQ_10 if needed

## Switches

### BSEED/Zemismart ZCL-Only Switches
- **Manufacturer names**: `_TZ3000_l9brjwau`, `_TZ3000_blhvsaqf`, `_TZ3000_ysdv91bk`, `_TZ3000_hafsqare`, `_TZ3000_e98krvvk`, `_TZ3000_iedbgyxt`
- **Issue**: Require explicit ZCL binding; no Tuya DP fallback
- **Behavior**: Multi-gang switches (1-8 gang) with physical button detection via 2000ms markAppCommand window
- **Deduplication**: 200ms debounce + 1.5s sliding window

### TS0601 Switches (Tuya DP)
- **Issue**: Some variants are cloud-only (MCU ignores local commands)
- **Detection**: If device never responds to DP commands, it may be cloud-only
- **Workaround**: Check if device works in Zigbee2MQTT or ZHA (confirms local capability)

## Covers

### Quoya M515EGBZTN
- **Issue**: Position values inverted (0=open, 100=closed)
- **Fix**: `positionInvert: true` in cover profile at `lib/registry/profiles/covers.js`
- **Standard**: Most curtains use 0=closed, 100=open

### Curtain Motor TS0601
- **Issue**: Some motors report position erratically during movement
- **Mitigation**: SanityFilter.js (EMA + ROC filtering) smooths position values
- **Filter settings**: EMA alpha=0.3, ROC threshold=15%

## Buttons & Remotes

### TS0044 Buttons (_TZ3000_wkai4ga5)
- **Issue**: Battery always reports 0% (firmware bug)
- **Affected**: All TS0044 variants with this manufacturerName
- **Mitigation**: Voltage-based fallback when voltage DP is available
- **No fix**: Firmware limitation; cannot be resolved at app level

### Scene Switches (PhysicalButtonMixin)
- **Issue**: Ghost button presses when app commands echo back through hardware
- **Fix**: PhysicalButtonMixin uses 2000ms markAppCommand window to filter internal echoes
- **Always call**: `this.markAppCommand(1, value)` before sending commands

## Plugs & Energy Monitors

### Smart Plugs with Energy Monitoring
- **Issue**: Some plugs report power values with inconsistent divisors
- **Fix**: SmartDivisorManager auto-detects from DP metadata
- **Known divisors**: DP3=power (÷1 or ÷10), DP4=voltage (÷10), DP5=current (÷1000)

### DIN Rail Meters
- **Issue**: High DP count with multiple energy channels
- **Mitigation**: DynamicCapabilityManager prunes phantom capabilities after 5-minute audit
- **Check**: If capability exists but ZCL cluster is missing, capability is auto-removed

## Thermostats & TRVs

### AVATTO/Moes TRVs
- **Issue**: Complex DP mappings with 10+ data points (target temp, mode, window, child lock, etc.)
- **Fix**: TuyaEF00Manager handles multi-frame DP reports
- **DataQuery**: Periodic dataQuery mechanism keeps sleepy TRVs synchronized
- **Time Format**: TUYA_FULL_TZ (10 bytes with TZ + DST) or TUYA_EXTENDED_TZ (9 bytes with TZ)
- **Known patterns**: `_TZE200_ckud7u2l` -> TUYA_FULL_TZ; `_TZE200_aoclfnxz` -> TUYA_EXTENDED_TZ

### Floor Heating Thermostats
- **Issue**: Calibration offsets sometimes applied twice (app + device)
- **Mitigation**: SmartDivisorManager tracks calibration state to prevent double-application

## Radar/Presence Sensors

### HOBEIAN ZG-204ZM
- **Issue**: Fallback to feature-bloated configs can assign fake temperature/humidity
- **Fix**: Use `HOBEIAN_ZG204ZM_FALLBACK` profile (minimal capabilities) instead of `HOBEIAN_10G_MULTI`
- **Detection threshold**: Configurable distance threshold for presence detection

### mmWave Radars (Generic)
- **Issue**: Missing proper distance threshold handling in some configurations
- **Mitigation**: DynamicCapabilityManager prunes capabilities not supported by hardware
- **Recommendation**: Use `presence_sensor_radar` driver for mmWave devices

## Weather Stations (MCU Time Sync)

### ZT08 Weather Stations
- **Affected**: `_TZE200_rhgsbacq` (ZG-204ZM variant)
- **Time Format**: TUYA_MCU with DP17 commit trigger
- **Issue**: Clock drifts after time sync without DP17 commit
- **Fix**: After sending time sync response, app writes DP17=false as commit trigger
- **Protocol**: MCU UART v3.4+

### Simple Devices (TUYA_STANDARD format)
- **Affected**: `_TZE200_cowvfni3`, `_TZE200_nv6nxo0c`, `_TZE200_fzo2pocs` (curtain motors)
- **Time Format**: TUYA_STANDARD (7 bytes: [YY,MM,DD,HH,MM,SS,Wd] LOCAL)
- **Issue**: Simple devices need local time, not UTC
- **Mitigation**: TuyaTimeSyncFormats detects and sends correct local time format

---

## Cross-Project Findings (Z2M/ZHA/Hubitat/SmartThings)

### Time Sync Research Sources
| Source | Contribution |
|--------|-------------|
| Z2M Issue #30054 | Epoch 1970 vs 2000 for TS0601 devices |
| Z2M Issue #29627 | ZT08 clock sync with DP17 commit |
| Z2M Issue #26078 | TZE284_vvmbj46n TH05Z LCD sync |
| Z2M tuya.ts | mcuSyncTime, timeStart format implementations |
| ZHA zhaquirks/tuya/__init__.py | TuyaManufCluster time handling |
| Hubitat | Tuya Zigbee MCUsender time payload format |
| SmartThings Edge | Tuya time attribute handling |
| Tuya MCU UART Spec | developer.tuya.com/en/docs/iot-device-dev/rvc_time_service |

### Manufacturer-to-Format Mapping (Cross-Referenced)
| Manufacturer | Format | Source |
|-------------|--------|--------|
| `_TZE200_bjawzodf` | TUYA_DUAL_2000 | Z2M + community |
| `_TZE200_ckud7u2l` | TUYA_FULL_TZ | Z2M TRV converters |
| `_TZE200_3towulqd` | TUYA_MCU | Z2M + Hubitat |
| `_TZE200_rhgsbacq` | TUYA_MCU + DP17 | Z2M Issue #29627 |
| `_TZE204_sxm7l9xa` | TUYA_MCU | Z2M radar converters |
| `_TZE200_cowvfni3` | TUYA_STANDARD | Z2M curtain converters |
| `_TZ3000_*` (all) | ZIGBEE_2000 | ZCL standard devices |
| `TS0601` (default) | TUYA_MCU | Tuya MCU protocol |

---

*Generated by Claude Code - 15 June 2026 | Version 9.0.36*
