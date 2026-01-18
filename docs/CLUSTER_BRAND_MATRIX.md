# Zigbee Cluster ↔ Brand Matrix

## Tuya DP Cluster (0xEF00 / 61184)

| Brand | Presence | Climate | Switch | Thermostat | Cover |
|-------|----------|---------|--------|------------|-------|
| MOES | ✓ | ✓ | ✓ | ✓ | ✓ |
| Zemismart | ✓ | ✓ | ✓ | ✓ | ✓ |
| Lonsonho | ✓ | ✓ | ✓ | - | ✓ |
| BlitzWolf | ✓ | ✓ | ✓ | - | - |
| NEO | ✓ | ✓ | - | - | - |
| Aubess | ✓ | ✓ | ✓ | - | - |
| Girier | - | ✓ | ✓ | - | - |

## Standard ZCL Clusters

| Cluster | ID | Brands |
|---------|-----|--------|
| On/Off | 0x0006 | All |
| Level | 0x0008 | Philips, IKEA, GLEDOPTO, innr |
| Color | 0x0300 | Philips, IKEA, GLEDOPTO |
| Temperature | 0x0402 | Aqara, SONOFF, Develco |
| Humidity | 0x0405 | Aqara, SONOFF, Develco |
| IAS Zone | 0x0500 | Aqara, HEIMAN, frient |
| Power | 0x0B04 | Develco, frient, Schneider |

## Presence Sensor ManufacturerNames

```
_TZE200_ges7h5mj, _TZE204_ges7h5mj  → ZG-204ZL/ZH
_TZE200_hl0ss9oa, _TZE204_hl0ss9oa  → ZG-204ZM
_TZE200_sfiy8puu, _TZE204_sfiy8puu  → Human Presence
_TZE200_1ibpyhdc                     → mmWave Radar
_TZE284_iadro9bf                     → 24GHz Radar
```

## Climate Sensor ManufacturerNames

```
_TZE200_bjawzodf  → Temp/Humidity LCD
_TZE200_locansqn  → Temp/Humidity
_TZE200_bq5c8xfe  → Soil Moisture
_TZ3000_*         → Standard ZCL Climate
```
