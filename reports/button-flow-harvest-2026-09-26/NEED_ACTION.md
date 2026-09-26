# Button Flow Harvest — NEED_ACTION

Generated: 2026-09-26T06:39:02.112Z

## Exempt (not button-flow scope)

- `ir_remote` — IR remote, 0 button triggers expected
- `wifi_ir_remote` — IR remote, 0 button triggers expected

## Known false positives (runtime OK)

CI harvest tries generic patterns first; `FlowCardHeuristics` + `ButtonDevice` resolve Ngang/hashed/socket cards at runtime.

- `button_emergency_sos` (button) — 3 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `button_wireless_1` (button) — 1 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `button_wireless_2` (button) — 2 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `button_wireless_3` (button) — 3 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `button_wireless_4` (button) — 4 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `button_wireless_4_ts0041` (button) — 8 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `button_wireless_6` (button) — 6 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `button_wireless_8` (button) — 8 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `button_wireless_fingerbot` (socket) — 2 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `button_wireless_plug` (socket) — 3 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `button_wireless_scene` (button) — 4 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `button_wireless_switch` (socket) — 6 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `button_wireless_usb` (socket) — 12 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `button_wireless_valve` (socket) — 12 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `button_wireless_wall` (button) — 2 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `remote_button_emergency_sos` (remote) — 8 CI-only misses; hashed Ngang cards — runtime ButtonDevice/FlowCardHeuristics resolves
- `remote_button_wireless` (button) — 6 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `remote_button_wireless_fingerbot` (socket) — 3 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `remote_button_wireless_plug` (socket) — 3 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `remote_button_wireless_scene` (button) — 12 CI-only misses; hashed Ngang cards — runtime ButtonDevice/FlowCardHeuristics resolves
- `remote_button_wireless_usb` (socket) — 3 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `remote_button_wireless_valve` (socket) — 12 CI-only misses; hashed Ngang cards — runtime ButtonDevice/FlowCardHeuristics resolves
- `remote_button_wireless_wall` (button) — 1 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `scene_switch_1` (button) — 1 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `scene_switch_2` (button) — 2 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `scene_switch_3` (button) — 3 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `scene_switch_4` (button) — 4 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `scene_switch_6` (button) — 6 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `scene_switch_6ch` (remote) — 6 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `scene_switch_wall` (button) — 6 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `smart_knob_rotary` (button) — 3 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on

## Open issues

### button_wireless_2 (button, 19 triggers)
- **heuristic_miss** (medium) — 2 hits
  - gang 1 release: tried button_wireless_2_button_2gang_release, BUTTON_WIRELESS_2_BUTTON_2GANG_RELEASE, button_wireless_2_release, BUTTON_WIRELESS_2_RELEASE
  - gang 2 release: tried button_wireless_2_button_2gang_release, BUTTON_WIRELESS_2_BUTTON_2GANG_RELEASE, button_wireless_2_release, BUTTON_WIRELESS_2_RELEASE

### button_wireless_3 (button, 22 triggers)
- **heuristic_miss** (medium) — 3 hits
  - gang 1 release: tried button_wireless_3_button_3gang_release, BUTTON_WIRELESS_3_BUTTON_3GANG_RELEASE, button_wireless_3_release, BUTTON_WIRELESS_3_RELEASE
  - gang 2 release: tried button_wireless_3_button_3gang_release, BUTTON_WIRELESS_3_BUTTON_3GANG_RELEASE, button_wireless_3_release, BUTTON_WIRELESS_3_RELEASE
  - gang 3 release: tried button_wireless_3_button_3gang_release, BUTTON_WIRELESS_3_BUTTON_3GANG_RELEASE, button_wireless_3_release, BUTTON_WIRELESS_3_RELEASE

### button_wireless_4 (button, 29 triggers)
- **heuristic_miss** (medium) — 4 hits
  - gang 1 release: tried button_wireless_4_button_4gang_release, BUTTON_WIRELESS_4_BUTTON_4GANG_RELEASE, button_wireless_4_release, BUTTON_WIRELESS_4_RELEASE
  - gang 2 release: tried button_wireless_4_button_4gang_release, BUTTON_WIRELESS_4_BUTTON_4GANG_RELEASE, button_wireless_4_release, BUTTON_WIRELESS_4_RELEASE
  - gang 3 release: tried button_wireless_4_button_4gang_release, BUTTON_WIRELESS_4_BUTTON_4GANG_RELEASE, button_wireless_4_release, BUTTON_WIRELESS_4_RELEASE

### button_wireless_6 (button, 36 triggers)
- **heuristic_miss** (medium) — 6 hits
  - gang 1 release: tried button_wireless_6_button_6gang_release, BUTTON_WIRELESS_6_BUTTON_6GANG_RELEASE, button_wireless_6_release, BUTTON_WIRELESS_6_RELEASE
  - gang 2 release: tried button_wireless_6_button_6gang_release, BUTTON_WIRELESS_6_BUTTON_6GANG_RELEASE, button_wireless_6_release, BUTTON_WIRELESS_6_RELEASE
  - gang 3 release: tried button_wireless_6_button_6gang_release, BUTTON_WIRELESS_6_BUTTON_6GANG_RELEASE, button_wireless_6_release, BUTTON_WIRELESS_6_RELEASE

