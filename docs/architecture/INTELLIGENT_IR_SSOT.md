# Intelligent IR SSOT (P2487)

MASTER_ONLY UX layer for Tuya **Zigbee** + **WiFi** IR blasters. Inspired by Ultimate Infrared Toolkit UX (learn+confirm, manual paste, named remotes, flows) — routed through our hardware, not Homey Sphere `manager.infrared`.

## Machine SSOT

See [`config/architecture/intelligent-ir-ssot.json`](../../config/architecture/intelligent-ir-ssot.json).

## Runtime

| Piece | Role |
|-------|------|
| `lib/ir/IntelligentIRRouter.js` | `listSenders` / `send` / `learn` / `storeManual` / confirm capture |
| `lib/ir/IRFormatConverter.js` | Pronto / Broadlink / Global Caché / HEX → Zosung; WiFi opaque |
| `lib/ir/IRCodeLibrary.js` | Offline brand DB; uses converter |
| `lib/ir/irWizardSession.js` | Pair/repair Homey session handlers |
| `assets/ir/ir_setup_wizard.html` | Shared wizard (copied to pair/repair views) |

## Drivers

- Zigbee: `ir_blaster`, `blaster_remote` (Zosung `0xE004` / `0xED00`)
- WiFi: `wifi_ir_remote` (local DP201 send / DP202 learn)
- Virtual: `ir_remote` binds via `transport_driver` + `transport_id` (legacy `blaster_id` OK)

## Sacred couples

Lock **mfr+pid** only — e.g. TS1201 → `ir_blaster`. Never invent pid. RF cloner soft: `_TZE284_tdg4ckyh`+`TS0601`.

## Dual-app

- UX / virtual remotes / library polish → **MASTER_ONLY**
- Zosung TX/RX crash fixes → **BOTH** (backport surgically)

## Gate

```bash
npm run check:p2487
```

## Non-goals

Homey built-in IR RX/TX; Global Caché online scrape; full AC long-frame synthesizer; forum POST.
