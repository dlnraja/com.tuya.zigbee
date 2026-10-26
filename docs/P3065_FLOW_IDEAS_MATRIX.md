# P3065 — Flow card ideas from other projects (t575u / t576u)

Ideas only: every card is our own generic, brand-free, local code (no bridge, hub or cloud).
Sources read 2026-10-26: Homey SDK docs (card model), Johan Bendz's Tuya Zigbee app (card families),
ZHA quirks `zhaquirks/const.py` (press vocabulary, scene recall), Zigbee2MQTT device pages
(TS0044 per-button `1_single/1_double/1_hold`, TS0215A `disarm/arm_day_zones/arm_night_zones/arm_all_zones/exit_delay/emergency`),
Home Assistant device automations (device trigger / condition model) and its community adaptive-lighting integration.

| Idea (source) | Kind | Already in our app | Decision |
|---|---|---|---|
| Per-button single/double/hold/release (Z2M action enums, ZHA short/double/long press + long release, Hubitat pushed/held/doubleTapped/released) | trigger | yes: `button_matrix` (button × action dropdown), `button_pressed`/`_double_press`/`_long_press`/`_release`/`_multi_press`, per-driver cards | no new card (would duplicate) |
| Scene recall with scene number (ZHA COMMAND_RECALL, Z2M `recall_<n>`) | trigger | only mapped to a button press (scene id = press type on Tuya) | **D12 `scene_recalled`** (tokens scene, endpoint), button cards unchanged |
| Alarm armed / disarmed (Z2M TS0215A, IAS ACE) | trigger/condition | Homey system cards for `homealarm_state` (keypad WKE502Z), `heiman_keyfob_*` driver cards | no duplicate of system cards; generic IAS ACE remote card left for a data step (needs the TS0215A route checked first) |
| Device unavailable / back online / is unavailable (HA availability, Z2M availability) | trigger/condition | yes: `device_became_unavailable`, `device_back_online`, `device_is_unavailable`, `device_offline_risk` | no new card |
| Low signal per device (Z2M linkquality, HA LQI sensor) | trigger/condition | app-level `network_weak_signal_detected` (with lqi token) | deferred: SDK 3 gives no reliable per-device LQI (`zclNode.lqi` is not set), never invented |
| Energy tariff / cost (HA energy, Homey energy apps) | trigger/condition/action | yes: `tariff_period_changed`, `tariff_is_peak_period`, `tariff_set_rate`, energy summaries | per-device cost card left for later |
| Thermostat schedule (Z2M weekly schedule, Hubitat) | trigger/condition/action | yes: `schedule_*` cards | no new card |
| Thermostat window open (Z2M `window_detection`/`window_open`) | trigger/condition | per-driver window cards on TRVs | generic card left for a data step (capability names differ per driver) |
| Battery low once per crossing (HA battery device class) | trigger | D8 autowire | done (D8) |
| Presence / frost protection / power-on behaviour family cards (HA device conditions & actions) | all | generic `capability_value_*` only | done (D10) |
| Adaptive lighting on/off, pause N min, is active, chosen kelvin (HA adaptive-lighting) | all | per-driver on/off on 5 drivers | **D11** (filter `light_temperature`, any light) |
