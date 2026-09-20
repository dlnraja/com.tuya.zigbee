# Complementary Homey apps catalog (P2643)

**Doctrine:** P2520 complementary enrich — **UNION / append / fallback**. Cite peers; re-implement ideas into our App IDs. Never wholesale copy. Never invent Zigbee `productId`. Never forum-POST AI (T157628).

Machine SSOT: [`config/architecture/complementary-homey-apps-ssot.json`](../../config/architecture/complementary-homey-apps-ssot.json)  
Tuya Local deep credits: [`TUYALOCAL_COMPLEMENTARY_CREDITS.md`](./TUYALOCAL_COMPLEMENTARY_CREDITS.md)  
Runtime: `lib/data/SourceCredits.js`

## Our tracks (own — may mention publicly)

| Track | App ID | Branch | Line | Homey Test (Athom probe) | Store |
|-------|--------|--------|------|--------------------------|-------|
| Universal preview | `com.dlnraja.tuya.zigbee` | `master` | 9.0.x | **9.0.1117** (#3313) — git tip may lead | [Live](https://homey.app/a/com.dlnraja.tuya.zigbee/) · [Test](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) |
| Unified LTS | `com.dlnraja.tuya.zigbee.stable` | `stable-v5` | 5.12.x | **5.12.281** (#204) | [Live](https://homey.app/a/com.dlnraja.tuya.zigbee.stable/) · [Test](https://homey.app/a/com.dlnraja.tuya.zigbee.stable/test/) |
| Bastien house | `com.dlnraja.tuya.zigbee.bastien` | `bastien-home` | 1.0.x | **1.0.14** (#17) | [Test](https://homey.app/a/com.dlnraja.tuya.zigbee.bastien/test/) |

GitHub (shared repo, different branches): [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee)  
Forum (Universal Test): [T140352](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352)

## Homey peer apps (credit + complementary use)

| App | Author | Live | Test | GitHub | Homey Store |
|-----|--------|------|------|--------|-------------|
| **Tuya Local** `com.tuyalocal` | Andi Wirz | **1.0.232** | **1.0.237** | [andiwirz/com.tuyalocal](https://github.com/andiwirz/com.tuyalocal) | [Live](https://homey.app/a/com.tuyalocal/) · [Test FR](https://homey.app/fr-fr/app/com.tuyalocal/Tuya-Local/test/) |
| **Tuya Zigbee** `com.tuya.zigbee` | Johan Bendz / Bortbytt | **0.2.76** | — | [JohanBendz/com.tuya.zigbee](https://github.com/JohanBendz/com.tuya.zigbee) (`SDK3`) | [Live](https://homey.app/a/com.tuya.zigbee/Tuya-Zigbee/) |
| **Tuya** `com.tuya2` | Drenso | **1.5.8** | — | — | [Live](https://homey.app/a/com.tuya2/) |
| **Tuya cloud** `com.tuya.cloud` | Jurgen Heine | **1.1.23** | **1.1.26** | — | [Live](https://homey.app/a/com.tuya.cloud/) · [Test](https://homey.app/a/com.tuya.cloud/test/) |
| **Device Capabilities** | Arie J. Godschalk | **2.17.3** | — | — | [Live](https://homey.app/a/nl.qluster-it.DeviceCapabilities/) |
| **Tuya (official)** `com.tuya` | Tuya Inc. | **1.4.2** | — | — | private / reference only |

Forum Tuya Local: [T154077](https://community.homey.app/t/app-pro-tuya-local/154077)  
Forum Johan: [T26439](https://community.homey.app/t/tuya-zigbee-app/26439) (READ-ONLY scan)

### What we take from whom (intelligent)

| Peer | Complementary ideas | Our landing | Dual-app |
|------|---------------------|-------------|----------|
| **Tuya Local** | LAN protocol, DP maps, EV JSON/history, Fix-It, fire-and-forget | `lib/tuya-local/*`, `wifi_*` | WiFi MASTER_ONLY · LAN BOTH |
| **Johan Tuya Zigbee** | FP/issues, driver taxonomy, SDK3 | `johan-dump`, sacred couples | BOTH reliability |
| **Drenso / Heine cloud** | Contrast only — we stay local-first | `LocalFirstResolver` | MASTER_ONLY observe |
| **Device Capabilities** | capability_changed UX | `lib/flow` | MASTER_ONLY |

## External (non-Homey) always credited

| Source | Link | Use |
|--------|------|-----|
| make-all/tuya-local (HA) | https://github.com/make-all/tuya-local | EV / category DP YAMLs |
| TinyTuya | https://github.com/jasonacox/tinytuya | LAN retry heuristics |
| Zigbee2MQTT | https://github.com/Koenkk/zigbee2mqtt | couples / DP |
| ZHA quirks | https://github.com/zigpy/zha-device-handlers | clusters |
| Blakadder | https://zigbee.blakadder.com | rebrands |

## Contre quoi

- `npm run check:p2643` — SSOT + SourceCredits + store URLs present
- Never invent pid from WiFi category codes
- Never publish Stable onto Universal Test slot
- Athom tip probe dates in SSOT `_meta.probedAt` — re-run when publishing

## Refresh tip versions

```bash
# Uses local gitignored HOMEY_PAT_APPS — never commit
node -e "/* AthomAppsAPI getApp for ids in complementary-homey-apps-ssot.json */"
```
