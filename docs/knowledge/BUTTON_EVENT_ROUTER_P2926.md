# Button event router (P2926) — 2026-10-21

## Goal
A button press must fire its Flow once, whatever path it arrives on.

## Modules
- `lib/buttons/ButtonEventRouter.js`: normalizers per path (zcl_onoff, tuya_fd 0xFD, scene_recall 0x0005, level_step, e000, e001, ef00_dp, raw, multistate, onoff_attr) that return {button, type}. It also holds the per-device router:
  - cross-path dedup (same button+type on a *different* path inside the window = copy; same path repeats pass so double-click logic upstream is untouched; repeated transaction sequence = copy);
  - dynamic window: 2.5 × p90 of observed cross-path latency + 100 ms, clamped 400–1500 ms, base 900 ms (our P2440 value);
  - learning: presses per path/endpoint, preferred-path order; all paths keep listening;
  - `shouldEmulate(type)`: software double/triple/long only if the device never sent it natively;
  - unknown capture: ring of 20 frames with a heuristic {button from endpoint, press 0/1/2}.
  All maps are capped (64 keys, 16 latencies, 20 unknowns). No timers.
- `lib/buttons/attachButtonPaths.js`: optional, additive listeners on ButtonDevice drivers: multistateInput presentValue, onOff attribute reports (pure remotes only, no `onoff` capability), E000/E001 command frames (pure remotes only), passive mode tracking (onOff 0x8004, E001 0xD020 → store `button_mode_detected`), unknown manufacturer clusters ≥0xFC00 → bounded capture + app-level `button_pressed` with button token `any:N`. It is idempotent and cleaned on onUninit.
- The P2440 gate in `PhysicalButtonMixin._triggerPhysicalFlow` now uses the router window when the profile sets no explicit `crossPathDedupMs`/`debounceMs`, and runs the router admit for path-tagged presses.

## Scene mode
- TS004F 0x8004: 1 = event/scene, 0 = command/dimmer. It is read passively, never written by the router. The existing `button_mode` setting and `setButtonMode` stay the only writers.
- E001 0xD020 switch mode, same 0/1 meaning (Z2M). `isDecoupled()` reads relay-decoupled values from E001 0xD030 or DPs.
- Scene id mapping: multi-endpoint → endpoint = button, id%3 → single/double/long. Single endpoint → 1–16 single, 17–32 double, 33–48 long (deCONZ-style blocks). An explicit per-device map overrides both.

## Native paths
They are unchanged and stay mandatory. Nothing is removed, and no capability or couple changes.

## Credits (rewritten, not copied)
- Zigbee2MQTT / zigbee-herdsman-converters (Koenkk): 0xFD values, 0x8004, E001 0xD020/0xD030. https://github.com/Koenkk/zigbee-herdsman-converters
- ZHA quirks (zigpy/zha-device-handlers): drop repeated TSN. https://github.com/zigpy/zha-device-handlers
- deCONZ (dresden-elektronik): scene recall → button events. https://github.com/dresden-elektronik/deconz-rest-plugin
- Johan Bendz com.tuya.zigbee: endpoint = gang via onOff BoundCluster. https://github.com/JohanBendz/com.tuya.zigbee

