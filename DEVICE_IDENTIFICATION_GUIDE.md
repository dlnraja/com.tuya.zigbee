# 🔍 Device Identification Guide: Standard Zigbee vs Tuya DP

## ✅ How to Identify Device Type

### Method 1: Model ID
```
TS0601  → ALWAYS Tuya DP (cluster 0xEF00)
TS0002  → Standard Zigbee
TS0003  → Standard Zigbee
TS0004  → Standard Zigbee
TS0043  → Standard Zigbee (button)
TS0044  → Standard Zigbee (button)
TS0202  → Standard Zigbee (motion)
TS0222  → Standard Zigbee (motion + lux)
TS0215A → Standard Zigbee (emergency button)
```

### Method 2: Manufacturer Prefix
```
_TZE200_* → Tuya DP (TS0601)
_TZE284_* → Tuya DP (TS0601)
_TZ3000_* → Standard Zigbee
_TZ3400_* → Standard Zigbee
```

### Method 3: Cluster Detection (MOST RELIABLE!)
```javascript
// Check for Tuya DP cluster
const hasTuyaCluster = zclNode?.endpoints?.[1]?.clusters?.[0xEF00]
                    || zclNode?.endpoints?.[1]?.clusters?.tuyaManufacturer
                    || zclNode?.endpoints?.[1]?.clusters?.tuyaSpecific;

if (modelId === 'TS0601' || hasTuyaCluster) {
  // This is a Tuya DP device
  // Use TuyaEF00Manager
} else {
  // Standard Zigbee device
  // Use standard cluster reading
}
```

## 🎯 Implementation

Implemented in:
- `lib/utils/battery-reader.js` (lines 93-115) ✅
- Checks cluster 0xEF00 presence
- Avoids false positives with _TZ3000_* devices

## ⚠️ Common Mistakes to Avoid

### WRONG: Manufacturer prefix only
```javascript
// ❌ BAD - False positives!
if (manufacturer.startsWith('_TZE')) {
  // This matches _TZ3000_ too!
}
```

### RIGHT: Cluster check
```javascript
// ✅ GOOD - Accurate detection
const hasTuyaCluster = zclNode?.endpoints?.[1]?.clusters?.[0xEF00];
if (modelId === 'TS0601' || hasTuyaCluster) {
  // Truly Tuya DP
}
```

## 📊 Your Devices Classification

### Standard Zigbee (_TZ3000_*)
- Switch 2gang (TS0002)
- 4-Boutons (TS0044)
- 3 Boutons (TS0043)
- Sos Button (TS0215A)

**Reading method:** Standard clusters (genPowerCfg, onOff)

### Tuya DP (TS0601)
- Climate Monitor (_TZE284_vvmbj46n)
- Presence Radar (_TZE200_rhgsbacq)
- Soil Tester (_TZE284_oitavov2)

**Reading method:** TuyaEF00Manager (cluster 0xEF00)

## ✅ Status: Correctly implemented in v4.9.322
