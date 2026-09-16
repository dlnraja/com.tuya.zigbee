# Source enrich — protocol education (2026-09-16)

**Mode:** SHADOW / silent only — no forum POST (T157628).  
**Classify:** BOTH (RF helper + troubleshooting doctrine).  
**Patch:** P2536.

## Sources (read-only)

1. Journal du Net — Zigbee dictionary (2023-04-13)  
   https://www.journaldunet.com/web-tech/dictionnaire-de-l-iot/1440710-zigbee-quel-est-ce-protocole-pour-les-produits-domotiques/
2. r/homeassistant — pros/cons Zigbee / BT / Wi-Fi / Z-Wave / Matter+Thread  
   https://www.reddit.com/r/homeassistant/comments/181kqr0/pros_and_cons_for_different_protocols_zigbee_bt/  
   (duplicate URL ignored; fetched via old.reddit + smart-fetch)

## Locked engineering facts (no invent pid)

| Fact | Use in Homey app |
|------|------------------|
| Zigbee = low-power mesh; indoor hop ~10–20 m; routers extend | Mesh advice already in RF guide; reinforce mains routers |
| EU Zigbee typically **2.4 GHz**; EU Z-Wave typically **868 MHz** | Different interference problem space |
| Zigbee ~250 kbps vs Z-Wave ~100 kbps (classic figures) | Throughput ≠ reason to pick Wi-Fi for sensors |
| Wi-Fi / BT share 2.4 GHz → coexistence plan | Prefer Zigbee/Thread **15/20/25** vs Wi-Fi **1/6/11** @ 20 MHz |
| Battery Wi-Fi = anti-pattern | Protocol brief `wifi.bestFor` |
| Matter = interoperability layer; Thread = 802.15.4 mesh transport | Not a radio swap for Tuya EF00 drivers |
| CSA / Zigbee PRO 2023 (security, optional sub-GHz) | Awareness only — Homey default Contre quoi stays 2.4 GHz channel plan |

## Reddit consensus (extract)

Local scrape hit Reddit login wall → see `reddit-181kqr0-extract.txt` (public-thread consensus). High-signal points mirrored without attribution in user-facing docs:

- Zigbee: widest cheap catalog; diagnose mesh/channel more often; Wi-Fi overlap is real.
- Z-Wave: pricier / fewer SKUs; often “set and forget”; better wall penetration (sub-GHz).
- Wi-Fi: easy buy-in; avoid for battery; prefer local-first if used.
- BT: short range / proxies — not a house mesh.
- Matter+Thread: forward-looking; multi border-router resilience; catalog still thinner.

## Code / docs shipped

- `lib/utils/rf-channel-coexistence.js` → `protocolSelectionBrief()`
- `docs/guides/RF_CHANNEL_COEXISTENCE.md` → Protocol roles table
- `tools/ci/rf-channel-coexistence-smoke.js` → brief asserts
- `test/critical/p2536-protocol-selection-brief.test.js` + `npm run check:p2536`

## Non-goals

- No forum reply / PM
- No fingerprint invent
- No Matter bridge feature work in this patch
