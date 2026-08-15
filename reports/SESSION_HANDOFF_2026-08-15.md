# SESSION HANDOFF — 2026-08-15 (battery + Cursor timeout resume)

> Durable waiting list. Silent forum enrichment (T157628). Dual-app: `BOTH` vs `MASTER_ONLY`.
> **Resume rule:** Peter may be on **stable** — when in doubt, improve **both** apps surgically.

## Live versions

| Track | Branch | Target Test version |
|-------|--------|---------------------|
| Preview | `master` | **9.0.515** (capability crash + radar TZE284) |
| Stable | `stable-v5` | **5.12.80** on Test (#524) ✅ |

Peter OCR #2137 = **v5.12.70 Gecrasht** → update Homey to **≥5.12.80** (Test channel).

## Done (do not redo)

| Item | PRs / notes |
|------|-------------|
| SOS catch abort | #518 |
| DCM auditCapabilities + IAS safe timers + TS0041 door misroute | #519 → 5.12.75 |
| SOS zoneId 10 + CIE zero-guard + water_tuya IAS | #520 → 5.12.76 |
| Contact/water debounce safe timers | #521 → 5.12.77 |
| Athom changelog keys + ZT08 safe timers | #522 → 5.12.78 (draft OK; Athom processing_failed) |
| P102 republish after socket hang up | #523 → 5.12.79 (Athom hung again) |
| 5.12.80 + tighter Zigbee combo budget | #524 |
| ZT08 safe timers on master | pushed; Auto-Publish OK (Test ~9.0.514) |
| Dual-app Peter=BOTH rule | `docs/rules/CROSS_APP_PROMPT_RULES.md` |
| AlarmPolarity | **MASTER_ONLY** (not on stable) |

## Waiting list

### P0 BOTH
- [x] Confirm Publish Stable→Test shipped **5.12.80** (78/79 Athom `processing_failed`; 80 OK)
- [x] Master Auto-Publish OK (**9.0.514** was on Test; shared App ID → **5.12.80** now on Test)
- [ ] Gmail `capability is not defined` — still WATCH
- [ ] Shared App ID: stable→Test overwrote master Test — next master publish will flip back
- [x] Athom hang resolved via 5.12.80 + tighter Zigbee combo budget (#524)

### P1 Forum (verify / silent)
| Post | Couple | Status |
|------|--------|--------|
| #2130 Kanbros | `_TZ3000_w5xztuy7` TS0002 | **OK** in `switch_2gang` |
| #2131 TBoy | `_TZ3210_imaccztn` TS0004 | **OK** in `relay_board_4_channel` |
| #2133 PresentSky | `_TZE284_m1cvyneb` TS0601 | **OK** in `wall_dimmer_tuya` — re-pair |
| #2135 Royce | `_TZE28C1000000_jtbgusdc` | **OK** in `dimmer_2_gang_tuya` |
| #2137 Peter | update to **5.12.80** | tell user |
| GH #513 ZT08 | SmartDivisor + timers | dedicated driver + KNOWN_DIVISORS + timers BOTH |
| GH #420 radar | `_TZE204_clrdrnya` | investigate auto-fix fail |

### Doctrine
1. Sacred Couple = mfr+pid (one mfr → many devices OK)
2. Doubt on crash/IAS/SOS/contact/water/timer → **BOTH**
3. Never full-tree copy master→stable
4. Never auto-post forum AI

## Commands
```bash
git fetch origin master stable-v5
gh run list --branch stable-v5 --limit 5
gh run list --branch master --limit 5
npm run diag:gmail
npm run forum:silent-scan
```

Transcript: [Peter dual-app arc](6eb1e32a-de4c-43bd-bb0a-cffbe381b9a3)
Updated: 2026-08-15T15:00Z (diag resume: capability crash + radar)
