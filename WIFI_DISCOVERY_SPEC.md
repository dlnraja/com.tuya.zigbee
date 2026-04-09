# WiFi Discovery & Connectivity Specification (v1.0.0)

## 📡 1. Discovery Pipeline (LAN-Only)

The discovery engine follows a "mDNS-First, UDP-Probe" strategy to ensure zero-latency detection.

### Stage 1: mDNS Service Discovery
- **Service**: `_tuya._tcp.local`
- **Mechanism**: Listen for mDNS advertisements from devices.
- **Benefit**: Lowest battery impact for sleepy devices and zero broadcast traffic.

### Stage 2: UDP Broadcast (Legacy/Fallback)
- **Ports**: 6666 (Unencrypted), 6667 (Encrypted)
- **Mechanism**: Active polling every 60s if IP is unknown.
- **Payload**: Standard Tuya Discovery JSON.

---

## 🔌 2. Persistence Mode (Direct TCP)

### Socket Management
- **Port**: 6668
- **Heartbeat**: 10s PING to maintain connection.
- **Auto-Healing**: If a socket disconnects, the manager triggers a Stage 1 discovery to detect IP shifts before setting the device as "Unavailable".

### Protocol Versions
- **v3.1**: Plaintext JSON with CRC (Legacy).
- **v3.3**: AES-128-ECB encrypted payload (Standard).
- **v3.4/3.5**: Frame number synchronization and enhanced encryption (New).

---

## 🪞 3. State Mirroring (Mobile App Sync)

### Bidirectional Flow
1. **Local Command**: Homey Pro -> Device (LAN).
2. **Device State Change**: Device -> Cloud (WAN).
3. **Cloud Mirror**: Tuya App displays change (Inherent to Tuya platform).
4. **External Control**: Tuya App -> Cloud -> Device -> Homey (VIA TCP Socket).

**Note**: Homey does NOT need to reach out to the Cloud for state sync for WiFi devices; it acts as a listener on the persistent local socket.
