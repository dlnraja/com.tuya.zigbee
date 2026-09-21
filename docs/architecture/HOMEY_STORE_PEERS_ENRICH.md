# Homey Store peers + OSS enrich (P2657)

**Doctrine:** P2520 complementary — catalog, credit, thank, absorb **ideas** into Universal / Stable. Never wholesale copy. Never invent Zigbee `productId`. Never forum-POST (T157628). **Skip Bastien** unless a change is exclusive to Bastien house devices.

Machine SSOT: [`config/architecture/homey-store-peers-ssot.json`](../../config/architecture/homey-store-peers-ssot.json)  
Credits: [`docs/CREDITS.md`](../CREDITS.md)  
Probe: `npm run probe:homey-peers` → `reports/homey-store-peers-*/`  
Pain map: `reports/homey-store-peers-2026-09-21/PAIN_MAP.md`  
Gate: `npm run check:p2657`

## Dual-app

| Area | Tag |
|------|-----|
| Catalog / CREDITS / peer probe / WiFi LAN notes | **MASTER_ONLY** |
| Sacred-couple reliability from Johan/Lidl/Z2M | **BOTH** (backport surgical) |
| Bastien | **SKIP** for this patch family |

## Homey Store peers (Athom probe 2026-09-21)

| App ID | Name | Live | Test | GitHub | Forum |
|--------|------|------|------|--------|-------|
| `com.tuya.zigbee` | Tuya Zigbee | 0.2.76 | — | [JohanBendz/com.tuya.zigbee](https://github.com/JohanBendz/com.tuya.zigbee) | [T26439](https://community.homey.app/t/26439) |
| `com.lidl` | Lidl Smart Home | 0.2.5 | — | [JohanBendz/com.lidl](https://github.com/JohanBendz/com.lidl) | T26439 |
| `com.tuyalocal` | Tuya Local | 1.0.232 | **1.0.237** | [andiwirz/com.tuyalocal](https://github.com/andiwirz/com.tuyalocal) | [T154077](https://community.homey.app/t/154077) |
| `com.tuya.cloud` | Tuya cloud | 1.1.23 | **1.1.26** | [jurgenheine/com.tuya.cloud](https://github.com/jurgenheine/com.tuya.cloud) | [T21313](https://community.homey.app/t/21313) |
| `com.tuya2` | Tuya (Drenso) | 1.5.8 | — | [Drenso/com.tuya2](https://github.com/Drenso/com.tuya2) | [T146735](https://community.homey.app/t/146735) |
| `com.tuya` | Tuya official | 1.4.2 | — | athombv/com.tuya | — (PRIVATE) |
| `nl.rebtor.tuya` | Tuya (rebtor) | 3.1.1 | — | — | [T15811](https://community.homey.app/t/15811) (PRIVATE) |
| `com.heszi.ledvance-wifi` | SMART+ Wifi | 1.1.1 | — | [heszegi/…](https://github.com/heszegi/com.heszi.ledvance-wifi) | — |
| `nl.qluster-it.DeviceCapabilities` | Device Capabilities | 2.17.3 | — | — | — |

Our tips (same probe): Universal Test **9.0.1158** · Stable Test **5.12.294**.

Also seen in store searches (OEM / adjacent Zigbee): Arteco, Hejhome, Meian, idinio, OWON, Enertek, Vevor WS, frient, Develco, HT Cloud/Bridge — observe; absorb only verified `(mfr,pid)`.

## External OSS (non-Homey)

Zigbee2MQTT + herdsman-converters · ZHA device-handlers · HA tuya / tuya-local · TinyTuya · TuyAPI · Blakadder — see P2656 `OSS_LAN_TUYA_ENRICH.md`.

## Thanks (public wording)

Changelogs / forum: generic (“improved”, “added support”).  
Full names + repos: `docs/CREDITS.md` + `lib/data/SourceCredits.js` + this SSOT.

## Contre quoi

- Dropping CREDITS / peer SSOT
- Auto-posting on T26439 / T154077 / T146735 / T21313
- Inventing pids from peer driver lists
- Shipping Bastien tip for catalog-only work
