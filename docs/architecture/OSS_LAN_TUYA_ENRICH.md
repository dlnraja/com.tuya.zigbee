# OSS LAN WiFi / Zigbee-hub Tuya enrich (P2656)

**Doctrine:** P2520 complementary — **UNION / append / fallback**. Re-implement ideas into our App IDs. Never wholesale copy. Never invent Zigbee `productId`. Never forum-POST (T157628).

Machine SSOT: [`config/architecture/oss-lan-tuya-enrich-ssot.json`](../../config/architecture/oss-lan-tuya-enrich-ssot.json)  
Catalog: [`COMPLEMENTARY_HOMEY_APPS.md`](./COMPLEMENTARY_HOMEY_APPS.md) · tuyalocal: [`TUYALOCAL_COMPLEMENTARY_CREDITS.md`](./TUYALOCAL_COMPLEMENTARY_CREDITS.md)  
Report: `reports/oss-lan-tuya-2026-09-21/GAP_MAP.md`  
Gate: `npm run check:p2656`

## Dual-app

| Area | Tag |
|------|-----|
| WiFi LAN client / Fix It / discovery | **MASTER_ONLY** |
| `TuyaZigbeeBridge` cid / hub heuristics (reliability) | **MASTER_ONLY** (WiFi hub path; Homey Zigbee stays BOTH separately) |
| Catalog / SourceCredits | **MASTER_ONLY** |

## Control path doctrine (three lanes)

| Path | When | Needs local_key? |
|------|------|------------------|
| **Homey Zigbee** (primary) | Tuya Zigbee end-device | **No** — Z2M/ZHA pattern |
| **WiFi LAN** | Tuya WiFi plug/light/… | **Yes** — tuyapi TCP 6668 |
| **Hub cid fallback** | Zigbee still on a Tuya WiFi hub | Hub key + child `node_id`/`cid` (~1–3 LAN sessions) |

Prefer **Homey Zigbee coordinator** for Tuya Zigbee end-devices. Tuya WiFi hubs are a fallback path only.

## Sources investigated (2026-09-21)

| Project | Role | What we absorbed (ideas) |
|---------|------|---------------------------|
| [jasonacox/tinytuya](https://github.com/jasonacox/tinytuya) | Python LAN | UDP 6666/6667/**7000**, protocols 3.1–3.5, key normalize, LAN_EXT_STREAM note |
| [codetheweb/tuyapi](https://github.com/codetheweb/tuyapi) | Node LAN | Runtime TCP; **gwID** + **cid** hub pattern |
| [TuyaAPI/cli](https://github.com/TuyaAPI/cli) | CLI | `tuya-cli wizard` key export |
| [make-all/tuya-local](https://github.com/make-all/tuya-local) | HA | Hub `node_id` + hub key; **1–3** concurrent LAN sessions |
| [xZetsubou/hass-localtuya](https://github.com/xZetsubou/hass-localtuya) | HA fork | Sub-devices behind gateway; 3.5; cloud for keys only |
| [rospogrigio/localtuya](https://github.com/rospogrigio/localtuya) | HA legacy | Observe DP UX; PR#318 hub gwID+cid |
| [lehanspb/tuya-mqtt](https://github.com/lehanspb/tuya-mqtt) | Node MQTT | Gateway/sub-device **cid** addressing |
| [py60800/tuyadump](https://github.com/py60800/tuyadump) | Sniffer | Proof that **cid ≠ cloud deviceId** |
| [Binozo/GoTuya](https://github.com/Binozo/GoTuya) | Go LAN | Observe IP+id+key triad (no Go in bundle) |
| [Koenkk/zigbee2mqtt](https://github.com/Koenkk/zigbee2mqtt) | Zigbee | End-devices on local coordinator — no local_key |
| [vineetchoudhary/tuya-local-key](https://github.com/vineetchoudhary/tuya-local-key) | Key export | QR Smart Life without IoT developer account |
| [tuya/tuya-device-sharing-sdk](https://github.com/tuya/tuya-device-sharing-sdk) | Official | Sharing API for credentials |
| [andiwirz/com.tuyalocal](https://github.com/andiwirz/com.tuyalocal) | Homey peer | Already P2619–P2647 |

## Our landings

| Idea | File |
|------|------|
| Protocol order / UDP keys | `lib/tuya-local/UdpDiscoveryKeys.js` |
| Hub cid + categories + soft session warn + gwID | `lib/tuya-local/TuyaZigbeeBridge.js` |
| Path doctrine | `CONTROL_PATH_DOCTRINE` on bridge |
| Fix It LAN notes | `lib/wifi/WifiFixIt.js` |
| QR / IoT keys | `lib/tuya-local/TuyaSmartLifeAuth.js` (existing) |
| Credits | `lib/data/SourceCredits.js` |

## Contre quoi

- Do not shrink `GATEWAY_CATEGORIES`
- Do not prefer cloud `id` over `node_id` for hub children
- Do not omit `gwID` on hub TuyAPI connect
- Do not invent Zigbee `productId` from WiFi category codes
- Do not remove UDP 7000 / hub / no-key Zigbee notes from Fix It
- Do not force Tuya hub over Homey Zigbee coordinator