### button_wireless_8 (button, 46 triggers)
- **heuristic_miss** (medium) — 8 hits
  - gang 1 release: tried button_wireless_8_button_8gang_release, BUTTON_WIRELESS_8_BUTTON_8GANG_RELEASE, button_wireless_8_release, BUTTON_WIRELESS_8_RELEASE
  - gang 2 release: tried button_wireless_8_button_8gang_release, BUTTON_WIRELESS_8_BUTTON_8GANG_RELEASE, button_wireless_8_release, BUTTON_WIRELESS_8_RELEASE
  - gang 3 release: tried button_wireless_8_button_8gang_release, BUTTON_WIRELESS_8_BUTTON_8GANG_RELEASE, button_wireless_8_release, BUTTON_WIRELESS_8_RELEASE

### button_wireless_wall (button, 16 triggers)
- **heuristic_miss** (medium) — 2 hits
  - gang 1 release: tried button_wireless_wall_button_2gang_release, BUTTON_WIRELESS_WALL_BUTTON_2GANG_RELEASE, button_wireless_wall_release, BUTTON_WIRELESS_WALL_RELEASE
  - gang 2 release: tried button_wireless_wall_button_2gang_release, BUTTON_WIRELESS_WALL_BUTTON_2GANG_RELEASE, button_wireless_wall_release, BUTTON_WIRELESS_WALL_RELEASE

### scene_switch_1 (button, 10 triggers)
- **heuristic_miss** (medium) — 1 hits
  - gang 1 release: tried scene_switch_1_button_1gang_release, SCENE_SWITCH_1_BUTTON_1GANG_RELEASE, scene_switch_1_release, SCENE_SWITCH_1_RELEASE

### scene_switch_2 (button, 15 triggers)
- **heuristic_miss** (medium) — 2 hits
  - gang 1 release: tried scene_switch_2_button_2gang_release, SCENE_SWITCH_2_BUTTON_2GANG_RELEASE, scene_switch_2_release, SCENE_SWITCH_2_RELEASE
  - gang 2 release: tried scene_switch_2_button_2gang_release, SCENE_SWITCH_2_BUTTON_2GANG_RELEASE, scene_switch_2_release, SCENE_SWITCH_2_RELEASE

### scene_switch_3 (button, 20 triggers)
- **heuristic_miss** (medium) — 3 hits
  - gang 1 release: tried scene_switch_3_button_3gang_release, SCENE_SWITCH_3_BUTTON_3GANG_RELEASE, scene_switch_3_release, SCENE_SWITCH_3_RELEASE
  - gang 2 release: tried scene_switch_3_button_3gang_release, SCENE_SWITCH_3_BUTTON_3GANG_RELEASE, scene_switch_3_release, SCENE_SWITCH_3_RELEASE
  - gang 3 release: tried scene_switch_3_button_3gang_release, SCENE_SWITCH_3_BUTTON_3GANG_RELEASE, scene_switch_3_release, SCENE_SWITCH_3_RELEASE

### scene_switch_4 (button, 51 triggers)
- **heuristic_miss** (medium) — 4 hits
  - gang 1 release: tried scene_switch_4_button_4gang_release, SCENE_SWITCH_4_BUTTON_4GANG_RELEASE, scene_switch_4_release, SCENE_SWITCH_4_RELEASE
  - gang 2 release: tried scene_switch_4_button_4gang_release, SCENE_SWITCH_4_BUTTON_4GANG_RELEASE, scene_switch_4_release, SCENE_SWITCH_4_RELEASE
  - gang 3 release: tried scene_switch_4_button_4gang_release, SCENE_SWITCH_4_BUTTON_4GANG_RELEASE, scene_switch_4_release, SCENE_SWITCH_4_RELEASE

### scene_switch_6 (button, 35 triggers)
- **heuristic_miss** (medium) — 6 hits
  - gang 1 release: tried scene_switch_6_button_6gang_release, SCENE_SWITCH_6_BUTTON_6GANG_RELEASE, scene_switch_6_release, SCENE_SWITCH_6_RELEASE
  - gang 2 release: tried scene_switch_6_button_6gang_release, SCENE_SWITCH_6_BUTTON_6GANG_RELEASE, scene_switch_6_release, SCENE_SWITCH_6_RELEASE
  - gang 3 release: tried scene_switch_6_button_6gang_release, SCENE_SWITCH_6_BUTTON_6GANG_RELEASE, scene_switch_6_release, SCENE_SWITCH_6_RELEASE

### scene_switch_6ch (remote, 41 triggers)
- **heuristic_miss** (medium) — 6 hits
  - gang 1 release: tried scene_switch_6ch_button_6gang_release, SCENE_SWITCH_6CH_BUTTON_6GANG_RELEASE, scene_switch_6ch_release, SCENE_SWITCH_6CH_RELEASE
  - gang 2 release: tried scene_switch_6ch_button_6gang_release, SCENE_SWITCH_6CH_BUTTON_6GANG_RELEASE, scene_switch_6ch_release, SCENE_SWITCH_6CH_RELEASE
  - gang 3 release: tried scene_switch_6ch_button_6gang_release, SCENE_SWITCH_6CH_BUTTON_6GANG_RELEASE, scene_switch_6ch_release, SCENE_SWITCH_6CH_RELEASE
