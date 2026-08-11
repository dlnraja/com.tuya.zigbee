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
```

Smoke: `node tools/ci/rf-channel-coexistence-smoke.js`

## App touchpoints

- Troubleshooting: `docs/ZIGBEE_TROUBLESHOOTING_GUIDE.md` §1.2
- Silent forum scan includes topic `157859` (READ-ONLY)
- Doctrine: never auto-post RF essays to Homey Community (T157628)
