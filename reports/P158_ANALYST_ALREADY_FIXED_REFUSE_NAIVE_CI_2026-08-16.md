# P158 — Analyst “already fixed” pack: agree tip, refuse naive CI (2026-08-16)

## Agree
- P148 LiveData OOM + sleepy EF00 skip + safe battery path are **in tip** (now **9.0.543**, not only 9.0.540).
- `PerformanceOptimizer` + `LiveDataUpdater` + `DataRecoveryManager` + SafeCapability/SafeTimer are real.

## Refuse (do not implement as proposed)
| Proposal | Why |
|----------|-----|
| New `memory-check.yml` with `find … *.json > 2MB → fail` | Breaks on `mfs_db` / `product-reference` (ignored, OK). We already have **smart** `homey-heap-json-gate.js`. |
| Skip DP if `class === 'sensor' \|\| alarm_motion` | Breaks Tuya MCU sensors; tip uses IAS-without-EF00 / mapped-DP rules instead. |

## Done instead
- Wire `node tools/ci/homey-heap-json-gate.js` into `syntax-check.yml` + `auto-publish-on-push.yml`.
- data/ sizes (local): product-reference 9.06MB + mfs_db 6.88MB = **homeyignored**; fingerprints tiny.

No forum paste.
