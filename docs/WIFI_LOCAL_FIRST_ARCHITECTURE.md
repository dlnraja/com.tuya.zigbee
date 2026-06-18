# WiFi Local-First Architecture — Complete Visual Reference
> Version 9.0.40 | June 2026 | 51 WiFi Drivers

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HOMEY PRO (Runtime)                               │
│                        100% LOCAL — Zero Cloud Calls                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │  app.js      │    │  Driver      │    │  Device      │                  │
│  │  (Singleton) │    │  (Per-type)  │    │  (Per-unit)  │                  │
│  │              │    │              │    │              │                  │
│  │ _tuyaUDP     │    │ onPair()     │    │ onInit()     │                  │
│  │ Discovery    │    │ onRepair()   │    │ onDeleted()  │                  │
│  │ .start()     │    │              │    │ onSettings() │                  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                   │                           │
│         ▼                   ▼                   ▼                           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    lib/tuya-local/ (13 modules)                      │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                      │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │  │
│  │  │ TuyaUDPDiscovery│  │ TuyaLocalDevice │  │ TuyaLocalDriver     │  │  │
│  │  │ (UDP Listener)  │  │ (Base WiFi Dev) │  │ (Pairing Driver)    │  │  │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────────┘  │  │
│  │           │                    │                     │               │  │
│  │           ▼                    ▼                     ▼               │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │  │
│  │  │TuyaDeviceDiscover│ │ TuyaLocalClient │  │ TuyaSmartLifeAuth   │  │  │
│  │  │(Scan-on-demand) │  │ (TCP Wrapper)   │  │ (Cloud Auth)        │  │  │
│  │  └─────────────────┘  └────────┬────────┘  └────────┬────────────┘  │  │
│  │                                │                     │               │  │
│  │                                ▼                     ▼               │  │
│  │                       ┌─────────────────┐  ┌─────────────────────┐  │  │
│  │                       │    TuyAPI        │  │  TuyaCloudAPI       │  │  │
│  │                       │  (npm library)   │  │  (HTTP Client)      │  │  │
│  │                       └─────────────────┘  └─────────────────────┘  │  │
│  │                                                                      │  │
│  │  DEAD CODE (deprecated, unused):                                     │  │
│  │  ┌─────────────────────┐ ┌───────────────┐ ┌───────────────────┐   │  │
│  │  │TuyaWiFiHybridManager│ │TuyaShadowPulsar│ │ TuyaLocalWizard  │   │  │
│  │  └─────────────────────┘ └───────────────┘ └───────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐
   │  UDP LAN    │    │  TCP LAN    │    │  Tuya Cloud API │
   │  Broadcast  │    │  Port 6668  │    │  (Key Recovery  │
   │  (Discovery)│    │  (Commands) │    │   + Pairing)    │
   └─────────────┘    └─────────────┘    └─────────────────┘
```

## 2. Device Lifecycle (WiFi)

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                    TuyaLocalDevice Lifecycle                     │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                 │
  │  onInit()                                                       │
  │    │                                                            │
  │    ├─ _destroyed = false                                        │
  │    ├─ Register capability listeners (from dpMappings)           │
  │    │    └─ Each listener calls _setDP(dp, value)                │
  │    └─ _createDevice()                                           │
  │         ├─ Read settings (device_id, local_key, IP)             │
  │         ├─ Create TuyaLocalClient(opts)                         │
  │         │    ├─ resolveIP callback → TuyaUDPDiscovery           │
  │         │    └─ log callback → this.log()                       │
  │         ├─ Wire events: connected, disconnected, error,         │
  │         │    dp-update, auth-error, ip-resolved, version-resolved│
  │         └─ client.connect()                                     │
  │              ├─ Dynamic IP resolution (UDP cache)                │
  │              ├─ TuyAPI({ id, key, ip, version })                │
  │              ├─ Protocol auto-detect (v3.3→3.4→3.5→3.2→3.1)    │
  │              └─ _startHeartbeat() (15s interval)                │
  │                                                                 │
  │  _onData(data)                                                  │
  │    ├─ if (_destroyed) return ← v9.0.40 guard                   │
  │    └─ for each cap in capabilityMap:                            │
  │         └─ safeSetCapabilityValue(cap, fromDevice(dps[dp]))     │
  │                                                                 │
  │  onSettings({ changedKeys })                                    │
  │    └─ If device_id/local_key/IP/version changed:                │
  │         ├─ _destroyDevice()                                     │
  │         └─ _createDevice()                                      │
  │                                                                 │
  │  onDeleted() / onUninit()                                       │
  │    ├─ _destroyed = true ← v9.0.40 (set BEFORE cleanup)         │
  │    └─ _destroyDevice()                                          │
  │         ├─ client.destroy()                                     │
  │         │    ├─ Flush command queue                              │
  │         │    ├─ Stop heartbeat                                   │
  │         │    ├─ Disconnect TCP                                   │
  │         │    └─ removeAllListeners()                            │
  │         └─ _client = null, _connected = false                   │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
```

