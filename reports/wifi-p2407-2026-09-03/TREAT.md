# P2407 — WiFi / SmartLife local-first + community enrichment (2026-09-03)

## Classification
| Slice | Tag |
|-------|-----|
| Community DP catalog, settings UX, DeviceIOFacade fix, Pages/docs | **MASTER_ONLY** |
| LocalFirstResolver + CloudHealthState + WiFiDPRegistry on Stable TuyaLocalDevice | **BOTH** |

## Shipped
1. `data/wifi/community-dp-hints.json` — **330** products / ~64KB from `tuya-local-results.json` (name→Homey cap map)
2. `tools/ci/build-wifi-community-dp-hints.js` + `npm run wifi:build-hints` / `wifi:check-hints`
3. `WiFiDPRegistry` loads catalog via Buffer+JSON.parse; extra categories `fs/pc/kt/cs/qn/js/xfj`
4. `DeviceIOFacade.resolveWifi` fixed to call `resolveWiFiTransport` (was no-op)
5. Settings: Local-First card + `wifi_default_cloud_fallback` (diagnostic only)
6. Pairing store inherits app default cloudFallback
7. Stable: copied resolver/health/registry + enrich + decision log in `TuyaLocalDevice`
8. Gates: `wifi:harden` includes P2407 — **PASS**

## Community inspiration
| Project | What we took |
|---------|----------------|
| make-all/tuya-local | YAML DP names → compact product hints |
| TinyTuya | UDP keys / probe (already P2367); scanner still thin |
| LocalTuya | Entity DP tables (Zigbee path); WiFi via name map |
| tuyapi | Runtime TCP client |

## Backlog (next)
- Uncap tuya-local crawl to full 995
- LocalTuya soft scanner
- Wire or delete `LocalWiFiTuyaBridge` / hybrid dead modules
- New drivers: EV / kettle / HRV if demand

## Verify
```bash
node tools/ci/harden-wifi-local.js
node --test test/critical/p2407-wifi-community-hints.test.js
```
