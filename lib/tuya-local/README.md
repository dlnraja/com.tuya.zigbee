# Tuya WiFi Local Integration

## Architecture

Based on patterns from:
- **heszegi/com.heszi.ledvance-wifi** - tuyapi local LAN (protocol v3.3-3.5)
- **rebtor/nl.rebtor.tuya** - tuyapi local + cloud pairing
- **Drenso/com.tuya2** - MQTT + OAuth2 cloud API
- **jurgenheine/com.tuya.cloud** - Tuya Open API + MQTT

## Components

| File | Purpose |
|------|---------|
| TuyaLocalDevice.js | Base device class for WiFi local LAN control via tuyapi |
| TuyaLocalDriver.js | Base driver for pairing (manual + cloud discovery) |
| TuyaCloudAPI.js | Tuya Open API client for device discovery & commands |

## How It Works

1. **Pairing**: User provides device_id + local_key (obtained from Tuya IoT Platform)
2. **Connection**: tuyapi connects directly to device on LAN (no cloud needed after pairing)
3. **Control**: Commands sent via Tuya protocol v3.3/3.4/3.5 over TCP
4. **Status**: Device pushes status updates via the same TCP connection

## Capability Mapping

Each device subclass defines a \`capabilityMap\` array:
\`\`\`javascript
get capabilityMap() {
  return [
    { capability: 'onoff', dp: '1', toDevice: v => v, fromDevice: v => v },
    { capability: 'dim', dp: '2', toDevice: v => Math.round(v * 1000), fromDevice: v => v / 1000 },
  ];
}
\`\`\`

## Dependencies

Requires \`tuyapi\` npm package:
\`\`\`bash
npm install tuyapi
\`\`\`

## Protocol Versions
- **v3.3**: Most common, works with majority of devices
- **v3.4**: Newer devices with enhanced encryption
- **v3.5**: Latest protocol with additional security
