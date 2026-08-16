# P148 — Peter OOM + energy/button harden (2026-08-16)

## Peter #2164 diag `96c19859-c46b-44cb-a137-1d57b5d17d83`
- Build: **9.0.537** / Homey **13.4.0**
- Fatal: **JavaScript heap out of memory** (SIGABRT), not a single JS exception
- Smoking gun in stdout: `[LIVE-DATA] segment …` loading full GitHub Pages mfs segments (sensor 1398 mfrs, socket 818, …) then Homey settings stringify → `StringBytes::WriteString` OOM
- Also noisy: `water_leak_sensor` DATA-RECOVERY blasting 22 Tuya DPs + IAS retries on sleepy devices; SOS enroll timeouts (expected when asleep)

## Fixes landed
1. `lib/dynamic/LiveDataUpdater.js` — manifest version check before segments; overlay cap 1500; store ≤180KB; clear bad stores; heap skip; 2MB/request
2. `lib/tuya/DataRecoveryManager.js` — ignore `tuya_dp_*` phantom caps; skip EF00 DP blast when no Tuya cluster; slower/fewer queries
3. `lib/battery/BatteryMasterEngine.js` — battery/% via `safeSetCapabilityValue` when available
4. `lib/device/ButtonVisual.js` — safe capability + `safeSetTimeout`
5. Button mixins — emoji stripped from logs (cleaner diags)

## Downloads roadmap doc
Read. Keep pragmatic bits (docs already exist, sacred couples). Reject Homey-impossible “try many drivers after pair” and Python auto-driver/publish pack.

## Forum (exception — human draft only)
Post #2165 already covers general pairing honesty. Extra reply should be short, Peter-focused, no roadmap walls. Draft in `reports/P148_FORUM_DRAFT_PETER.txt` — paste manually (no spam / no AI pack).
