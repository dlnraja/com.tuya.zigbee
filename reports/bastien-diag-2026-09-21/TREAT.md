# Bastien diags treat — 2026-09-21 (P2659)

## Latest reports (Gmail)

| Log ID | When (UTC) | App | Symptom |
|--------|------------|-----|---------|
| **4c0d232b** | 2026-09-21 18:18 | bastien **1.0.34** | 3ch buttons dead; app click once then UI/error |
| 4d4e1684 | 2026-09-20 21:25 | 1.0.14 | 3ch dead (prior — P2644/P2645) |
| e8d98608 | 2026-09-20 13:31 | 1.0.7 | wrong device + CI.containsCI (prior — P2644) |

Homey: Pro Early 2023 / v13.5.0 · Bastien LAN `192.168.1.15` still unreachable this session.

## Root causes (4c0d232b)

1. **`sub_capability_changed`** — compose token `value` is **string**; runtime passed **boolean** → Homey `Expected string but got boolean` on every onoff change (UI/app error after one click).
2. **FLOW-GUARD invent** — `switch_1gang_gang1_scene` / `switch_1gang_1gang_gang1_scene` probed though not declared (P2381 driver-prefix fallback).
3. **3ch remote** — still no `button_wireless_3` RX in stdout (recurring NEED_REPAIR: remove + re-pair as Bouton sans fil 3 with wake-taps; couple `_TZ3000_vsxvaj9i`+`TS0043`).

## Fixes shipped (BOTH + Bastien house)

- `lib/flow/UniversalFlowCardLoader.js` — `String(value)` / `String(capability)`
- `lib/mixins/PhysicalButtonMixin.js` — scene cards only if **declared**
- `lib/flow/FlowCardHeuristics.js` — refuse undeclared `*_gangN_scene` probe
- Gate: `npm run check:p2659`
- Tip: master **9.0.1163** · Bastien **1.0.35**

## User actions (Bastien box)

1. Update Zigbee Bastien Test ≥ **1.0.35**
2. Remove 3-channel remote → re-pair **Bouton sans fil 3** near Homey, tap every 2–3s
3. Confirm app onoff no longer errors after first toggle
