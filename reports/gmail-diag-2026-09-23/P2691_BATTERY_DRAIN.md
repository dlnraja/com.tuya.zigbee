# TREAT — Bastien pile drain (P2691) 2026-09-23

Silent. Dual-app BOTH + Bastien.

## Signal

User: new Bastien diags + batteries empty too fast.
Gmail newest Bastien Diagnostics Report: **885a9901** (2026-09-22T22:05Z) on tip **v1.0.60** (before P2685/P2686).

## Root cause (log)

`_TZ3000_dzwgk7e2` + `button_wireless_2` on every press:
1. `readAttributes` powerCfg **EP1** → Timeout (~3s)
2. `readAttributes` powerCfg **EP2** → Timeout (~3s)
3. EF00 `dataQuery` DP4/15/101/3 fail (`dp is an unexpected property`)
4. Brief `measure_battery=0` then restore store 100%

Contre quoi: awake-window TX storm burns CR2032; latency on lamp Flows.

## Fix shipped (P2691)

| Change | Track |
|--------|-------|
| `shouldSkipSleepyRemoteBatteryTx` — sceneSwitch / TS004x / noEf00Tx / skipBatteryReporting | BOTH + Bastien |
| `ButtonDevice._readBatteryWhileAwake` uses class skip | BOTH + Bastien |
| `button_wireless_2` forces `skipBatteryReporting` + `batteryEpOnly:1` | BOTH + Bastien |
| `famkxci2` + `ts004RemoteFallback` seal skip | BOTH + Bastien |
| Announce path uses same helper | BOTH + Bastien |

## Tips

- Bastien **1.0.67**
- Universal **9.0.1197**
- Stable **5.12.310**

User: update Bastien Test ≥1.0.67 (prefer re-pair remotes once so store/profile settle). No forum POST.
