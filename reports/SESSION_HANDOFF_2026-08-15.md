# SESSION HANDOFF — 2026-08-15 (battery + Cursor timeout resume)

> Durable waiting list. Silent forum enrichment (T157628). Dual-app: `BOTH` vs `MASTER_ONLY`.
> **Resume rule:** Peter may be on **stable** — when in doubt, improve **both** apps surgically.

## Live versions

| Track | Branch | Target Test version |
|-------|--------|---------------------|
| Preview | `master` | **9.0.512+** |
| Stable | `stable-v5` | **5.12.77** (PRs #518–#521) |

Peter OCR #2137 = **v5.12.70 Gecrasht** → tell him to update to **≥5.12.77**.

## Done (do not redo)

| Item | PRs / notes |
|------|-------------|
| SOS catch abort | #518 |
| DCM auditCapabilities + IAS safe timers + TS0041 door misroute | #519 → 5.12.75 |
| SOS zoneId 10 + CIE zero-guard + water_tuya IAS | #520 → 5.12.76 |
| Contact/water debounce safe timers | #521 → 5.12.77 |
| Dual-app Peter=BOTH rule | `docs/rules/CROSS_APP_PROMPT_RULES.md` |
| AlarmPolarity | **MASTER_ONLY** (not on stable) |

## Waiting list

### P0 BOTH
- [ ] Confirm Publish Stable→Test shipped **5.12.77** (watch changelog fails)
- [ ] Confirm master Auto-Publish **≥9.0.512**
- [ ] Gmail `capability is not defined` — still WATCH
- [ ] Push any local `ahead` handoff commits if push was interrupted
- [ ] ZT08 bare `homey.setTimeout` → safe timers (in progress on master)

### P1 Forum (verify / silent)
| Post | Couple | Status |
|------|--------|--------|
| #2130 Kanbros | `_TZ3000_w5xztuy7` TS0002 | **OK** in `switch_2gang` |
| #2131 TBoy | `_TZ3210_imaccztn` TS0004 | **OK** in `relay_board_4_channel` |
| #2133 PresentSky | `_TZE284_m1cvyneb` TS0601 | **OK** in `wall_dimmer_tuya` — re-pair |
| #2135 Royce | `_TZE28C1000000_jtbgusdc` | **OK** in `dimmer_2_gang_tuya` |
| #2137 Peter | update to 5.12.77 | await user |
| GH #513 ZT08 | SmartDivisor + timers | continue |
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
Updated: 2026-08-15T13:48Z (after Cursor deadline_exceeded)