## 3. TuyaLocalClient — TCP Connection Manager

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                   TuyaLocalClient (TCP Wrapper)                 │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                 │
  │  connect()                                                      │
  │    │                                                            │
  │    ├─ if (_destroyed || _connecting) return                     │
  │    ├─ Dynamic IP resolution via resolveIP(id)                   │
  │    ├─ Create TuyAPI({ id, key, ip, version })                   │
  │    │                                                            │
  │    ├─ ON AUTH ERROR:                                            │
  │    │    └─ Auto-rotate protocol: 3.3 → 3.4 → 3.5 → 3.2 → 3.1 │
  │    │         └─ Recursive connect() (max 5 attempts)            │
  │    │                                                            │
  │    └─ ON CONNECTED:                                             │
  │         ├─ _startHeartbeat() (15s refresh interval)             │
  │         ├─ Reset backoff (5s base, 60s max, 1.5x multiplier)   │
  │         └─ Emit 'connected'                                     │
  │                                                                 │
  │  Command Queue (200ms rate limit)                               │
  │    ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                     │
  │    │ cmd1 │→│ cmd2 │→│ cmd3 │→│ cmd4 │  ← FIFO               │
  │    └──────┘  └──────┘  └──────┘  └──────┘                     │
  │         │                                                       │
  │         ▼                                                       │
  │    _processQueue()                                              │
  │    ├─ Wait 200ms between commands                               │
  │    ├─ 10s timeout per command ← v9.0.40                        │
  │    ├─ 2 automatic retries on timeout/EPIPE/ECONNRESET          │
  │    └─ Reject after max retries                                  │
  │                                                                 │
  │  Heartbeat Monitor                                              │
  │    ├─ Every 15s: refresh({ schema: true })                      │
  │    ├─ Track missedHeartbeats (max 3)                            │
  │    └─ On 3 missed → force reconnect                             │
  │                                                                 │
  │  Reconnection                                                   │
  │    ├─ Exponential backoff: 5s → 7.5s → 11s → ... → 60s max   │
  │    ├─ After 3 failures: bypass cached IP, scan LAN via find()  │
  │    └─ Protocol version rotation on auth errors                  │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
```

## 4. UDP Discovery — Dynamic IP Healing

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                UDP Discovery (LAN Device Cache)                 │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                 │
  │  app.js onInit():                                               │
  │    this._tuyaUDPDiscovery = new TuyaUDPDiscovery({ log })      │
  │    this._tuyaUDPDiscovery.start()                               │
  │                                                                 │
  │  ┌───────────────────────────────────────────────────────┐     │
  │  │  UDP Ports: 6666 (plain) 6667 (ECB) 6668 (GCM)       │     │
  │  │                                                        │     │
  │  │  Device broadcasts → Decrypt → Parse JSON → Store     │     │
  │  │                                                        │     │
  │  │  Cache: Map<deviceId, {info, lastSeen}>               │     │
  │  │  TTL: 120 seconds (cleanup every 60s)                 │     │
  │  └───────────────────────────────────────────────────────┘     │
  │                                                                 │
  │  Events:                                                        │
  │    'device-found'  → Auto-heal IP on paired devices            │
  │    'device-updated'→ Update device settings with new IP         │
  │    'device-lost'   → (no action)                                │
  │                                                                 │
  │  Used by:                                                       │
  │    TuyaLocalClient.resolveIP(id) → getDevice(id).ip            │
  │    TuyaLocalDriver.onPair() → devices getter for LAN scan      │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
```

