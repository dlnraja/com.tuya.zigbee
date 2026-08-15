# SESSION HANDOFF — 2026-08-15 (battery + Cursor timeout resume)

> Durable waiting list. Silent forum enrichment (T157628). Dual-app: `BOTH` vs `MASTER_ONLY`.
> **Resume rule:** Peter may be on **stable** — when in doubt, improve **both** apps surgically.

## Live versions

| Track | Branch | Target Test version |
|-------|--------|---------------------|
| Preview | `master` | **9.0.515+** (capability crash + radar TZE284) |
| Stable | `stable-v5` | **5.12.81** (#525 capability + radar; was 5.12.80 on Test) |

Peter OCR #2137 = **v5.12.70 Gecrasht** → update Homey to **≥5.12.81** (Test channel).

## Done (do not redo)

| Item | PRs / notes |
|------|-------------|
| SOS catch abort | #518 |
| DCM auditCapabilities + IAS safe timers + TS0041 door misroute | #519 → 5.12.75 |
| SOS zoneId 10 + CIE zero-guard + water_tuya IAS | #520 → 5.12.76 |
| Contact/water debounce safe timers | #521 → 5.12.77 |
| Athom changelog keys + ZT08 safe timers | #522 → 5.12.78 |
| P102 republish after socket hang up | #523 → 5.12.79 |
| 5.12.80 + tighter Zigbee combo budget | #524 ✅ Test |
| **generic_tuya `capability is not defined`** | master 9.0.515 + **#525 → 5.12.81** |
| **MTG `_TZE284_clrdrnya` relay DP map** | master + #525 (GH #420 family) |
| ZT08 timers + SmartDivisor KNOWN_DIVISORS | BOTH |
| Dual-app Peter=BOTH rule | `docs/rules/CROSS_APP_PROMPT_RULES.md` |
| AlarmPolarity | **MASTER_ONLY** (not on stable) |

## Diag tooling (smoke 2026-08-15)

| Check | Result |
|-------|--------|
| `diag:self-test` | **27/27 scripts OK**, 8/8 workflows |
| `gmail-crash-pattern-gate` | verdict **ok**; `capability_ref_undefined` **fixed_p136**; watch only `onDeleted_null` |
| free-scrape focus 2137 | OK; diags harvested (Peter 634f7b19 = v5.12.70) |
| forum silent multi-scan | OK; **0 new FPs** |
| `diag:gmail` local | credentials missing locally (use GHA secrets) |

## Waiting list

### P0 BOTH
- [x] Publish Stable **5.12.80** (Athom hang fixed)
- [ ] Confirm Publish Stable→Test **5.12.81** (#525) after merge
- [x] Gmail `capability is not defined` — **fixed** (`generic_tuya._autoMapDP`)
- [ ] Shared App ID: stable↔master Test overwrite — expect flip after each track publish
- [ ] Gmail local secrets / CI `diag:gmail` refresh when secrets available
- [ ] `onDeleted_null` still WATCH in crash gate

### P1 Forum (verify / silent)
| Post | Couple | Status |
|------|--------|--------|
| #2130 Kanbros | `_TZ3000_w5xztuy7` TS0002 | **OK** |
| #2131 TBoy | `_TZ3210_imaccztn` TS0004 | **OK** |
| #2133 PresentSky | `_TZE284_m1cvyneb` | **OK** — re-pair |
| #2135 Royce | `_TZE28C1000000_jtbgusdc` | **OK** |
| #2137 Peter | update to **≥5.12.81** | tell user |
| GH #513 ZT08 | pairing + divisors + timers | **done** on BOTH |
| GH #420 radar | `_TZE204_clrdrnya` | **CLOSED**; TZE284 map fixed |

### Doctrine
1. Sacred Couple = mfr+pid
2. Doubt on crash/IAS/SOS/contact/water/timer → **BOTH**
3. Never full-tree copy master→stable
4. Never auto-post forum AI

## Commands
```bash
git fetch origin master stable-v5
gh run list --branch stable-v5 --limit 5
npm run diag:self-test
npm run check:gmail-crashes:json
npm run forum:silent-scan
```

Transcript: [Peter dual-app arc](6eb1e32a-de4c-43bd-bb0a-cffbe381b9a3)
Updated: 2026-08-15T15:20Z (resume after extension host timeout; PR #525)