## P2926b — follow-up (2026-10-21)
1. All 27 `_triggerPhysicalFlow` call sites in PhysicalButtonMixin now carry a `path` (tuya_fd, zcl_onoff, level_step, raw, raw_scene, scene_recall, multistate, ef00_dp, onoff_attr, e000, e001, emulated). A test fails if a new call site is left untagged.
2. Custom drivers: smart_knob and smart_knob_switch already extend ButtonDevice (the coverage regex missed them). wall_switch_2gang_1way goes through the mixin gate. wall_switch_4_gang_tuya now tags `ef00_dp`.
3. Bind on wake: on multi-endpoint pure remotes whose driver declares a native onOff binding, endpoints >1 get `onOff.bind()`. A failure re-arms the next wake window.
4. Battery wake window: any received frame means the device is awake. Bind and the first-pair mode read run then, at most once every 6 h.
5. DP cross-check: EF00 `reporting`/`response` DPs are recorded per mfr/pid/firmware (at most 5 identities × 32 DPs). If the profile declares `dpButtons`, an unexpected DP is logged. Record only, nothing fires.
6. Backlight is already wired in UnifiedSwitchBase (`backlight_mode` → DP15 / onOff 0x8001). Scene DPs go through the ef00_dp path and the cross-check. No new DP number was invented.
7. Scene recall (0x0005) in ButtonDevice goes through the router. A copy of a press already delivered by 0xFD or onOff is not fired again, and scene recall marks the mode as `scene`. 0xFD raw scene frames are tagged `raw`.
8. Emulation: `_finalizeClickDetection` skips software double/triple once the device has sent that type natively. E001 0xD020=1 sets the `relay_decoupled` store and router flag (Z2M switch_mode scene).
9. button_mode: `onAdded` flags new devices. For TS004F, 0x8004 is read (2.5 s timeout, Homey timer) and `button_mode` is set to scene or dimmer. On failure the fallback stays and the next wake retries. Existing devices never carry the flag.

## Remaining
- No new setting to *write* the scene mode beyond the existing `button_mode`.
- The DP cross-check has no sourced per-firmware expectation table; it only uses the `dpButtons` profile when one is present.
- PhysicalButtonMixin-only drivers (switches) get the dynamic dedup but not the extra listeners, on purpose (ghost-trigger risk).

## Coverage (`node scripts/ci/button-path-coverage.js`)
| driver | base | dedup | paths |
|---|---|---|---|
| blaster_remote | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| button_emergency_sos | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| button_wireless | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| button_wireless_1 | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| button_wireless_2 | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| button_wireless_3 | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| button_wireless_4 | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| button_wireless_6 | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| button_wireless_8 | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| button_wireless_fingerbot | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| button_wireless_plug | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| button_wireless_scene | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| button_wireless_smart | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| button_wireless_switch | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| button_wireless_usb | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| button_wireless_valve | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| button_wireless_wall | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| dimmer_wall_1gang | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| dimmer_wall_plug | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| dimmer_wall_switch | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| dimmer_wall_water | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| handheld_remote_4_buttons | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| remote_button_emergency_sos | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| remote_button_wireless | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| remote_button_wireless_fingerbot | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| remote_button_wireless_handheld | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| remote_button_wireless_plug | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| remote_button_wireless_scene | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| remote_button_wireless_smart | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| remote_button_wireless_usb | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| remote_button_wireless_valve | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| remote_button_wireless_wall | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| remote_dimmer | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| scene_switch_1 | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| scene_switch_2 | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| scene_switch_3 | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| scene_switch_4 | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| scene_switch_6 | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| scene_switch_6ch | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| scene_switch_wall | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| smart_button_switch | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| smart_knob | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| smart_knob_rotary | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| smart_knob_switch | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| smart_remote_1_button | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| smart_remote_1_button_2 | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| smart_remote_4_buttons | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| smart_scene_panel | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| switch_wall | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| switch_wall_5gang | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| switch_wall_6gang | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| switch_wall_7gang | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| switch_wall_8gang | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| wall_remote_1_gang | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| wall_remote_2_gang | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| wall_remote_3_gang | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| wall_remote_4_gang | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| wall_remote_4_gang_2 | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| wall_remote_4_gang_3 | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| wall_remote_6_gang | ButtonDevice | router-dynamic | dp_crosscheck, e000, e001, ef00_dp, level_step, mode_8004_d020, multistate, onoff_attr, raw, scene_recall, tuya_fd, unknown_capture, wake_bind, zcl_onoff |
| wall_switch_1_gang | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| wall_switch_1_gang_tuya | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| wall_switch_1gang_1way | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| wall_switch_2_gang | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| wall_switch_2gang_1way | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| wall_switch_3_gang | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| wall_switch_3gang_1way | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| wall_switch_4_gang | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| wall_switch_4_gang_tuya | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| wall_switch_4gang_1way | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| wall_switch_5_gang_tuya | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
| wall_switch_6_gang_tuya | PhysicalButtonMixin | router-dynamic | e000, ef00_dp, level_step, multistate, raw, tuya_fd, zcl_onoff |
