# P2410 — Autonomous advertising discovery (WiFi + Zigbee)

**Date:** 2026-09-03  
**Classify:** WiFi UDP/mDNS hooks = **BOTH** · Settings mesh/LAN map UX = **MASTER_ONLY**

## WHY
Users need to see devices *currently advertising* (LAN UDP beacons / mDNS / Zigbee recent RX) without cloud polling.

## Shipped

### WiFi
| Piece | Change |
|-------|--------|
| `TuyaUDPDiscovery` | `listAdvertising()`, `burstProbe()`, richer payload (`uuid`/`gwId`), `device-advertising` events |
| `AutonomousAdvertisingDiscovery` | Merge UDP + Homey `_tuya._tcp` + paired/unpaired flags |
| Homey strategy | `discovery: "tuya_wifi"` on 28 Tuya `wifi_*` drivers |
| Device/Driver | `onDiscovery*` IP repair (mDNS) |
| Pairing | `lan_discover` + `collectLanDevices` use burst probe |
| Settings | **WiFi LAN — advertising devices** + `GET /wifi-lan-map` |

### Zigbee
| Piece | Change |
|-------|--------|
| `ZigbeeMeshMap` | `advertising` per node + `stats.advertising` (recent RX/online) |
| `DynamicEndpointDiscovery` | Catalog advertised clusters / `summarizeAdvertising` |
| Settings spider | Advertising chip + detail flag |

**Limit:** Unpaired Zigbee join beacons stay Homey-stack-owned (Add device). Apps only see paired advertisers.

## Verify
```bash
node --test test/critical/p2410-advertising-discovery.test.js
node tools/ci/harden-wifi-local.js
```
