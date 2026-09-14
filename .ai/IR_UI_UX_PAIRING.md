# Universal IR UI/UX & Pairing Guide

**Status (P2487 / 2026-09-14): IMPLEMENTED** — do not re-invent. Canonical docs:

- [`docs/architecture/INTELLIGENT_IR_SSOT.md`](../docs/architecture/INTELLIGENT_IR_SSOT.md)
- [`config/architecture/intelligent-ir-ssot.json`](../config/architecture/intelligent-ir-ssot.json)
- Gate: `npm run check:p2487`

## What shipped

| Spec idea (this file) | Runtime |
|----------------------|---------|
| Brand / category / Test Power loop | `assets/ir/ir_setup_wizard.html` (+ copies under `ir_remote` / `wifi_ir_remote` / `ir_blaster` repair) |
| Session handlers | `lib/ir/irWizardSession.js` |
| Pronto / Broadlink / GC / HEX → Zosung | `lib/ir/IRFormatConverter.js` + `IRCodeLibrary.js` |
| Multi-sender virtual remote | `drivers/ir_remote` (`transport_driver` + `transport_id`) |
| WiFi learn/send flows | `drivers/wifi_ir_remote/driver.flow.compose.json` |
| Homey Pro 2023 Pronto TX (P2487c) | `lib/ir/HomeyInfraredTx.js` — TX-only |

## Transports

1. Zigbee Zosung — `ir_blaster` / `blaster_remote`
2. WiFi Tuya local — `wifi_ir_remote` DP201/202
3. Homey onboard IR — `homey_infrared` ProntoHex TX (Pro 2023); learn via Zigbee/WiFi or Pronto paste

## Non-goals (still)

Homey Sphere IR RX/learn; Global Caché online scrape; full AC long-frame synthesizer; forum POST.
