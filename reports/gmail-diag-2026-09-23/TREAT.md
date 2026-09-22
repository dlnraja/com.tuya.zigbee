# TREAT — L99 new Homey diags (2026-09-22 → 2026-09-23)

Silent only. Never forum POST (T157628).

Generated: 2026-09-23 · Dual-app: **BOTH** (+ Bastien tip)

## Harvest (Gmail MCP senetmarne)

| Log ID | App @ tip | Couple / signal | Verdict |
|--------|-----------|-----------------|---------|
| **885a9901** | Bastien **1.0.60** | `_TZ3000_dzwgk7e2`+**TS0042** — latency + ghost | **P2686** root: invent HOLD-RELEASE mid single + battery TX tip-lag |
| **9a2f232b** | Universal **9.0.1182** | `_TZE200_p3dbf6qs`+**TS0601** Unknown TRV | **P2686** sacred-keep pin + compose union (Z2M TRV06_1b/ME167) |
| **f37e8a91** | Bastien 1.0.53 | thank-you + CPU + dzwgk7e2 | Tip-lag P2683/85; profile undefined on early re-arm |
| **8f0915fa** | Bastien 1.0.53 | TS0042 slow / TS0043 dead | Tip-lag P2683 |
| **cb3c0c87** | Bastien 1.0.51 | `homey-zigbeedriver` MODULE_NOT_FOUND | Already fixed ≥1.0.56 |
| **149bc1a5** | Universal 9.0.1165 | OOM JsonParse boot | Already treated (heap / Buffer JSON) — tip ≥9.0.1192 |
| **be119f76** | Bastien 1.0.34 | « channel » UX | Scene remotes ≠ Zigbee channels; Flow cards |
| **52ef684a** | Bastien 1.0.34 | no buttons | Tip-lag + wrong pairing class |

## Code (P2686)

1. **HOLD-RELEASE ghost** — TS004x `sceneSwitch` / `skipBatteryReporting` remotes use discrete 0xFD long; never invent soft release. Cancel all pending invent timers on any new press.
2. **`dzwgk7e2` / `vsxvaj9i`** — add `skipBatteryReporting` + `skipSoftwareHoldRelease`.
3. **TRV `_TZE200_p3dbf6qs`+TS0601** — sacred-keep → `radiator_valve`; union TZE200/204 into `device_radiator_valve` (P2520 complementary).

## Contre quoi

- `test/critical/p2686-diag-l99-hold-release-trv.test.js`
- `npm run check:p2686` / `check:p268x`

## User action (no forum reply)

- Bastien: update Test ≥ tip with P2686, re-pair remotes if still ghost/slow.
- Universal: update Test, remove Unknown TRV, add as **Radiator valve** (`_TZE200_p3dbf6qs`+TS0601).
