# Diag harvest + Homey Test — 2026-08-23 (P2230)

## Gmail cascade (verified)

| Layer | Role | Status |
|-------|------|--------|
| **L0** Cursor Gmail plugin | IDE | **OK** — read Homey diags live |
| **L1** IMAP via GitHub secrets | CI primary | **OK** — run `32640495322`: Auth OK, 50 emails, mode `imap` |
| **L2** OAuth secrets | CI fallback | Present (`GMAIL_CLIENT_*` + refresh) |
| **L3** Local state | Offline | Updated from CI sanitized report |

Local machine has **no** Gmail env secrets (expected). Workflows inject `GMAIL_EMAIL` / `GMAIL_APP_PASSWORD` / OAuth — not the Cursor plugin.

## Homey Test dashboard (from Athom emails)

| App | Tip | Note |
|-----|-----|------|
| `com.dlnraja.tuya.zigbee` | Build **#2954** testing (2026-08-22) | Users still on 9.0.626 / 9.0.617 in diags |
| `com.dlnraja.tuya.zigbee.stable` | Builds **#13–#15** | **processing_failed** `socket hang up` (P139 — do not republish loop) |

## Latest Log IDs (plugin)

| UUID | User / symptom | Couple | Fix |
|------|----------------|--------|-----|
| `3a1f196d-…` | Toni Tongou | `_TZE284_6ocnqlhn`+TS0601 on **smart_rcbo** | Pairing steal: `app.json`/`mfs` → `din_rail_meter` (local). DYN-CAP no longer maps DP6 raw → humidity. **Needs publish.** |
| `31e654a4-…` | Tongou (ES) | same | same |
| `55e3e591-…` | meter91 | `zgyzgdua`+TS0044 | Flow ID spam `*_1gang_button_pressed` — heuristics fixed |
| `9cbf9eb6-…` | Nobø SWS-IZ | `xffhmvhv`+TS004F | Flow ID spam `*_button_N_button_pressed` — heuristics fixed |
| `0cea6870-…` | Peter | couple ABSENT | Already shipped IAS/battery path; no invent |

## Code changes this pass

- `lib/flow/FlowCardHeuristics.js` — compose-real button IDs only
- `lib/mixins/PhysicalButtonMixin.js` — scene_switch as button device for candidates
- `lib/dynamic/DynamicCapabilityManager.js` — block raw/byte_array climate; Tongou DP6 guard
- `app.json` + `mfs_db` Tongou (already from P2229) — still clean locally

## User action (silent — no forum reply)

1. Publish master Test with Tongou + flow/DYN-CAP fixes.
2. Toni: update Test + **remove + re-pair** as DIN Rail Energy Meter (not Smart RCBO).
3. meter91 / Nobø: update Test + re-pair if still on ≤9.0.617.
4. Stable: wait Athom cooldown (P139).
