# Tuya WiFi Local Integration

## Overview
Complete local control for Tuya WiFi devices without permanent cloud dependency.
After initial setup (to get local keys), devices communicate directly over LAN.

## Architecture
```
SmartLife App scan QR> TuyaSmartLifeAuth > local_key + device list
  OR                         
IoT Platform apiKey> TuyaSmartLifeAuth > local_key + device list
  OR                         
Manual entry > device_id + local_key + IP
                             
                    TuyaDeviceDiscovery (UDP 6666/6667)
                             
                    
                      Matched Devices  (cloud keys + LAN IPs)
                    
                             
                    TuyaLocalDevice (tuyapi)
                    Protocol 3.1 / 3.3 / 3.4 / 3.5
                             
                    Direct LAN TCP control
```

## 3 Authentication Methods

### Method 1: SmartLife QR Code (RECOMMENDED - No developer account needed)
1. User opens pairing flow, selects 'SmartLife Login'
2. App generates QR code via Tuya sharing API
3. User scans QR with SmartLife/Tuya Smart app
4. App receives auth token + device list with local keys
5. UDP discovery matches device IPs on LAN

**Requires:** SmartLife or Tuya Smart mobile app account (email+password)

### Method 2: Tuya IoT Platform API
1. User creates project on https://iot.tuya.com
2. Enters Access ID + Access Secret + any Device ID
3. App authenticates and retrieves all devices with local keys

**Requires:** Tuya IoT Platform developer account (free)

### Method 3: Manual Entry
1. User enters Device ID + Local Key + IP directly
2. Local key can be obtained from TinyTuya, tuyapi CLI, or other tools

**Requires:** Device credentials from external tools

## Components

| File | Purpose |
|------|---------|
| `TuyaSmartLifeAuth.js` | Authentication: QR scan + IoT Platform + token management |
| `TuyaDeviceDiscovery.js` | UDP LAN discovery on ports 6666/6667 |
| `TuyaLocalDevice.js` | Base device class: tuyapi wrapper with reconnect + heartbeat |
| `TuyaLocalDriver.js` | Pairing driver: 3 methods + cloud device list + LAN discovery |
| `TuyaZigbeeBridge.js` | Zigbee gateway bridge: sub-device control via gateway TCP |
| `TuyaCloudAPI.js` | Legacy Tuya Open API client (IoT Platform method) |
| `TuyaCloudMQTT.js` | Real-time cloud MQTT updates (optional, AES-ECB/GCM) |

## Zigbee Gateway Bridge
Sub-devices controlled via gateway TCP using cid parameter.

## Protocol Support
- **3.1** - Legacy unencrypted (very old devices)
- **3.3** - AES-ECB encrypted (most common)
- **3.4** - AES-GCM encrypted (newer devices)
- **3.5** - Latest protocol (newest devices)

## UDP Discovery
- **Port 6666**: Unencrypted broadcast (protocol 3.1)
- **Port 6667**: AES-128-ECB encrypted broadcast (protocol 3.3+)
- Well-known UDP key: `6c1ec8e2bb9bb59ab50b0daf649b5cb0`
- Devices broadcast their ID, IP, version, product key

## Dependencies
- `tuyapi` (npm) - Local TCP communication with Tuya devices
- Node.js `crypto` - HMAC-SHA256 signing, AES decryption
- Node.js `dgram` - UDP socket for LAN discovery
- Node.js `https` - Cloud API requests

## Research Sources
- [tuya-local (HA)](https://github.com/make-all/tuya-local) - QR code auth via tuya_sharing
- [LocalTuya (HA)](https://github.com/rospogrigio/localtuya) - Cloud API for local keys
- [TinyTuya](https://github.com/jasonacox/tinytuya) - Python cloud + local device control
- [tuyapi](https://github.com/codetheweb/tuyapi) - Node.js local device communication
- [Drenso/com.tuya2](https://github.com/Drenso/com.tuya2) - OAuth2 + MQTT patterns
- [jurgenheine/com.tuya.cloud](https://github.com/jurgenheine/com.tuya.cloud) - MQTT v1/v2
- [rebtor/nl.rebtor.tuya](https://github.com/rebtor/nl.rebtor.tuya) - Homey tuyapi device
- [heszegi/com.heszi.ledvance-wifi](https://github.com/heszegi) - Homey tuyapi patterns
- [tuya-connector-nodejs](https://github.com/tuya/tuya-connector-nodejs) - Official SDK