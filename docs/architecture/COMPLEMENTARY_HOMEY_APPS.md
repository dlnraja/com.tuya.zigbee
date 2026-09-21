# Complementary Homey apps catalog (P2643 → P2657)

**Doctrine:** P2520 complementary enrich — **UNION / append / fallback**. Cite peers; re-implement ideas into our App IDs. Never wholesale copy. Never invent Zigbee `productId`. Never forum-POST AI (T157628).

Machine SSOT: [`config/architecture/complementary-homey-apps-ssot.json`](../../config/architecture/complementary-homey-apps-ssot.json)  
**P2657 peer catalog:** [`HOMEY_STORE_PEERS_ENRICH.md`](./HOMEY_STORE_PEERS_ENRICH.md) · [`homey-store-peers-ssot.json`](../../config/architecture/homey-store-peers-ssot.json)  
**Credits / thanks:** [`docs/CREDITS.md`](../CREDITS.md)  
Tuya Local deep credits: [`TUYALOCAL_COMPLEMENTARY_CREDITS.md`](./TUYALOCAL_COMPLEMENTARY_CREDITS.md)  
OSS LAN: [`OSS_LAN_TUYA_ENRICH.md`](./OSS_LAN_TUYA_ENRICH.md)  
Runtime: `lib/data/SourceCredits.js`  
Probe: `npm run probe:homey-peers`

## Our tracks (own — may mention publicly)

| Track | App ID | Branch | Line | Homey Test (Athom probe) | Store |
|-------|--------|--------|------|--------------------------|-------|
| Universal preview | `com.dlnraja.tuya.zigbee` | `master` | 9.0.x | **9.0.1158** | [Live](https://homey.app/a/com.dlnraja.tuya.zigbee/) · [Test](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) |
| Unified LTS | `com.dlnraja.tuya.zigbee.stable` | `stable-v5` | 5.12.x | **5.12.294** | [Live](https://homey.app/a/com.dlnraja.tuya.zigbee.stable/) · [Test](https://homey.app/a/com.dlnraja.tuya.zigbee.stable/test/) |
| Bastien house | `com.dlnraja.tuya.zigbee.bastien` | `bastien-home` | 1.0.x | skip for P2657 catalog | [Test](https://homey.app/a/com.dlnraja.tuya.zigbee.bastien/test/) |

GitHub (shared repo, different branches): [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee)  
Forum (Universal Test): [T140352](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352)

## Homey peer apps (credit + complementary use)

| App | Author | Live | Test | GitHub | Homey Store | Forum |
|-----|--------|------|------|--------|-------------|-------|
| **Tuya Local** `com.tuyalocal` | Andi Wirz | **1.0.232** | **1.0.237** | [andiwirz/com.tuyalocal](https://github.com/andiwirz/com.tuyalocal) | [Live](https://homey.app/a/com.tuyalocal/) · [Test](https://homey.app/a/com.tuyalocal/test/) | [T154077](https://community.homey.app/t/154077) |
| **Tuya Zigbee** `com.tuya.zigbee` | Johan Bendz / Bortbytt | **0.2.76** | — | [JohanBendz/com.tuya.zigbee](https://github.com/JohanBendz/com.tuya.zigbee) (`SDK3`) | [Live](https://homey.app/a/com.tuya.zigbee/) | [T26439](https://community.homey.app/t/26439) |
| **Lidl Smart Home** `com.lidl` | Johan Bendz | **0.2.5** | — | [JohanBendz/com.lidl](https://github.com/JohanBendz/com.lidl) | [Live](https://homey.app/a/com.lidl/) | T26439 |
| **Tuya** `com.tuya2` | Drenso | **1.5.8** | — | [Drenso/com.tuya2](https://github.com/Drenso/com.tuya2) | [Live](https://homey.app/a/com.tuya2/) | [T146735](https://community.homey.app/t/146735) |
| **Tuya cloud** `com.tuya.cloud` | Jurgen Heine | **1.1.23** | **1.1.26** | [jurgenheine/…](https://github.com/jurgenheine/com.tuya.cloud) | [Live](https://homey.app/a/com.tuya.cloud/) · [Test](https://homey.app/a/com.tuya.cloud/test/) | [T21313](https://community.homey.app/t/21313) |
| **Tuya (rebtor)** `nl.rebtor.tuya` | Rens Brandwijk | **3.1.1** | — | — | private | [T15811](https://community.homey.app/t/15811) |
| **SMART+ Wifi** | Andras Heszegi | **1.1.1** | — | [heszegi/…](https://github.com/heszegi/com.heszi.ledvance-wifi) | [Live](https://homey.app/a/com.heszi.ledvance-wifi/) | — |
| **Device Capabilities** | Arie J. Godschalk | **2.17.3** | — | — | [Live](https://homey.app/a/nl.qluster-it.DeviceCapabilities/) | — |
| **Tuya (official)** `com.tuya` | Tuya Inc. | **1.4.2** | — | athombv/com.tuya | private / reference only | — |

### What we take from whom (intelligent)

| Peer | Complementary ideas | Our landing | Dual-app |
|------|---------------------|-------------|----------|
| **Tuya Local** | LAN protocol, DP maps, EV JSON/history, Fix-It, Cloud Lookup | `lib/tuya-local/*`, `wifi_*`, `WifiFixIt` | WiFi MASTER_ONLY |
| **Johan Tuya Zigbee / Lidl** | FP/issues, Silvercrest couples, SDK3 | sacred couples, drivers | BOTH reliability |
| **rebtor** | Single TCP session | WifiFixIt note (P2657) | MASTER_ONLY |
| **Drenso / Heine cloud** | Contrast only — we stay local-first | docs + CREDITS | MASTER_ONLY observe |
| **Z2M / ZHA / HA / TinyTuya** | Couples, quirks, LAN protocol | converters / bridge / discovery | see P2656 |

Full pain → landing map: `reports/homey-store-peers-2026-09-21/PAIN_MAP.md`
