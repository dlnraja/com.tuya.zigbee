# Alarm polarity (SOS / contact / water)

Homey expects `true` = alarm active (open / wet / SOS pressed). Some OEM firmwares flip the IAS `alarm1`/`alarm2` bits (or Tuya DP bools).

## Single source of truth

`lib/managers/AlarmPolarityManager.js`

| Mode (`alarm_polarity`) | Behaviour |
|-------------------------|-----------|
| `auto` (default) | Curated **NORMAL** / **INVERTED** lists → smart learn from idle timing → XOR with legacy invert checkboxes |
| `normal` | Never flip raw signal |
| `inverted` | Always flip raw signal |

Legacy checkboxes (`invert_contact`, `reverse_alarm`, `invert_alarm`, `invert_sos`) remain as **XOR toggles** against the auto base.

## Lists

- `NORMAL_POLARITY` — e.g. HOBEIAN contact, common water, standard TS0215A SOS
- `INVERTED_POLARITY` — known flipped contact mfrs, some water, some SOS (`_TZ3000_ssp0maqm|TS0215A`, …)

Entries are `mfr` or sacred couple `mfr|PID`.

## Smart learn (auto only)

Samples **raw** (pre-invert) values into device store `alarm_polarity_learn`:

- **contact / water**: if raw stays `true` most of the time while idle → learn inverted
- **SOS**: many clear keep-alives + zero alarm spikes → learn inverted

Changing polarity settings resets learning.

## Wired into

- `UnifiedSensorBase` IAS zone handler
- `IASZoneManager._handleZoneStatusChange`
- `button_emergency_sos` `_handleAlarm` (inverted presses no longer ignored)

Settings added on: `contact_sensor`, `water_leak_sensor`, `button_emergency_sos`.
