# Source enrich — Zigbee/Tuya evolution (P2537)

**Mode:** SHADOW · **Dual-app:** BOTH · **Date:** 2026-09-16

## Articles / specs read (silent)

| Source | Topic |
|--------|--------|
| CSA 2025-11-18 | Zigbee 4.0 + Suzi announce |
| CSA 2026-05-20 | Zigbee 4.0 webinar (Pro R23.2, BDB 3.1, ZCL 8) |
| CSA 2026-09-02 | Suzi product certification open |
| CSA FR Suzi page | Sub-GHz mesh branding |
| PR Newswire 2023-04 | Zigbee PRO 2023 (Direct, DLK, sub-GHz groundwork) |
| Spilma CSA guide | Lineage 2004→4.0 + Green Power / Direct |
| Journal du Net | Zigbee basics (mesh, 2.4 GHz, vs Z-Wave) |
| Tuya MCU UART docs | 0x55AA, DP types, mains/low-power/scene modules, three-tier |
| Tuya Zigbee generic | Cluster 0xEF00 DP frame |
| Matterhome / IoT M2M | Suzi ≠ Matter; cert ≠ retail SKUs yet |

## Shipped

- `config/architecture/zigbee-tuya-evolution-ssot.json`
- `docs/architecture/ZIGBEE_TUYA_EVOLUTION_SSOT.md`
- `lib/utils/zigbee-tuya-evolution.js`
- RF + TIME_SYNC pointers
- `test/critical/p2537-zigbee-tuya-evolution.test.js` · `npm run check:p2537`

## Non-goals

- No invent pid / GreenPower_2 couples
- No forum POST
- No Homey compose Suzi clusters without hardware interview
