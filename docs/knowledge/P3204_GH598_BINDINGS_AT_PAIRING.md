# P3204 — GH#598 `_TZE284_9ern5sfh` "Unable to connect" (2026-11-02, Paris)

User report presumed true (docs/rules/USER_REPORTS_PRESUMED_TRUE.md). 10 leads:

1. Payload: replayed `homey app build` + `npm run prepare-publish` at tag v9.0.1604 — `_TZE284_9ern5sfh` survives in lcdtemphumidsensor (with TS0601). Not a compaction loss.
2. One owner: lcdtemphumidsensor only (compose + app.json). OK.
3. pid: interview says TS0601, listed. OK.
4. **Endpoints/clusters: MISMATCH.** Node ep1 in = 0, 4, 5, 60672, 61184; out = 10, 25. lcdtemphumidsensor declares bindings 1, 1026, 1029. The Homey SDK docs state one bind request is made per `bindings` entry during pairing; none of the three exist on the node. Before P2823 the couple lived on climate_sensor (no `bindings`) and paired.
5. onNodeInit crash: none found in either driver (Tuya listeners wrapped).
6. Mandatory 0xEF00 / capabilities at pairing: none in code; the only pairing-time step is the manifest binds of lead 4.
7. Test 9.0.1604 contains the couple (lead 1).
8. Prefix: Z2M lists `_TZE284_` only; interview string is exactly `_TZE284_9ern5sfh` (case OK).
9. Sleepy end device (receiveWhenIdle false): failed/unanswered binds extend the interview while the device sleeps — consistent with "Unable to connect", and with a Bridge radio path.
10. Pair template: driver uses default Zigbee pairing; learnmode text fine.

Fix: move the couple (`_TZE284/_TZE204/_TZE200_9ern5sfh`, canonical case only) to `lcdtemphumidsensor_3`, whose bindings 4/5/61184 all exist on the node and whose DP map is Z2M's (DP1 temp/10, DP2 humidity, DP4 battery %, request-driven time sync). Pins, sacred-keep, curated removal, removal evidence, fp shard follow. Already-paired units elsewhere keep their driver.

Open risk (not changed): other EF00-only TS0601 couples in lcdtemphumidsensor (e.g. `_TZE200_vvmbj46n`) get the same 1/1026/1029 binds; check with an interview before moving any.
