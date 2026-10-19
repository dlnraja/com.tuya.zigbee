# Master publish unblock + issue #560 (TRV06) + bjawzodf/TY0201 + MemwarnGuard (2026-10-18, own words)

## A1 — Auto-Fix + Publish red since 16/10
- Step "Scaffold missing driver.flow.compose.json (P2518 self-heal)" runs `scripts/gates/native-matrix-gate.js`.
- It counted 258 mandatory non-native clusters against a baseline of 255. The five new entries were the Tuya private cluster
  0xE000 (57344) in `zigbee.endpoints[*].clusters` of `wall_remote_2_gang` (ep1, ep2) and `wall_remote_3_gang` (ep1, ep2, ep3).
- They arrived with the TS0042/TS0043 "interview shape" commits (afba3bd4b0, b09b3902ba). The later peer-compose commits
  (4a24c4d558, f5ed9b65bf) did not touch clusters.
- Fix (additive for behaviour, no couple / capability / binding touched): 0xE000 leaves the mandatory manifest clusters; the
  runtime listener overlay stays in `lib/devices/WallSceneRemoteHybridInit.js` (E000 cluster + BoundCluster + raw-frame interceptor).
  `data/native-matrix-baseline.json` is untouched (shrink-only). Tests p2827/p2828 now assert 0/1/6 native + "no 0xE000 in the manifest".

## A2 — issue #560 TRV06 `_TZE200_rxq4iti9` / TS0601 (profile me167), reporter artisare, tested on 9.0.1512
Issue: https://github.com/dlnraja/com.tuya.zigbee/issues/560
- Battery: Z2M `TS0601_thermostat_3` (zigbee-herdsman-converters, Koen Kanters and contributors) lists `_TZE200_rxq4iti9`
  (whitelabel EARU TRV06) and maps **DP35** through `errorOrBatteryLow` (value 1 = low battery, also published as `error`).
  There is no battery percentage. A user write-up in Koenkk/zigbee2mqtt#25093 (MichaelHainbach, 2026-10-11, on the cousin
  `_TZE284_o3x45p96`) says bit 0 of DP35 is the low-battery flag and that the valve only sends DP35 when it is queried or
  its fault state changes. Another commenter (Jonstep101010, same issue) listed **DP102 "Battery Low"** from a Tuya DP table of
  that cousin: UNCONFIRMED for rxq4iti9, and DP102 is already `eco_temp` in our me167 map, so it is NOT mapped.
- Change: me167 DP35 transform is now bit 0; `alarm_battery` is added only when a DP35 report really arrives
  (no phantom alarm on silent valves). `measure_battery` stays unset (nothing real is reported).
- Humidity: driver-wide capability list unchanged (other TRVs keep it); `measure_humidity` is removed at init for the exact
  mfr `_TZE200_rxq4iti9` only, and never when a humidity value was actually stored.
- Flow loader: `triggerDPReceived` used to retry the same failing card lookup on every DP (the poison-cache reset re-picked the
  device card). It now tries the device card, then the app card, remembers the working one, and goes quiet after both fail
  (one log line). The app.js FLOW-GUARD wrapper logs a missing card id once per method+id, then skips quietly
  (home_mode_changed / capability_value_changed_generic / device_interaction).

## A3 — `_TZ3000_bjawzodf` / TY0201 (Wilhelm Dall suggestion, 2026-10-17)
- Source: Z2M `WSD500A` (TS0201 + `_TZ3000_bjawzodf`, temperature + humidity + battery) and our DB entry P2266 (Temu round LCD).
- The exact couple is listed by one driver only: `lcdtemphumidsensor` (class sensor). No switch driver lists it.
- Why it still paired as a socket: `device_plug_smart` (class socket) has an EMPTY `manufacturerName` and productIds that include
  TY0201/TS0201 (plus other sensor pids), so Homey offers it for any manufacturer. Removing those pids is a removal and the file carries a
  2026-08-21 "do not strip" note: left for the owner (see report). Meanwhile `lib/utils/ClimateSensorClassHeal.js` fixes the class of an
  already paired device in place (socket/other -> sensor, one-shot, exact couple only) from `device_plug_smart` and `button_wireless_plug`.

## A4 — Universal Tuya 9.0.1506 crash (build 3590)
`MemwarnGuard.handle` called `process.memoryUsage()` unguarded; it throws ENOENT (`uv_resident_set_memory`) when the process is in trouble.
Now wrapped (falls back to v8 heap stats, then -1), the `memwarn` listener also catches any handler failure, and the same unguarded call
was wrapped in PerformanceOptimizer, DiagnosticReportExport and AutonomousVerificationEngine.
