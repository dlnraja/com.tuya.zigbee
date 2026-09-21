# Local-First SSOT (P2660)

**Machine:** [`config/architecture/local-first-ssot.json`](../../config/architecture/local-first-ssot.json)  
**Gate:** `npm run check:p2660` (+ `check:p2525`, `check:wifi-local`)

## Doctrine (all apps)

Universal Tuya, Tuya Unified (Stable), and Zigbee Bastien are **local-first by priority**:

1. **Homey Zigbee mesh** — ZCL / Tuya EF00 on the Homey Pro coordinator (no Tuya account, no `local_key`).
2. **WiFi LAN** — TuyAPI / TinyTuya-style TCP + UDP with `device_id` + `local_key` persisted in Homey settings/store.
3. **Hub `gwID` + `cid`** — fallback only for Zigbee behind a Tuya WiFi gateway (limited concurrent LAN sessions).
4. **Cloud** — optional one-shot pairing / key export only when the user explicitly enables `cloudFallback`. Never the steady-state control path.

## Defaults (must not regress)

| Setting | Default |
|---------|---------|
| `strategy` | `local_first` |
| `cloudFallback` | `false` |
| `cloudMirroring` | `false` |
| `localDiscovery` | `true` |

Runtime: `lib/wifi/WiFiConnectionPolicy.js`, `lib/wifi/LocalFirstResolver.js`.

## Why (P215)

| | |
|--|--|
| **Pourquoi** | Homey Pro users expect offline control; T146735 cloud apps die on reboot / error 2001 |
| **Comment** | Zigbee never opens Tuya OpenAPI; WiFi prefers LAN and refuses cloud when unhealthy |
| **Pour qui** | Homey Pro (Universal / Stable / Bastien house) |
| **Quand** | Pair, reboot, capability TX/RX, flows |
| **Contre quoi** | Cloud-first defaults, Zigbee→cloud dependency, silent cloud re-login loops |

## Related

- WiFi deep dive: [`docs/WIFI_LOCAL_FIRST_ARCHITECTURE.md`](../WIFI_LOCAL_FIRST_ARCHITECTURE.md)
- T146735 lessons: `config/architecture/t146735-local-first-lessons.json`
- OSS LAN peers (data sources, not cloud control): `docs/CREDITS.md`, `config/architecture/oss-lan-tuya-enrich-ssot.json`
- Homey runtime AI: zero cloud — `docs/architecture/LOCAL_AUTO_IMPROVE_SSOT.md`
- Agent rule: `.cursor/rules/local-first-always.mdc`
