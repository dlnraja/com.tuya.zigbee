# Manufacturer Identification Methods
> February 2, 2026 | v5.8.1 | Sources: Homey SDK3, Athom GitHub

## 1. Official SDK3 Methods

### Driver Manifest (driver.compose.json)
```json
{
  "zigbee": {
    "manufacturerName": ["_TZ3000_abc123"],
    "productId": ["TS0001"]
  }
}
```

### Basic Cluster readAttributes (0x0000)
```javascript
const attrs = await zclNode.endpoints[1].clusters.basic.readAttributes([
  'manufacturerName',  // 0x0004
  'modelId',           // 0x0005
  'swBuildId',         // 0x4000
  'powerSource'        // 0x0007
]);
```

### Device Settings (CORRECT keys)
```javascript
device.getSetting('zb_manufacturer_name');  // ✅ Correct
device.getSetting('zb_model_id');           // ✅ Correct
// NOT: zb_manufacturerName or zb_modelId (wrong!)
```

## 2. Fallback Chain (ManufacturerNameHelper.js)

```javascript
function getManufacturerName(device) {
  return device.getSetting?.('zb_manufacturer_name')
      || device.getStoreValue?.('manufacturerName')
      || device.getData?.()?.manufacturerName
      || device.zclNode?.manufacturerName
      || device.driver?.manifest?.zigbee?.manufacturerName?.[0]
      || '';
}
```

## 3. Tuya Protocol Detection

| Pattern | Protocol |
|---------|----------|
| `_TZ3000_*` | ZCL Standard |
| `_TZE200_*` | Tuya DP |
| `_TZE204_*` | Tuya DP v2 |
| `_TZE284_*` | Tuya DP v3 |
| `TS0601` | Tuya DP |

```javascript
const isTuyaDP = model === 'TS0601' || mfr.startsWith('_TZE');
```

## 4. Debug Methods

```javascript
// Print node structure
this.printNode();

// Read from cluster (async)
const basic = zclNode.endpoints[1].clusters.basic;
const attrs = await basic.readAttributes(['manufacturerName', 'modelId']);
```

## 5. Key Files in Project

| File | Purpose |
|------|---------|
| `lib/helpers/ManufacturerNameHelper.js` | Unified mfr retrieval |
| `lib/helpers/DeviceIdentificationDatabase.js` | Auto-scan drivers |
| `lib/tuya/DeviceFingerprintDB.js` | Fingerprint database |
| `lib/utils/CaseInsensitiveMatcher.js` | Case-insensitive matching |

## 6. Homey Developer Tools Interview

### Interview Process (Official Method)
Access via: https://tools.developer.homey.app/

**Nodes Table Properties:**
| Property | Description |
|----------|-------------|
| IEEE Address | Unique device identifier (MAC) |
| Network Address | Current network address |
| Type | Router (mains) or EndDevice (battery) |
| Manufacturer | `manufacturerName` for driver manifest |
| Model ID | `productId` for driver manifest |

**Interview Output Contains:**
- `modelId` - Product ID for manifest
- `manufacturerName` - Manufacturer ID for manifest
- `endpointDescriptors` - Endpoints and cluster IDs
- `endpoints` - Detailed cluster info (commands, attributes)

### Interview JSON Example
```json
{
  "modelId": "TS0001",
  "manufacturerName": "_TZ3000_abc123",
  "endpointDescriptors": {
    "1": {
      "inputClusters": [0, 6, 4, 5],
      "outputClusters": [25]
    }
  },
  "endpoints": {
    "1": {
      "clusters": {
        "basic": { "attributes": {...} },
        "onOff": { "attributes": {...}, "commands": {...} }
      }
    }
  }
}
```

## 7. External Database Sources

| Source | URL | Content |
|--------|-----|---------|
| Z2M Converters | github.com/Koenkk/zigbee-herdsman-converters | 4800+ devices |
| ZHA Quirks | github.com/zigpy/zha-device-handlers | Python quirks |
| Blakadder | zigbee.blakadder.com | Community DB |
| JohanBendz | github.com/JohanBendz/com.tuya.zigbee | Homey Tuya app |

---
*See Homey SDK3: https://apps.developer.homey.app/wireless/zigbee*
*See Developer Tools: https://apps.developer.homey.app/guides/tools/zigbee*
