## 🏗️ 1. Core Paradigms

### WiFi: Local Direct First (Direct Mode)
- **Direct Mode**: Homey Pro behaves like a high-speed local client (e.g., WiFi Printer). It communicates directly with the device's IP over the LAN via persistent TCP sockets (Port 6668).
- **Discovery**: Uses mDNS (protocol 3.3+) and UDP Broadcasts (port 6667) for <50ms local detection.
- **Silent Sync (Bidirectional)**:
    - **LAN -> Cloud**: When Homey sends a local TCP command, the device's chip autonomously reports the change to the Tuya Cloud. The Tuya Mobile App updates instantly.
    - **Cloud -> LAN**: If the Tuya App triggers a change, the device pushes a report to Homey via the active local socket.
    - **Efficiency**: Zero cloud-API quotas are consumed for status updates.

### Zigbee: Native ZCL
- **Standard First**: Prioritizes standard Zigbee Clusters (On/Off, Level) via `TuyaZigbeeDevice`.
- **Hybrid Bridge**: Fallback to `tuyaEF00Manager` for proprietary DataPoints (DPs).
- **Local Isolation**: Zigbee devices are 100% managed by Homey's radio. No Cloud shadowing/mirroring is allowed by default to prevent loops and rate-limiting.

---

## 🛡️ 2. The Anti-Contamination Shield

### Code Inheritance Strictness
| Protocol | Base Class | Primary Manager |
| :--- | :--- | :--- |
| **Zigbee** | `BaseHybridDevice` | `tuyaEF00Manager` |
| **WiFi** | `TuyaLocalDevice` | `TuyaWiFiHybridManager` |

### Maintenance Gating (GitHub)
The CI/CD pipeline and the `TriageEngine` must validate the driver protocol before applying patches:
1.  **Zigbee Check**: `!!manifest.zigbee`
2.  **WiFi Check**: `driverId.startsWith('wifi_')`
3.  **Shield**: Never apply TCP/IP or mDNS specific logic to drivers where `isZigbee === true`.

---

## 📂 3. Separation of Concerns

### Homey App (The Runtime)
- Located in `drivers/`, `lib/`, `app.js`.
- Responsible for real-time execution, local connectivity, and UI.
- Must remain 100% functional without internet access.

### GitHub (The DevOps)
- Located in `scripts/maintenance/`, `.github/workflows/`.
- Responsible for fleet audits, pattern detection, and autonomous repairs.
- Provides the "intelligence" that prevents manual regression testing.

---

## 🧠 4. Autonomous Intelligence (Thinking Opus 4.6)

### Intelligence Harvesting
- **Descending Search**: Scans descendant forks of the ecosystem for specific driver patches and community-tested manufacturer names.
- **Ascending Search**: Scans upstream repositories (JohanBendz/sypsera) for structural innovations and SDK 3 refactoring patterns.
- **Logic Extraction**: Moves beyond simple fingerprints to extract functional methods (e.g., advanced energy calibration, local scene handling) and merges them into the `lib/` core.

### Stability Anchoring
- **Legacy Preservation (Rule 22)**: Prioritizes maintaining established driver-to-device links over "perfect" dry deduplication. Fingerprints are anchored to legacy drivers to prevent breaking thousands of existing units.
- **Interoperable Flows (Rule 21)**: Decouples Flow cards from specific drivers by using capability-based filtering, allowing seamless hardware transitions for users.
