# Unknown commands, clusters and DPs: what they mean and how we handle them (P3016)

All text below is rewritten for this project. Sources are credited per row; nothing is copied.

## Pipeline

```
BoundCluster unknown cmd ─> UnknownCommandSink.record ─┐
                                                       ├─> UnknownCommandEngine
Tuya DP not mapped ─────> UnknownDPLogger.logUnknownDP ┘        │
                                                                ├─ UnknownCommandInterpreter
                                                                │    1. exact per-couple decoder (COUPLE_DP)
                                                                │    2. exact ZCL / Tuya frame decoders
                                                                │    3. family decoders (button / meter / thermostat / radar)
                                                                │    4. heuristics by wire type (low confidence)
                                                                ├─ UnknownLearning (per device, 40 patterns, LRU, store key unknown_learned)
                                                                └─ Flow cards (only when declared in the manifest)
```

* Trigger **unknown_command_received**: tokens device_name, cluster, command, payload_hex, decoded,
  inferred_action, confidence. It has an optional device filter. Periodic DP echoes fire only when the value changes.
* Trigger **inferred_button_action**: tokens device_name, button, action, source, confidence. It takes an optional device filter
  and an action filter, and fires only when confidence is at least 0.4.
* Condition **last_inferred_action_is**: device, action, window of 1 to 1440 minutes.
* Action **unknown_commands_diag**: a JSON token with patterns, actions and counters. It contains no name, id, IEEE or token.
* Safety: no function throws. Flows are rate-limited to one per second per device and pattern, and to 20 per second globally (FanoutLimiter).
  Logs are written once per pattern every 10 minutes. The existing P3011 `tuya_cluster_received` bridge is kept unchanged.

## Harvest: commands observed in this project (diag mails, logs, repo data)

| Command / DP | Devices (couple) | Meaning | Source | Implemented? |
|---|---|---|---|---|
| EF00 DP6 raw, 8 bytes | `_TZE284_6ocnqlhn` / TS0601 (Tongou TO-Q-SYS-JZT, din_rail_meter) | Phase struct: V = u16 BE / 10, I = u24 BE mA, P = u24 BE W. Sample `098a0007fb0001a1` decodes to 244.2 V, 2.043 A, 417 W | Z2M tuya.ts `[6, null, tuya.valueConverter.phaseVariant2]` for this couple; Homey diag mails 09-10/2026 | Yes, exact. Also fixed in `DpByteArrayProfiles.parseTongouToqSysJztDp6`, which used a wrong 7-byte layout |
| EF00 DP36 uint8 0/1 | wall_thermostat couples | running_state heat/idle. The polarity differs per couple | Z2M tuya.ts uses both lookups (`{idle:1,heat:0}` and `{heat:1,idle:0}`) | Family decoder (`state`, 0.55). Already mapped in UnifiedThermostatBase |
| EF00 DP113/115/116/117 uint8, DP104 uint32, DP105 | presence_sensor_radar (couple not identifiable in diag) | Radar parameter echoes (gates, thresholds, modes). They are re-sent every ~60 s | Z2M tuya.ts radars MTD285-ZB / MTD085-ZB / ZY-M100 (DP1xx = settings) | Family decoder (`config_echo`, 0.45). Already internal in presence_sensor_radar/configs.js. Flows fire only on change |
| genBasic 0x0000 cmd ? (EP1) | radar | Tuya private basic report with no function | Z2M `fz.ignore_basic_report` | Yes (`ignore`) |
| EF00 cmd 0x01/0x02/0x05/0x06 | smart_rcbo and all TS0601 | dataResponse / dataReport / activeStatusReport(Alt) | Z2M zigbee-herdsman cluster manuSpecificTuya | Yes, exact (`dp`) |
| EF00 cmd 0x11 / 0x13 / 0x15 | TS0601 | MCU version response / OTA block request / OTA result | zigbee-herdsman manuSpecificTuya | Yes, exact (`version`, `ota`) |
| EF00 cmd 0x24 | TS0601 (clocks, TRVs, meters) | mcuSyncTime: the device asks for the time | zigbee-herdsman; Tuya Zigbee serial protocol | Yes, exact (`time_request`). Answered elsewhere (TuyaTimeSync) |
| EF00 cmd 0x25 / 0x60 | TS0601 | Gateway connection status request / weather request | zigbee-herdsman manuSpecificTuya | Yes, exact |
| 0xED00 | smart_rcbo | Zosung IR / Tuya private extra cluster, registered as ZosungIRTransmitCluster | registerClusters.js; Ef00OnlyInterview | Logged; heuristic only |
| genOnOff 0xFD [0/1/2] | TS0041/42/43/44, TS004F, scene remotes | Tuya button press: single / double / hold. Endpoint = button | Z2M `fz.tuya_on_off_action` (tuyaAction); ZHA TuyaSmartRemote quirks | Yes, exact (0.95) |
| genOnOff 0xFC [0/1] | TS004F knobs (scene mode) | Rotate right / left | Z2M `fz.tuya_multi_action` (tuyaAction2) | Yes, exact |
| genOnOff 0x00/0x01/0x02/0x40/0x41/0x42 | remotes in command mode | off / on / toggle / offWithEffect / onWithRecall / onWithTimedOff | ZCL spec 3.8 | Yes, exact |
| genLevelCtrl 0x00-0x07 | dimmer remotes, TS004F command mode | moveToLevel = value, move = hold, step = rotate, stop = release | ZCL spec 3.10; Z2M `fz.command_move/step/stop` | Yes, exact |
| genScenes 0x05 recall | scene remotes (TS0044 scene mode, Lidl) | Recall: group u16 LE + scene u8 | ZCL spec 3.7; Z2M `fz.command_recall` | Yes, exact. Mapped with ButtonEventRouter.sceneToButton |
| lightingColorCtrl 0x01/02/04/05/08/09/0A/41/42/47/4B/4C | RGB/CCT remotes | Hue/sat/color/temp move and step. Mode 1 = up, 3 = down, 0 = stop. 0x47 = stopMoveStep | ZCL spec 5.2 | Yes, exact (mode-bearing commands). Moves with X/Y rates are read as long/rotate at 0.6 |
| E000 0xF7/0xF8/0xFB | Tuya switches (manuSpecificTuya4) | Random timing / cycle timing / inching echo | Z2M tuya.ts manuSpecificTuya4 | Yes (`config_echo`) |
| E000 other | TS0042/TS0046 (ZHA TuyaZBE000Cluster) | Private button event. The press byte layout is not confirmed | ZHA quirks tuya ts0042/ts0046 | Heuristic (0.45) |
| E001 attr 0xD030 | Tuya switch modules | External switch type: 0 toggle, 1 state, 2 momentary | ZHA TuyaZBExternalSwitchTypeCluster | Already handled by switch drivers (config) |

## Rules for adding a decoder

1. A decoder is **exact** only when a converter or spec row confirms it for that couple or cluster. Add it to `COUPLE_DP`
   (DP) or to the frame decoders (cluster). Add a unit test with a real sample.
2. Family decoders cover device classes. Keep their confidence below 0.75.
3. Heuristics stay at or below 0.4. Learning can reinforce a pattern, but it never overrides an exact decoder or a user-taught entry.
4. Never invent manufacturer ids. Never move a couple between drivers here; one couple belongs to one driver.

## Credits

Koenkk/zigbee2mqtt and zigbee-herdsman-converters (tuya.ts, fromZigbee), zigpy/zha-device-handlers (tuya quirks),
the ZCL specification r8 (Connectivity Standards Alliance), and the Tuya Zigbee serial protocol docs. Field diagnostics come from Homey users (anonymised).
