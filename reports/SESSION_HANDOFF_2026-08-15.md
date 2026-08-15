# SESSION HANDOFF — 2026-08-15 (battery-crash resume)

> Durable waiting list for agents after PC power loss. Silent forum enrichment only (T157628). Dual-app: `BOTH` vs `MASTER_ONLY`.

## Live versions / branches

| Track | Branch | Tip (at handoff) | Version target |
|-------|--------|------------------|----------------|
| Preview | `master` | `b3bd3d4be`+ | **9.0.511+** Test |
| Stable/LTS | `stable-v5` | `bc709e34e` (PR #520) | **5.12.76** Test |

**Peter is on stable** (OCR #2137: **v5.12.70 Gecrasht**). Do not assume master.

## Doctrine (locked)

1. Sacred Couple = `(mfr + pid)` — never remove mfr just because it appears in multiple drivers.
2. When in doubt on crash/IAS/SOS/contact/water/timer → tag **`BOTH`**, fix both tracks surgically.
3. **MASTER_ONLY forever** unless human promotes: AlarmPolarity smart-learn, free-scrape orchestrators, CapabilityCommandRouter parallelDiscover, mega feature managers.
4. Shared App ID warning: Publish Stable→Test can overwrite master 9.x soak.

## Done this arc (do not redo)

| Item | Where |
|------|--------|
| SOS catch abort `Promise.resolve().catch` | PR #518 → stable + master |
| DCM `auditCapabilities` guard + dynamic stub | PR #519 → stable |
| IASZoneManager `safeSetTimeout` | PR #519 → stable |
| Strip `TS0041` from door/window catchall pids | master + stable (#519) |
| SOS zoneId **10**, CIE zero-guard, safe timers, battery wake | PR #520 → **5.12.76** |
| Contact/water debounce safeSetTimeout | master + PR #521 → **5.12.77** |
| Session handoff file | eports/SESSION_HANDOFF_2026-08-15.md |
| `water_leak_sensor_tuya` IAS enroll path | PR #520 → stable (+ master already) |
| Dual-app docs + CROSS_APP “Peter = BOTH” rule | master |
| AlarmPolarityManager (contact/SOS/water invert UI) | **master only** |

## Waiting / in-flight CI

1. **Publish Stable to Test** after PR #520 → expect **5.12.76** (watch for missing-changelog fails).
2. **Auto-Publish master** after SOS/water timer guards → expect Test **≥ 9.0.511**.
3. Confirm Test channel is not stuck on **5.12.70** for users who want 9.x.

## Waiting list (next agent — priority order)

### P0 BOTH (crash / silent devices)

- [x] Harden `drivers/contact_sensor/device.js` + `sensor_contact_water` bare `this.homey.setTimeout/clearTimeout` → `safeSetTimeout` (**master + stable**).
- [ ] Hunt Gmail `ReferenceError: capability is not defined` (stack truncated) — still WATCH.
- [ ] Re-fetch Gmail diags after next cron; process new UUIDs only.
- [ ] Verify Peter devices after 5.12.76: SOS press, battery not `?`, water, Smartbutton not Contactalarm.

### P1 Forum silent backlog (master first; BOTH if crash)

| Post | Issue | Status |
|------|--------|--------|
| #2137 Peter | Crash + SOS/water/contact/smartbutton | Crash path fixed; **await user update to 5.12.76** |
| #2134 Peter | SOS battery `?`, water, invert | Stable 5.12.76 SOS/battery; invert via checkbox on stable / AlarmPolarity on master |
| #2131 TBoy `_TZ3210_imaccztn` TS0004 | Gang flows | Relay → gang onoff (verify still OK on 9.x) |
| #2133 PresentSky `_TZE284_m1cvyneb` | Wall dimmer as climate | Re-pair on 9.x / `wall_dimmer_tuya` |
| #2135 Royce `_TZE28C1000000_jtbgusdc` | Avatto 2-gang dimmer | Already routed — verify |
| #2132 Royce presence settings | Manual params | MASTER_ONLY settings enrichment |
| #2130 Kanbros `_TZ3000_w5xawfcq` TS0002 | 2-gang touch | Confirm FP on switch_2gang |
| #2129 Welshsmarthome | ClickSmart dual socket | FP add if missing |
| GH #513 Finnamu ZT08 | Temp×10 / battery jump / temp=0 | Follow-up on `climate_sensor_zt08` SmartDivisor |
| GH #420 radar `_TZE204_clrdrnya` | No data | Auto-fix loops failing — investigate |

### P2 Process

- [ ] Keep `REPLY_TOPICS=140352` only; never auto-post AI on forum.
- [ ] Prefer not Publish Stable→Test while soaking master 9.x unless Peter needs 5.12.76 urgently (he does).
- [ ] After battery resume: `git fetch`; read this file; continue unchecked boxes.

## Key commands

```bash
npm run diag:gmail
npm run forum:silent-scan
node scripts/ci/diag-investigate-orchestrator.js --full --focus=2137
node tools/ci/classify-dual-app-change.js --msg "..."
gh run list --branch stable-v5 --limit 5
gh run list --branch master --limit 5
```

## Diag UUIDs (Peter era)

- `634f7b19-6909-4485-b35c-dd199d3a09d2` — 5.12.70 crash (processed)
- `f1e5b12d-5f69-4311-aaa7-b8bef967667c` — 9.0.434 SOS catch (processed)
- `9b0b5d26-a0d2-4309-be1d-7c8354f98930` — apps-api 404 (Gmail only)
- `4f83ce7e-…` — not found in APIs (ignore unless Gmail hits)

## Transcript

Primary chat: [Peter dual-app crash arc](6eb1e32a-de4c-43bd-bb0a-cffbe381b9a3)

Generated: 2026-08-15T13:30:00Z