## 5. Pairing Flow (3 Methods)

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                    TuyaLocalDriver Pairing                      │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                 │
  │  Method 1: SmartLife QR Code                                    │
  │    User scans QR → SmartLife app auth → Poll result             │
  │    → getDevicesWithLocalKeys() → matchDevices(LAN)              │
  │                                                                 │
  │  Method 2: IoT Platform API                                     │
  │    Access ID + Secret → loginWithApiKey()                        │
  │    → getDevicesWithLocalKeys() → matchDevices(LAN)              │
  │                                                                 │
  │  Method 3: Manual                                               │
  │    User enters device_id + local_key + IP                       │
  │    → Direct list_devices                                        │
  │                                                                 │
  │  Unified Login (Easy Mode):                                     │
  │    Uses saved global app settings (access_id, access_secret)    │
  │    → Auto-login → Auto-discover → Auto-match                    │
  │                                                                 │
  │  matchDevices(cloudDevices, lanDevices):                        │
  │    Cloud: [{id, name, local_key, product_id}]                   │
  │    LAN:   [{deviceId, ip, version}]                             │
  │    Merge: Attach IP from LAN cache to cloud devices             │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
```

## 6. Key Recovery (Self-Healing)

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                Local Key Auto-Recovery                          │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                 │
  │  Trigger: TuyaLocalClient emits 'auth-error'                   │
  │                                                                 │
  │  TuyaLocalDevice._attemptLocalKeyRecovery()                     │
  │    │                                                            │
  │    ├─ Guard: if (_isRecoveringKey) return                       │
  │    ├─ Guard: max 3 attempts, then 1h cooldown ← v9.0.40       │
  │    │                                                            │
  │    ├─ Check app settings for cloud credentials                  │
  │    │    └─ tuya_cloud_access_id + tuya_cloud_access_secret      │
  │    │                                                            │
  │    ├─ Create TuyaCloudAPI instance                               │
  │    ├─ api.getDeviceInfo(deviceId)                                │
  │    │    └─ Returns { local_key: "..." }                         │
  │    │                                                            │
  │    ├─ Update device settings: { local_key: newKey }             │
  │    ├─ client.updateKey(newKey)                                   │
  │    └─ Next reconnect will use new key                            │
  │                                                                 │
  │  Failure: setWarning() with instructions                        │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
```

## 7. WiFi Driver Structure (51 Drivers)

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                    WiFi Driver Hierarchy                        │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                 │
  │  Homey.Device                                                   │
  │    └─ TuyaLocalDevice (lib/tuya-local/)                         │
  │         ├─ wifi_plug/device.js                                  │
  │         ├─ wifi_switch/device.js                                 │
  │         ├─ wifi_switch_2gang/device.js                          │
  │         ├─ wifi_switch_3gang/device.js                          │
  │         ├─ wifi_switch_4gang/device.js                          │
  │         ├─ wifi_light/device.js                                 │
  │         ├─ wifi_dimmer/device.js                                │
  │         ├─ wifi_cover/device.js                                 │
  │         ├─ wifi_fan/device.js                                   │
  │         ├─ wifi_sensor/device.js                                │
  │         ├─ wifi_thermostat/device.js                            │
  │         ├─ wifi_heater/device.js                                │
  │         ├─ wifi_humidifier/device.js                            │
  │         ├─ wifi_air_purifier/device.js                          │
  │         ├─ wifi_dehumidifier/device.js                          │
  │         ├─ wifi_door_lock/device.js                             │
  │         ├─ wifi_doorbell/device.js                              │
  │         ├─ wifi_garage_door/device.js                           │
  │         ├─ wifi_pet_feeder/device.js                            │
  │         ├─ wifi_robot_vacuum/device.js                          │
  │         ├─ wifi_siren/device.js                                 │
  │         ├─ wifi_led_strip/device.js                             │
  │         ├─ wifi_ir_remote/device.js                             │
  │         ├─ wifi_power_strip/device.js                           │
  │         ├─ wifi_air_quality/device.js                           │
  │         ├─ wifi_water_tank_monitor/device.js                    │
  │         ├─ wifi_water_valve/device.js                           │
  │         └─ ... (51 total)                                       │
  │                                                                 │
  │  Each driver defines:                                           │
  │    get dpMappings() → [{capability, dp, transform, divisor}]    │
  │    get protocolVersion() → 'auto' | '3.3' | '3.4' | '3.5'     │
  │    get capabilityMap() → cached array of DP↔capability maps     │
  │                                                                 │
  │  Mixin order (v9.0.40 fixed):                                   │
  │    PhysicalButtonMixin(VirtualButtonMixin(BaseClass))           │
  │                                                                 │
  │  Lifecycle (v9.0.40 fixed):                                     │
  │    async onDeleted() {                                          │
  │      await super.onDeleted(); // ← Was missing in 43 drivers   │
  │    }                                                            │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
