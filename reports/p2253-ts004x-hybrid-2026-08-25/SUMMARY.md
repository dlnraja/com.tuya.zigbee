# P2253 — TS0043 / TS0044 hybrid scene remotes

**Date:** 2026-08-25  
**Track:** MASTER_ONLY soak first (runtime + docs); backport reliability bits to stable later if soak clean.  
**Classify:** BOTH for wake/`writeSceneAttr` / magic (reliability); docs MASTER-first.

## Verdict

TS0043/TS0044 must stay **hybrid endpoint remotes**: parallel RX (native ZCL + Tuya 0xFD + E000 + optional EF00 listen + raw) and **no genOnOff 0x8004 TX**. Scene multi-press is the default UI mode. Blue LED is pairing/network only — not Homey-controllable.

## Why 5.x felt better

Users on 5.x hit fewer wake-time **0x8004** writes on sleepy remotes that never implemented attr 32772. Master over-applied TS004F scene recovery → press death (meter91 / P2235) → fixed by family gates; P2253 hardens profiles + compensation + UI/docs so the regression cannot return via docs or quirk init.

## Changes

| Area | Change |
|------|--------|
| `PhysicalButtonMixin` | `skip8004` / `writeSceneAttr:false` / `sceneSwitch` on zgyzgdua, wkai4ga5, a7ouggvs, key8kk7r, bczr4e10, qzjcsmar, xkwjqeqd, ur5fpg7p, gbm10jnj |
| `DeviceOperatingMode` | Sacred mfr lock includes zgyzgdua / wkai4ga5 / a7ouggvs / key8kk7r / bczr4e10 |
| `HomeyCompensationLayer` | TS0041–4 → magic only; never `ts004f_scene_mode` |
| `scene_switch_4` compose | `button_mode` default **scene** + LED/0x8004 hint; `reverse_button_order` |
| `scene_switch_4/device.js` | Hybrid stack log |
| Docs | `TS004X_BATTERY_REMOTES.md` P2253; `BIDIRECTIONAL_BUTTONS.md` TS004F ≠ TS0044 |
| Gate | `test/critical/p2253-ts004x-hybrid-scene.test.js` (12/12 with P2249) |

## Blue LED

No attr/DP to drive. Pairing flash / leave-network blink only. Documented in compose hint + knowledge doc.

## User action

Update Test after publish → re-pair remotes still on wrong 1/2-gang drivers. Use **Reverse button order** if physical mapping is inverted.

## Do not

- Invent Peter couples
- Force EF00 TX on pure ZCL remotes
- Spam Stable republish (P139)
