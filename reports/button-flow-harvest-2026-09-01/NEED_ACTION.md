# Button Flow Harvest — NEED_ACTION

Generated: 2026-09-01T07:56:18.641Z

## Exempt (not button-flow scope)

- `ir_remote` — IR remote, 0 button triggers expected
- `wifi_ir_remote` — IR remote, 0 button triggers expected

## Known false positives (runtime OK)

CI harvest tries generic patterns first; `FlowCardHeuristics` + `ButtonDevice` resolve Ngang/hashed/socket cards at runtime.

- `button_emergency_sos` (button) — 3 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `button_wireless_fingerbot` (socket) — 2 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `button_wireless_plug` (socket) — 3 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `button_wireless_switch` (socket) — 6 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `button_wireless_usb` (socket) — 12 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `button_wireless_valve` (socket) — 12 CI-only misses; Ngang cards declared — CI tries generic patterns first; runtime resolves
- `remote_button_wireless_fingerbot` (socket) — 3 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `remote_button_wireless_plug` (socket) — 3 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `remote_button_wireless_scene` (button) — 12 CI-only misses; hashed Ngang cards — runtime ButtonDevice/FlowCardHeuristics resolves
- `remote_button_wireless_usb` (socket) — 3 CI-only misses; socket hybrid — runtime PhysicalButtonMixin + switch_1gang/physical_on
- `remote_button_wireless_valve` (socket) — 12 CI-only misses; hashed Ngang cards — runtime ButtonDevice/FlowCardHeuristics resolves
- `smart_knob_rotary` (button) — 3 CI-only misses; optional press type not declared

## Open issues

No blocking issues — all button drivers OK for publish.