```

## 8. Data Flow: Command Path

```
  User taps ON in Homey app
         │
         ▼
  ┌──────────────────┐
  │ CapabilityListener│ (registered in onInit)
  │ 'onoff' → true   │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ _setDP(1, true)  │ (TuyaLocalDevice)
  │ Parse dpMappings │
  │ Apply toDevice() │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ client.setDP()   │ (TuyaLocalClient)
  │ _enqueue(fn)     │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ _processQueue()  │
  │ Wait 200ms       │
  │ 10s timeout      │
  │ 2 retries        │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ tuyapi.set({     │
  │   dps: 1,        │
  │   set: true      │
  │ })               │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ TCP Socket       │
  │ Port 6668        │
  │ AES encrypted    │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Physical Device  │
  │ (Tuya WiFi)      │
  └──────────────────┘
```

## 9. Data Flow: State Report Path

```
  Physical device state changes
         │
         ▼
  ┌──────────────────┐
  │ TCP Socket       │
  │ Port 6668        │
  │ AES encrypted    │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ tuyapi 'data'    │
  │ event            │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ TuyaLocalClient  │
  │ _lastDps = {...} │
  │ emit('dp-update')│
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ TuyaLocalDevice  │
  │ _onData({dps})   │
  │ if (_destroyed)  │
  │   return ← guard │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ capabilityMap    │
  │ .fromDevice(v)   │
  │ Apply divisor/   │
  │ transform        │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ setCapability    │
  │ Value(cap, val)  │
  │ → Homey UI       │
  │ → Flow triggers  │
  └──────────────────┘
```

## 10. Security Architecture

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                    Security Layers                               │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                 │
  │  Layer 1: Local Key (32-char hex)                               │
  │    ├─ Stored in device settings (encrypted by Homey)            │
  │    ├─ Never transmitted in plaintext                            │
  │    └─ AES-128-ECB encrypted TCP communication                   │
  │                                                                 │
  │  Layer 2: Protocol Version Negotiation                          │
  │    ├─ Auto-detect: 3.3 → 3.4 → 3.5 → 3.2 → 3.1              │
  │    ├─ Each version has different encryption                     │
  │    └─ v3.5 uses AES-128-GCM (strongest)                        │
  │                                                                 │
  │  Layer 3: Cloud Auth (pairing only)                             │
  │    ├─ HMAC-SHA256 signed requests                               │
  │    ├─ Token with TTL (auto-refresh)                             │
  │    └─ 15s HTTP timeout ← v9.0.40                               │
  │                                                                 │
  │  Layer 4: Key Recovery (self-healing)                           │
  │    ├─ Max 3 attempts, 1h cooldown ← v9.0.40                    │
  │    ├─ Uses cloud API credentials from app settings              │
  │    └─ Updates local_key without re-pairing                      │
  │                                                                 │
  │  Layer 5: Runtime Isolation                                     │
  │    ├─ 100% local on Homey Pro                                   │
  │    ├─ Zero cloud calls during normal operation                  │
  │    ├─ No secrets in app bundle                                  │
  │    └─ Cloud only for pairing + key recovery                     │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
```

