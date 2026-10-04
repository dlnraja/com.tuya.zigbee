# PC harvest round 3: couple checks

| Couple | Verdict | Evidence |
|---|---|---|
| `_TZ3000_ptjcjise` / TS0001 | not added (R11: never invent a couple) | dlnraja/com.tuya.zigbee#543: the TS0001 mention (2026-09-10) has no fingerprint; the reporter's own fingerprint and his next comment (2026-09-11) say TS0002. External sources only list TS0002 ([eWeLink forum](https://forum.ewelink.cc/t/problem-with-tuya-switch-2-gang/27524), [Mariano Edge fingerprints](https://github.com/Mariano-Github/Edge-Drivers-Beta/blob/main/zigbee-multi-switch-v4.5-childs-edge/zigbee-driver/fingerprints.yml)). TS0002 stays on wall_switch_2gang_1way. Add TS0001 only from a diagnostic/interview that shows modelId TS0001. |
| `_TZ3000_kfu8zapd` / TS0225 in button_wireless_4 | no change (W4: phantom couple, no real collision) | `_TZ3000_kfu8zapd` is only in button_wireless_4 (TS0044 remote). None of the 35 button_wireless_4 manufacturerNames is in any other driver that lists TS0225, so no radar can be routed there. Revisit only on a user report or a real collision. |
