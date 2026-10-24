# Lessons P3001–P3016 (2026-10-24, Europe/Paris)

Hand-written summary of why each fix was needed. The generated [lessons.md](lessons.md) keeps the commit subjects.

| P | commit | lesson |
|---|---|---|
| P3001 | [c1e1a036d7](https://github.com/dlnraja/com.tuya.zigbee/commit/c1e1a036d7) | **TRV variation bug** (#560): `'radiator_valve'.includes('valve')` sent TRVs to the water-valve DP map (DP2 = onoff, DP5 = countdown). Match driver families with exact ids or anchored regexes, never substrings. |
| P3002 | [1339653a06](https://github.com/dlnraja/com.tuya.zigbee/commit/1339653a06) | **Double calibration**: the offset was applied to `measure_temperature` and again to `target_*`, and once more by the device echo. Apply calibration exactly once, to the measured value only. **ZCL /100**: `measuredValue` is centi-degrees; divide once. |
| P3002b | [9e6cdb405a](https://github.com/dlnraja/com.tuya.zigbee/commit/9e6cdb405a) | Lint gates must stay green on every touched line (range guard braces). |
| P3010 | [a79f4e36cd](https://github.com/dlnraja/com.tuya.zigbee/commit/a79f4e36cd) | Upstream couples are added additively; a layout matcher using containsCI must not match prefixes of other models. |
| P3011 | [d712f75028](https://github.com/dlnraja/com.tuya.zigbee/commit/d712f75028) | **Unsupported guard**: every 0x81/0x84/0x86/0xC3 outcome is cached per device (12 h memory, 7 d persisted) so we stop hammering devices, and unknown incoming commands become Flow triggers instead of silent default responses. |
| P3011–P3013 | [f7dc12b775](https://github.com/dlnraja/com.tuya.zigbee/commit/f7dc12b775) | **includesCI misuse**: case-insensitive *includes* on manufacturer ids matched other couples at 6 sites. Use exact case-insensitive equality for ids. |
| P3014 | [c019c743e1](https://github.com/dlnraja/com.tuya.zigbee/commit/c019c743e1) | **One driver per couple**: a couple listed in two drivers pairs randomly. Remove the duplicate from the wrong driver and pin it with a test. |
| P3015 | [d4fc5aabed](https://github.com/dlnraja/com.tuya.zigbee/commit/d4fc5aabed) | **Caseless duplicates**: `_TZE284_X` and `_tze284_x` are the same couple; the duplicate gate must compare case-insensitively. |
| P3015b | [b905753f11](https://github.com/dlnraja/com.tuya.zigbee/commit/b905753f11) | A water valve listed in climate_sensor was removed; the test asserts no other holder. |
| P3016 | [b57a979ef6](https://github.com/dlnraja/com.tuya.zigbee/commit/b57a979ef6) | **Unknown interpreter**: exact (spec/Z2M/ZHA) → family → heuristic, learning per device, Flow cards. **Tongou DP6**: TO-Q-SYS-JZT DP6 is an 8-byte V/I/P block, not phaseVariant2. **Powbay 18-byte** DP: three 6-byte phase blocks. Never guess a byte layout without a sample. |
| P3017 | (this change) | Method chains for every capability, coverage matrix, teach/forget actions, TSN dedup, DP-name catalogue, user teach always wins over learned or exact guesses. |
