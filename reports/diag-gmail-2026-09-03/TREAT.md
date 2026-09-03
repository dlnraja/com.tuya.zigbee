# Diag / crash / Gmail treat — 2026-09-03 (P2412 / P2413)

Silent only. No forum posts.

## Mailbox (Gmail MCP + local fetch)
| Item | Result |
|------|--------|
| Tip master | Build **#3109** testing (**9.0.807**) |
| Tip stable | Build **#70** testing |
| Crashes | `Invalid Driver ID: light` @ 9.0.746 → **P2373** soft-fail (already in tip ≥ patch) |
| Crashes | `ZG9101SAC_HP` @ 9.0.730/743 → **P2351** soft-fail |
| Crash gate | `check:gmail-crashes` → **verdict ok** (unknown=0) |

## Live device diags (Homey tip emails)
| Log ID | App | Symptom | Fix |
|--------|-----|---------|-----|
| `4a918200-…` | 9.0.807 | Moes #533 — DP1 ACK, motor silent | **P2412** dual TX DP2→DP1 + invert |
| `03d33fcc-…` | 9.0.807 | Moes still not moving — DP2 mid + DP1 down ACK | same + mid-slider dual path |
| `73c6ef18` / `a9e4d712` | earlier | idle-stop race | P2393/P2399 (already tip) |
| `0e28d470` | 9.0.781 | presence radar DP117 | P2403 DIY recursion (monitor) |
| `c5165a37` | 9.0.797 | PIR mmwave | class monitor |

## GitHub
- Open **#533** Moes `_TZE204_5slehgeo`+`TS0601` → `curtain_motor` — root cause: tip only sent DP1 or DP2 alone; Z2M `legacy.tz.moes_cover` uses inverted DP2 + DP1 state + `forceTimeUpdates`.

## Code shipped this cycle (local → publish)
| Patch | Track | What |
|-------|-------|------|
| **P2412** | BOTH | Moes ZTS dual TX DP2→DP1 + Z2M invert + time sync + moes_control_invert |
| **P2413** | BOTH | SafeCapabilityMixin Nightly P58 fix |
| **P2414** | BOTH | presence DP2≠humidity (c5165a37); version-health P139 soft-expect |
| **P2407–P2411** | mixed | WiFi local-first discovery/auth/max LAN |

## Dual-app
P2412–P2414 + WiFi BOTH modules → **BOTH**. MASTER_ONLY: mesh advertising UX chips.