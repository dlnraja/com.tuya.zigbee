# Bastien 1.0.229 — JSON OOM not identified, sleepy TX narrowed (2026-11-07)

App `com.dlnraja.tuya.zigbee.bastien` 1.0.229, Homey Pro (Early 2023), firmware 13.5.3.
Reports are redacted. This note does not claim the out-of-memory crash is fixed.

## Crash

Nov 6 has four `SIGABRT` and Nov 7 has three. Each dies in `JSON.parse` (`JsonParser<unsigned short>::MakeString`, `NewRawTwoByteString`). The heap stays at 55–56MB after MEMWARN clears the named caches, so those caches are not the retainer. The stack does not name a file or a call site.

A global `JSON.parse` rewrite was tried and removed. Escaping non-Latin-1 characters makes a second, often larger, string, and a wrapper can change reviver behaviour or fail a Homey SDK or settings load. `JSON.parse` is left native.

Shipped loaders that already refuse their own large files when the heap is critical (`driver-mapping-database`, fingerprint sources, the misattribution registry) now record a label and a byte size in a 24-entry ring. MEMWARN appends that summary. The ring stores no document text and drops any label that is not a short token. The next diagnostic can show which of these loads ran. It cannot, by itself, prove which parse aborted.

## Measured on this machine (2026-11-07)

Not a Homey and not a field soak. Athom build 237 (1.0.229) shows Mark-Compact staying at 62.1→62.1 MB and 62.3→61.9 MB, with a reported heap limit around 66–69 MB and an empty JavaScript stack. That is a live set. It does not name one JSON value. The dashboard aggregate of 0 crashes is wrong while those two manual rows exist, so it is not used as a result. The master build table did not load; no master upload is claimed. Stable Test on that dashboard is build 418, 5.12.538.

| Workload | Result |
|---|---|
| Empty process, `JSON.parse` of `lib/tuya/fingerprints.json` kept | +3.96 MB, 5776 keys |
| One shard `TZ3000_v.json` kept, then collected | +0.03 MB, then 0 |
| Every shard merged and kept | +3.06 MB, 5780 keys |
| `driver-mapping-database.json` parsed and kept | +2.79 MB |
| Deep clone of that object via `JSON.parse(JSON.stringify)` | +2.39 MB more |
| ~63.9 MB pad already live, then the full catalog (`--max-old-space-size=66`) | +2.28 MB kept, peak +4.15 MB. It still fit in this Node. |
| Same pad, then only `TZ3000_v.json` | +19 KB kept, peak +35 KB |

A sequential read of every shard while that pad was live peaked about as high as the monolith, so a fleet scan must not run during device init. Parallel parses were not used. The retained win is one shard instead of the catalog. It does not, by itself, bring a 62 MB live set down to a comfortable floor. The caller of the failing `JSON.parse` is still unknown.

## Sleepy button

The only button couple written in the Oct 17–Nov 1 logs is `_TZ3000_vsxvaj9i` + `TS0043` on `button_wireless_3` (CR2032). No battery or voltage report is in those lines. 200 on the ZCL 0–200 scale stays 100%. 255 and a missing value stay unknown.

`readAttributes` failed locally (`4 is not a valid attribute of basic`) and the code then called `sendFrame`. For an exact sleepy-button profile (`skipBatteryReporting` and either `sceneSwitch` or a `button_wireless*` driver id) that fallback frame is not sent. Press listeners are not removed. A successful read can still write setup `0xFFDE`.

`noEf00`, `_noEf00`, or `skipBatteryReporting` on another driver do not take this path. `ensureTuyaCluster` still arms passive listen when 0xEF00 was not in the interview, then may try magic. An incomplete interview does not remove that listen path.

`_TZ3000_ltt60asa` + `TS0004` still rejects `backlightMode` / `powerOnState` on standard OnOff. A Tuya DP is sent only when a Tuya cluster exists. Relay on/off is unchanged.

## House view, 7 Nov 2026 ~18:12 Paris

my.homey.app showed `com.dlnraja.tuya.zigbee.bastien` 1.0.229 Test, auto update on. The app memory figure was 64.65 MB and app storage 24.07 MB. System memory was 1.12 GB free of 1.99 GB. That app memory figure is Homey's process figure. It is not the V8 heap in the crash (Mark-Compact staying near 62 MB, limit about 66–69 MB). Free system RAM does not rule out a per-app heap abort. No per-app CPU or crash history was on that screen. Developer mode was off. Nothing on the house was changed.

`_TZ3000_vsxvaj9i` + `TS0043` showed 100% battery. Its 7-day capability graph had no sample, so that 100% is not a proven new report. The battery settings (automatic detection, 20/10% thresholds, 24h report interval) are settings, not a radio transmission. The app insight logs for battery, commands, errors, offline and Zigbee health were also empty for 7 days, so an empty graph is not unique to this button.

The button code treated any tile percent above 0 as fresh and, when `last_battery_time` was missing, wrote the current time. That made a default or leftover 100% look like a report for 24 hours and skipped the radio, which is still right for a sleepy coin cell. The stamp is gone. A stored percent is painted only when a sample path set `last_battery_from_report`. A percent already on the tile is not cleared and not replaced.

## Not done

The crashing parse is not named. Nothing here is a release. The same source-level change is on the local bastien-home and stable-v5 work branches and has not been pushed. The Athom table that says 0 crashes is not a result. P3264 stays out.

Test: `test/critical/p3265-bastien-json-oom-sleepy-battery.test.js`.
