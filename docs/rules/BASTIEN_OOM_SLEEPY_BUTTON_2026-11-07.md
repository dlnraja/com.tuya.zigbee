# Bastien 1.0.229 — JSON OOM and sleepy button TX (2026-11-07)

App `com.dlnraja.tuya.zigbee.bastien` 1.0.229 on Homey Pro (Early 2023), firmware 13.5.3.
Reports are redacted. No IEEE, mail address, or household name is stored here.

## What the logs show

| Report | Evidence | Conclusion |
|---|---|---|
| 6 Nov, four SIGABRT | `JsonParser<unsigned short>::MakeString` / `ParseJson` / `Builtin_JsonParse` / `NewRawTwoByteString` | The failing allocation is inside `JSON.parse` of a two-byte string. The stack does not name the file. |
| 7 Nov, three SIGABRT | Same native frames | Same failure, including after the app had already been up. |
| Heap | critical 55–56MB for minutes; MEMWARN clears lazy-load, soft-features, divisors, mfr-names, json-cache, device-caches, diag rings, log buffer, budget | Those caches are not the retainer. The live set stays put, so the next wide parse has no room. |
| FLOW-GUARD | about 50 absent app-level cards (`health_*`, `network_*`, `battery_percent_below`, …) | Logged once each. Not established as the OOM cause. Cards were not deleted. |
| 7 Nov `switch_4gang` | `_TZ3000_ltt60asa` + `TS0004`, standard OnOff, no EF00 | `backlightMode` / `powerOnState` are rejected locally (`not a valid attribute of onOff`). Relay on/off in the same log still changes. No DP is sent when no Tuya cluster is present. |
| 17 Oct–1 Nov buttons | `button_wireless_3`, settings `_TZ3000_vsxvaj9i` / `TS0043`, CR2032 | Exact couple. `measure_battery` is kept and also listed unused because no battery or voltage report arrived. Do not invent a percent. |
| Same button | `readAttributes` then `4 is not a valid attribute of basic`, then sendFrame | Local schema reject was followed by a radio fallback. |
| `button_wireless_2` | sleepy-button mode skips bind / configure / queryAll; magic can still run | Profile flags, not a new manufacturer. The couple is not in this note because the excerpt does not give one. |
| `button_wireless_1` | CR2032 class, couple not in the excerpt | Not guessed. |

`200` on the ZCL 0–200 scale remains 100% for this profile. `255`, `65535`, `null` stay unknown. Nothing writes 100% when the report is missing.

## Code

- `lib/utils/latin1-json.js` — escape code units above 255 to `\uXXXX` before `JSON.parse`, installed at the top of `app.js`. A parse larger than 256KB is refused when `heapUsed` is already above 52MB (`JSON_PARSE_HEAP`). Buffer loaders use the same path.
- `lib/zigbee/TuyaMagicPacket.js` — a sleepy scene remote (`skipBatteryReporting` / `sceneSwitch` / `noEf00`) does not `sendFrame` after a failed read. A successful read can still write setup `0xFFDE`. Mains devices keep the raw fallback. Press listeners are unchanged.
- `lib/io/DeviceIOFacade.js` — the same remote does not get an EF00 magic/rescan when 0xEF00 was not interviewed.
- `lib/devices/UnifiedSwitchBase.js` — backlight and power-on DP fallbacks run only when a Tuya cluster exists (`_TZ3000_ltt60asa` has none).

Test: `test/critical/p3265-bastien-json-oom-sleepy-battery.test.js`.

## Not in this change

Driver-cap 347, P3264 lost couples, P3263 upload, P3255 batching, issues 559/550/581/584, the 3-phase meter crash, `_TZ3210_ncw88jfq`, FrankEver valve DPs, and the stable radar diag. No Athom ticket, no forum post, no publish. Stable and bastien-home are not pushed; the patch is on the master work branch and still has to be ported before a Bastien build contains it.
