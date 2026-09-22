# TREAT P2683 — Bastien TS0043 / TS0042 UX (2026-09-22)

Silent only. Dual-app **BOTH**.

## User report (Bastien)

1. **`_TZ3000_vsxvaj9i`+TS0043** — recognized; Developer Tools Zigbee channels/commands do nothing.
2. **TS0042 2-btn** — very slow lamp; sometimes toggles another device alone.

## Root causes

| Issue | Cause |
|-------|--------|
| "Canaux Zigbee morts" | Scene remotes are **not** bindable OnOff — presses = mfr cmd **0xFD** / E000 → Homey Flow **Button pressed**. Tip-lag + missing `vsxvaj9i` DEVICE_PROFILES / hybrid re-arm after late MFR. |
| TS0042 lent | Debounce **1200ms** too high for lamp UX |
| Ghost other device | Phantom EP3/4 bound + ghost `switch_*_physical_*` (P2681) |

## Fix

- Profile `vsxvaj9i` hybrid + skip8004 + buttonCount 3
- dzwgk7e2 debounce **400** / clamp EP / hybrid re-arm
- Learnmode: Flow not Developer Tools channels
- Gate: `npm run check:p2683`

## User actions

1. Update Bastien ≥ **1.0.61** (Universal ≥9.0.1185)
2. Remove + re-pair both remotes under **Wireless Button 2 / 3** (not Homey Zigbee)
3. Flows: **Bouton appuyé** (Button 1/2/3) → lamp — never Zigbee channel bind / never « Allumé »
