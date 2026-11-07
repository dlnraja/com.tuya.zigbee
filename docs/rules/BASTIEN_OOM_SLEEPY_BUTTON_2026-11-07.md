# Bastien 1.0.229 — JSON OOM not identified, sleepy TX narrowed (2026-11-07)

App `com.dlnraja.tuya.zigbee.bastien` 1.0.229, Homey Pro (Early 2023), firmware 13.5.3.
Reports are redacted. This note does not claim the out-of-memory crash is fixed.

## Crash

Nov 6 has four `SIGABRT` and Nov 7 has three. Each dies in `JSON.parse` (`JsonParser<unsigned short>::MakeString`, `NewRawTwoByteString`). The heap stays at 55–56MB after MEMWARN clears the named caches, so those caches are not the retainer. The stack does not name a file or a call site.

A global `JSON.parse` rewrite was tried and removed. Escaping non-Latin-1 characters makes a second, often larger, string, and a wrapper can change reviver behaviour or fail a Homey SDK or settings load. `JSON.parse` is left native.

Shipped loaders that already refuse their own large files when the heap is critical (`driver-mapping-database`, fingerprint sources, the misattribution registry) now record a label and a byte size in a 24-entry ring. MEMWARN appends that summary. The ring stores no document text and drops any label that is not a short token. The next diagnostic can show which of these loads ran. It cannot, by itself, prove which parse aborted.

## Sleepy button

The only button couple written in the Oct 17–Nov 1 logs is `_TZ3000_vsxvaj9i` + `TS0043` on `button_wireless_3` (CR2032). No battery or voltage report is in those lines. 200 on the ZCL 0–200 scale stays 100%. 255 and a missing value stay unknown.

`readAttributes` failed locally (`4 is not a valid attribute of basic`) and the code then called `sendFrame`. For an exact sleepy-button profile (`skipBatteryReporting` and either `sceneSwitch` or a `button_wireless*` driver id) that fallback frame is not sent. Press listeners are not removed. A successful read can still write setup `0xFFDE`.

`noEf00`, `_noEf00`, or `skipBatteryReporting` on another driver do not take this path. `ensureTuyaCluster` still arms passive listen when 0xEF00 was not in the interview, then may try magic. An incomplete interview does not remove that listen path.

`_TZ3000_ltt60asa` + `TS0004` still rejects `backlightMode` / `powerOnState` on standard OnOff. A Tuya DP is sent only when a Tuya cluster exists. Relay on/off is unchanged.

## Not done

The crashing parse is not named. Nothing here is a release. `bastien-home` and `stable-v5` are not updated by the master work branch until the same patch is reviewed on those trees. P3264, publish holds, and the other November diagnostics stay out of this change.

Test: `test/critical/p3265-bastien-json-oom-sleepy-battery.test.js`.
