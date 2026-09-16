# RF Channel Coexistence (Zigbee / Thread / Wi-Fi 2.4 GHz)

Internal engineering guide for pairing stability and “device unavailable” RF false positives.
Silent enrichment from community RF education threads — implement in app/docs, do not paste AI walls onto the forum.

## Critical misconception

**Zigbee/Thread channel numbers are not Wi-Fi channel numbers.**

Both live in 2.4 GHz, but numbering differs:

| Tech | Channel example | Approx centre |
|------|-----------------|---------------|
| Zigbee/Thread | 15 | 2425 MHz (~2 MHz wide) |
| Wi-Fi 20 MHz | 1 | 2412 MHz (≈2402–2422) |
| Wi-Fi 20 MHz | 11 | 2462 MHz (≈2452–2472) |

Choosing Wi-Fi “1” because the number looks farther from Zigbee “15” is usually **wrong** — Zigbee 15 sits near the top edge of Wi-Fi 1 and is much farther from Wi-Fi 11.

## Practical Homey guidance

1. Prefer **Wi-Fi 20 MHz** on 2.4 GHz when Zigbee/Thread share the house (40 MHz widens overlap via primary+secondary).
2. Common Wi-Fi primaries **1 / 6 / 11** → prefer Zigbee/Thread **15 / 20 / 25**.
3. **Do not change** Homey Zigbee/Thread channel unless you understand the cost. Changing can drop devices.
4. After a Zigbee channel change: try device **Maintenance → Repair** first (keeps flows). Full remove/re-pair is last resort; if you must, note Homey device IDs and use a flow converter.
5. **RSSI alone ≠ quality.** Asymmetric links, noise, retries, and airtime matter more than a single dBm reading.
6. Place Homey away from APs/routers; build a Zigbee mesh with mains routers.

## Code helper

```js
const rf = require('../lib/utils/rf-channel-coexistence');
rf.recommendZigbeeChannels([1, 6, 11], 20);
rf.scoreWifiZigbeePair(1, 15, 20);
rf.formatCoexistenceTips();
rf.protocolSelectionBrief();

const evo = require('../lib/utils/zigbee-tuya-evolution');
evo.zigbeeTuyaEvolutionBrief();
```

Smoke: `node tools/ci/rf-channel-coexistence-smoke.js` · gate `npm run check:p2537`

## Protocol roles (brief)

Homey users often mix Zigbee / Wi-Fi / Bluetooth / Z-Wave / Thread advice. Engineering facts only (silent enrich):

| Protocol | Typical EU band | Mesh | Homey takeaway |
|----------|-----------------|------|----------------|
| Zigbee | 2.4 GHz | Yes | Local low-power mesh; ~10–20 m hop, routers extend; **this app** (Tuya ZCL/EF00) |
| Thread | 2.4 GHz (802.15.4) | Yes | Same channel-numbering family as Zigbee — Wi-Fi plan still matters; Matter transport |
| Wi-Fi | 2.4 / 5 GHz | No* | Powered / bandwidth OK; avoid battery Wi-Fi; congests airtime with Zigbee |
| Bluetooth | 2.4 GHz | No* | Short range / proxies; not a house-wide Zigbee substitute |
| Z-Wave | 868 MHz (EU) | Yes | Sub-GHz → less Wi-Fi clash; different SKUs; not this app’s radio |

\*Some “mesh” Wi-Fi/BT products exist; they are not Zigbee mesh routers.

Also: Matter is an **interoperability layer** (often over Thread or Wi-Fi), not a radio by itself. CSA (ex Zigbee Alliance) certifies Zigbee SKUs.

**Recent Zigbee evolution (silent enrich P2537):** Zigbee PRO 2023 → **Zigbee 4.0** (announced 2025-11; Pro R23.2 / BDB 3.1 / ZCL 8) adds stronger security, Zigbee Direct (BLE), batch commissioning, and **Suzi** sub-GHz mesh (EU ~800 MHz / NA ~900 MHz; cert open 2026-09). Suzi **extends** 2.4 GHz Zigbee — it does **not** replace Homey’s classic channel plan Contre quoi lock. Green Power (kinetic / energy-harvest) is a separate profile (proxy required), not Tuya EF00 couple invent.

Full SSOT: `docs/architecture/ZIGBEE_TUYA_EVOLUTION_SSOT.md` · `config/architecture/zigbee-tuya-evolution-ssot.json` · `zigbeeTuyaEvolutionBrief()`.

## App touchpoints

- Troubleshooting: `docs/ZIGBEE_TROUBLESHOOTING_GUIDE.md` §1.2
- Silent forum scan includes topic `157859` (READ-ONLY)
- Doctrine: never auto-post RF essays to Homey Community (T157628)
- Harvest: `reports/source-enrich-2026-09-16/` (protocol education — no forum POST)
- Evolution SSOT: `docs/architecture/ZIGBEE_TUYA_EVOLUTION_SSOT.md` (P2537)
