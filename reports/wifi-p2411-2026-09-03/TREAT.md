# P2411 — Max discovery & pairing (WiFi + Zigbee interview)

**Date:** 2026-09-03  
**Classify:** **BOTH** (LAN discover/match/probe) · Settings TCP deep-scan UX rides existing MASTER_ONLY map

## WHY
Silent 3.5 devices skip UDP broadcast; TinyTuya Force Scan (TCP/6668) finds them. Pairing must merge UDP+TCP+mDNS and match cloud keys harder.

## Shipped
| Layer | Change |
|-------|--------|
| `TuyaTcpForceScan` | Bounded /24 TCP·6668 force scan (concurrency capped) |
| `collectLanDevices` | Max mode: burst → settle → UDP scan → mDNS → TCP force |
| `matchCloudToLan` | Case-insensitive id, uuid, unique productKey, orphan LAN rows |
| `probeLocalCredentials` | Multi-IP hints + full 3.5→3.1 cascade |
| Pair UI | **Max LAN discover** button → fill Device ID / IP / version |
| Settings map | TCP force enrich on `/wifi-lan-map` |
| Zigbee | `listPairingCandidates` + `suggestedEp` on interview advertising |

## Verify
```bash
node --test test/critical/p2411-max-discovery-pairing.test.js
node tools/ci/harden-wifi-local.js
```
