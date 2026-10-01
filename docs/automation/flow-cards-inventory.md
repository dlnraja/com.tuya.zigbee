# Flow card inventory (P2775 / P2776)

Read-only inventory of the flow cards of other Homey apps, taken from their public `app.json`
(no code copied). Used to decide which generic cards to offer in this app. Read on 2026-10-01.

| App | Cards | Distinct (numbers folded) | Notable patterns |
|---|---|---|---|
| JohanBendz/com.tuya.zigbee | 37 | 18 | button action per gang, siren on for X s, siren volume/tune, window open condition, reset energy meter |
| Drenso/com.tuya2 | 149 | 104 | channel N on/off/dim triggers + "channel N is on" condition + "turn channel N on/off" actions; set child lock; night mode; device online/offline; raw status triggers / typed command actions |
| shaarkys/com.xiaomi-miio | 184 | 142 | "no motion detected in N minutes"; "value is between"; click / double / long / release gestures; mode changed; consumable alerts |
| chaosfish/com.xiaomi-mi-zigbee | 1 | 1 | retrieve device information |

Sources:
- https://github.com/JohanBendz/com.tuya.zigbee/blob/master/app.json
- https://github.com/Drenso/com.tuya2/blob/master/app.json
- https://github.com/shaarkys/com.xiaomi-miio/blob/master/app.json
- https://github.com/chaosfish/com.xiaomi-mi-zigbee/blob/master/app.json

## Gap analysis → what we added (app-level, one card for all drivers)

| Idea | Status in this app | Added |
|---|---|---|
| Per-gang triggers / condition / action | per-driver cards only (not all drivers) | `gang_switched` (trigger), `gang_is_on` (condition), `gang_set` (action: on/off/toggle, gang 1–8) |
| Value crossed a threshold | only for raw Tuya DPs (`tuya_dp_threshold_crossed`) | `capability_crossed_threshold` (any numeric capability, above/below, edge-triggered) |
| Value is between | absent | `capability_is_between` |
| No motion for N minutes | absent | `motion_absent_for` (1–1440 min, cancelled by new motion) |
| Child lock trigger / condition / action | per-driver actions on ~30 drivers | `child_lock_changed`, `child_lock_is_on`, `child_lock_set` (capability or setting) |
| Backlight | settings only | `backlight_set` (on/off/normal/inverted, mapped to the device's backlight setting) |
| Set a device setting | added in P2773 | `device_set_setting` |
| Battery low, multi-press, offline/online, health | already present (`tuya_battery_low_true`, `battery_percent_below`, `button_multi_press`, `device_became_unavailable`, `device_back_online`, `health_below_threshold`) | — |
| Raw status / typed command | already present (`tuya_dp_received`, `tuya_dp_send_typed`) | — |

## Quality pass (P2776)
- Missing `titleFormatted` added for every card with arguments (93 cards; 0 left).
- Missing fr/nl/de titles filled from a reviewed template dictionary (129 driver title templates + every app-level card).
- Number arguments without a range got explicit `min`/`max` (10 arguments).
- Generic triggers only call `trigger()` when a Flow actually uses the card for that device (argument cache), so busy meters do not cost anything.
