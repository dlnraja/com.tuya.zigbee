# TREAT P2682 — mesh saturation from Bastien diag logs (2026-09-22)

Silent only. Dual-app **BOTH**.

## Verdict from stdout

| Signal | Evidence | Meaning |
|--------|----------|---------|
| Local burst | `3555a6a8` `interval=90ms count=241` + `Unhandled frame #800` cluster `0x0006` | One switch chatty (retransmit / minInterval 0) — **not** whole-mesh meltdown |
| Fleet baseline | 8× `switch_1gang` `interval≈285–326s` count 6–8 | Normal ~5 min reporting — mesh OK |
| Ghost flows | `null → false PHYSICAL` × many devices (`8f0915fa`) | App bug (P2681) — looked like random Flows |
| Sleepy TX waste | `Group join failed… Est-il allumé?` on `button_wireless_2` | Sleepy remote cannot join group 0 — retries burn airtime |
| Profile | `undefined device profile` | P2681 mixin shadow (fixed) |

**Conclusion:** network a bit loaded locally (1 chatty gang + group-join spam), not a dead mesh. Sticky button lag = tip-lag + profile + airtime contention.

## Code (P2682)

1. onOff report floor `minInterval: 1` — MeshFloodCalm / TuyaZigbeeDevice / UnifiedSwitchBase
2. Skip group join on sleepy remotes (`button_wireless_*`, battery)
3. Gate: `npm run check:p2682`

## User

Update tip ≥ **9.0.1184** / Bastien **1.0.60** / Stable **5.12.302** + reboot. Optional: Zigbee channel 15/20/25 if Wi‑Fi on 1/6/11.
