# P203 — Deep Gmail/Homey diag triage + fixes (2026-08-16)

## Sources
- Homey app diags: `96c19859` (9.0.537 OOM), `f20dc4f0` (9.0.491 m1cvyneb), `634f7b19` (5.12.70 legacy SOS/audit)
- Fresh Gmail CI artifact `31974051072` (100 emails; 2 new Diagnostics Reports)

## Cross-ref → fixes

| Finding | Root cause | Fix |
|---------|------------|-----|
| Wall dimmer `_TZE284_m1cvyneb` running as `climate_sensor` | Stale pairing; FP already only on `wall_dimmer_tuya` | Runtime `_warnIfMisattributedDriver()` → setUnavailable + re-pair hint |
| Heap OOM @ 9.0.537 during SOS/IAS/water_leak retries | Sleepy device retry storm (`reageert niet`) | IAS early abort after 2 offline misses |
| EF00 DP request timers | `homey.setTimeout` + raw `clearTimeout` in cleanup | `safeSetTimeout` / `safeClearTimeout` |
| SOS `.catch` / auditCapabilities on 5.12.70 | Already fixed in tip 5.12.83 / master | No code change; confirm soak |
| `battery_anomaly_detected` in fresh Gmail | Flow trigger signal, not crash | No action |

## Test
`test/critical/p203-diag-email-fixes.test.js`
