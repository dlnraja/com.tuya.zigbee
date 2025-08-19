### Drivers by type (overview)

- plug-tuya-universal
  - class: socket
  - capabilities: onoff, measure_power, meter_power
  - overlays: vendors/_TZ3000/plug.json (proposed/confirmed)

- climate-trv-tuya
  - class: thermostat
  - capabilities: target_temperature, measure_temperature, locked, alarm_battery
  - overlays: vendors/_TZE200/climate-trv-*.json (fw variants)

- cover-curtain-tuya
  - class: windowcoverings
  - capabilities: windowcoverings_set, windowcoverings_state, alarm_battery

- remote-scene-tuya
  - class: sensor
  - capabilities: alarm_battery

Notes:
- TS codes live only in overlay data, never in folder names.
- Only overlays with status:"confirmed" are effective at runtime.

