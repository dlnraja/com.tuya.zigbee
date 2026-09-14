# Intelligent IR SSOT (P2487)

MASTER_ONLY UX layer for Tuya **Zigbee** + **WiFi** IR blasters **and Homey Pro 2023 onboard IR TX**. Inspired by Ultimate Infrared Toolkit UX (learn+confirm, manual paste, named remotes, flows) — hardware paths: Zosung / Tuya WiFi / `homey.rf` ProntoHex.

**Tip:** Homey Test ≥**9.0.922** (healthy tip **9.0.926** #3186). Family gate: `npm run check:p248x` (includes P2487 + P2488 + P2490). Zosung TX/RX reliability-only changes may classify **BOTH**.

## Machine SSOT

See [`config/architecture/intelligent-ir-ssot.json`](../../config/architecture/intelligent-ir-ssot.json).

## Runtime

| Piece | Role |
|-------|------|
| `lib/ir/IntelligentIRRouter.js` | `listSenders` / `send` / `learn` / `storeManual` / confirm capture |
| `lib/ir/IRFormatConverter.js` | Pronto / Broadlink / Global Caché / HEX ↔ Zosung; Pronto for Homey TX |
| `lib/ir/HomeyInfraredTx.js` | Soft Homey Pro 2023 ProntoHex TX (`homey:wireless:ir`) |
| `lib/ir/IRCodeLibrary.js` | Offline brand DB; uses converter |
| `lib/ir/irWizardSession.js` | Pair/repair Homey session handlers |
| `assets/ir/ir_setup_wizard.html` | Shared wizard (copied to pair/repair views) |

## Drivers / transports

- Zigbee: `ir_blaster`, `blaster_remote` (Zosung `0xE004` / `0xED00`) — learn + TX
- WiFi: `wifi_ir_remote` (local DP201 send / DP202 learn) — learn + TX
- Homey: synthetic sender `homey_infrared` — **TX-only** ProntoHex (Pro 2023); no invent RX learn
- Virtual: `ir_remote` binds via `transport_driver` + `transport_id` (legacy `blaster_id` OK). Homey path stores learned/paste codes on the virtual device.

## Sacred couples

Lock **mfr+pid** only — e.g. TS1201 → `ir_blaster`. Never invent pid. RF cloner soft: `_TZE284_tdg4ckyh`+`TS0601`.

## Dual-app

- UX / virtual remotes / Homey IR path / library polish → **MASTER_ONLY**
- Zosung TX/RX crash fixes → **BOTH** (backport surgically)

## Gate

```bash
npm run check:p2487
```

## Non-goals

Homey onboard **RX/learn**; Global Caché online scrape; full AC long-frame synthesizer; forum POST.
