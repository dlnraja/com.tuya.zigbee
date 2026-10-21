# Z2M generic device options → ideas for Homey (ideas only, nothing implemented)

Source: https://www.zigbee2mqtt.io/guide/configuration/devices-groups.html#generic-device-options (concepts summarised in our own words).

| Z2M concept | What it does | Possible Homey mapping |
|---|---|---|
| debounce (+ debounce_ignore) | merges bursts of reports within N s into one | per-device setting "report debounce" in our report pipeline; ButtonEventRouter already has adaptive dedup |
| throttle | drops repeated messages faster than N s | cap capability updates for chatty mmWave/energy devices (reduces flow spam and memory) |
| filtered_attributes / filtered_cache / filtered_optimistic | regex list of attributes never published | advanced setting "ignore attributes" (e.g. noisy linkquality, phantom humidity) |
| optimistic | publish the commanded state immediately | per-device "optimistic state" for devices that never confirm (some curtains/valves) |
| retain / qos / retention | MQTT delivery semantics | n/a in Homey; analogue = persisting last value across restarts (setStoreValue) |
| homeassistant / icon / friendly_name | presentation | device name / icon overrides already native in Homey |
| disabled | stop polling/treating a device | our per-device kill-switch settings |
| groups (Zigbee groups) | one multicast command to many devices | Homey Zones/Flows; possible native Zigbee group binding for remotes → lights |
| transition | default fade time | default transition setting for dimmers/lights |
| measurement_poll_interval | poll non-reporting devices | bounded fallback polling (already exists after failed configureReporting) |