## 11. Comparison with Other Apps

```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                    App Comparison Matrix                                  │
  ├──────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┤
  │ Aspect           │JohanBendz│ Drenso   │jurgenhein│  rebtor  │**Notre** │
  ├──────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
  │ Protocol         │ Zigbee   │ Cloud    │Cloud+MQTT│  WiFi    │Zig+WiFi  │
  │ Flow Cards       │ 3-5      │ Rich     │ App-level│Per-device│ 4,567+   │
  │ Capabilities     │ Static   │ Dynamic  │ Dynamic  │ Static   │Dyn+Stat  │
  │ Multi-Gang       │Sub-devs  │onoff.code│onoff.code│Separate  │ Hybrid   │
  │ TS0601 DP        │ Custom   │ N/A      │ N/A      │ N/A      │Full sup. │
  │ Throttle         │ None     │30s cache │ 1000ms   │ None     │120RX/min │
  │ # Drivers        │ 100+     │ 28       │ 12       │ 15       │ **412**  │
  │ Local-First      │ ✓ (Zig)  │ ✗        │ ✗        │ ✓ (WiFi) │ **✓✓**   │
  │ Protocol Auto-Det│ N/A      │ N/A      │ N/A      │ ✗        │ **✓**    │
  │ Key Self-Healing │ N/A      │ N/A      │ N/A      │ ✗        │ **✓**    │
  │ IP Self-Healing  │ N/A      │ N/A      │ N/A      │ ✗        │ **✓**    │
  │ Command Queue    │ N/A      │ N/A      │ 1000ms   │ None     │ **200ms**│
  │ Heartbeat Watch  │ N/A      │ N/A      │ N/A      │ ✗        │ **15s**  │
  │ Reconnect Backoff│ N/A      │ N/A      │ N/A      │ ✗        │ **✓**    │
  └──────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

## 12. Known Issues & Limitations

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                    WiFi Device Known Issues                     │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                 │
  │  FIRMWARE-LEVEL:                                                │
  │  ├─ Some devices require specific protocol version              │
  │  ├─ Some devices don't support heartbeat refresh                │
  │  └─ Cloud-only devices can't be controlled locally              │
  │                                                                 │
  │  NETWORK-LEVEL:                                                 │
  │  ├─ UDP broadcasts blocked by some routers                      │
  │  ├─ IP changes require dynamic healing                          │
  │  └─ Multiple network interfaces can confuse discovery           │
  │                                                                 │
  │  PROTOCOL-LEVEL:                                                │
  │  ├─ Auth handshake varies by firmware version                   │
  │  ├─ Some devices need magic packet initialization               │
  │  └─ Command queue overflow on very chatty devices               │
  │                                                                 │
  │  FIXED (v9.0.40):                                               │
  │  ├─ ✅ TCP connection leak on device deletion (43 drivers)     │
  │  ├─ ✅ _destroyed guard on _onData()                           │
  │  ├─ ✅ Command timeout (10s) prevents queue stall              │
  │  ├─ ✅ HTTP timeout (15s) prevents cloud API hang              │
  │  ├─ ✅ Token expire calculation fixed (seconds→ms)             │
  │  ├─ ✅ sendCommand now refreshes token before send             │
  │  ├─ ✅ Key recovery rate-limited (3 attempts, 1h cooldown)     │
  │  ├─ ✅ MQTT reconnect with exponential backoff                  │
  │  ├─ ✅ Mixin order standardized (14 files)                     │
  │  └─ ✅ Missing imports added (2 files)                         │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
```

---

*Generated by Claude Code — v9.0.40 | June 2026*
*Based on: docs/ARCHITECTURE.md, docs/WIFI_VS_ZIGBEE_STANDARD.md, PROJECT_INDEX.md §21,*
*docs/LOCAL_KEY_EXTRACTION.md, docs/KNOWN_ISSUES.md, README.md*
