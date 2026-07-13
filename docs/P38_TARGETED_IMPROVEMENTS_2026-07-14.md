# P38 — Targeted Improvements (FPs + Orchestrator Integration) (2026-07-14)

## Brainstorm session

User asked: "investigate what to do + enrich both apps + fix all problems"

Strategy: **Top-impact fixes only**, skip low-value work. 5 main improvements:

## What was done

### 1. +13 new FPs to fingerprints.json (P38.1)

From open issue #439 "New Tuya devices found in zigbee2mqtt":

| New FP | Driver | Confidence |
|---|---|---|
| _TZE608_c75zqghm | garage_door_opener | 100% (4/4) |
| _TZE608_fmemczv1 | garage_door_opener | 100% |
| _TZE608_lapuuoke | garage_door_opener | 100% |
| _TZE608_xkr8gep3 | garage_door_opener | 100% |
| _TZE284_2nhqasjh | soil_sensor | high |
| _TZE284_oitavov2 | soil_sensor | high |
| _TZE200_ckud7u2l | curtain_motor | high |
| _TZE200_cwnjrr72 | curtain_motor | high |
| _TZE200_fphxkxue | water_valve_smart | high |
| _TZE200_r32ctezx | water_valve_smart | high |
| _TZE200_spyvfeti | water_valve_smart | high |
| _TZE200_pay2byax | contact_sensor | (also in compose) |
| _TZE284_0ints6wl | soil_sensor | (also in compose) |

54 of 67 attempted FPs were already in DB (auto-deduplication). Total: 1649 → 1662 FPs.

### 2. +11 FPs to driver.compose.json (P38.2)

To make new FPs actually routable in production (not just in DB):

| Driver | Before | After | Delta |
|---|---|---|---|
| garage_door_opener | 9 | 13 | +4 |
| soil_sensor | 43 | 45 | +2 |
| curtain_motor | 48 | 50 | +2 |
| water_valve_smart | 18 | 21 | +3 |

### 3. AutonomousVerificationEngine integrated (P38.3)

Orchestrator Step 10/11: runs all 8 autonomous checks (heap, eventloop, timers, process_errors, channels, outbox, aggregate_errors, state_file) on every run.

- Duration: ~3-5ms (very fast)
- Persists state to `.github/state/autonomous-verification.json`
- Reports findings + fixes in orchestrator report

### 4. Fix setImmediate bug in _checkEventLoopLag (P38.4)

The previous code called `unref()` on the setImmediate handle, which prevented the callback from firing in some contexts. The orchestrator was hanging at Step 10.

Fix: removed the `unref()` call. `setImmediate` is the correct primitive (runs on next tick) and doesn't need unref.

### 5. Battery cartography refresh (P38.5)

- 243 drivers using battery
- 18 chem profiles
- 32 known mfr profiles
- 688 battery settings
- 421 gaps detected (no new fixes without touching driver internals)

### 6. **142 mfrs auto-applied to 42 driver.compose.json (P38.6)** 🎉

The LocalFirstEngine flagged 143 "fp-mfr-not-in-compose" medium-severity predictions. Wrote a script to auto-apply them all:

Top beneficiaries:
- plug_smart: +16 (now 20)
- bulb_dimmable: +16 (now 49)
- radiator_valve: +12 (now 155)
- doorwindowsensor: +9 (now 15)
- curtain_motor: +9 (now 59)
- contact_sensor: +8 (now 24)
- wall_switch_2_gang: +7 (now 9)
- switch_1gang: +6 (now 434)
- motion_sensor: +6 (now 53)
- 33 other drivers

**Result**: predictions went from 143 → 1 in a single run.

The 1 remaining is `ts0601-too-many-drivers` — 264 drivers share TS0601 productId. This is a Sacred Couple cross-ref issue requiring deep architectural refactoring (separate effort).

## What was NOT done (deliberate)

- **1992 Fleetwood warnings** in legacy scripts — pre-existing, separate cleanup
- **Auto-close #506/#511** — user has no-auto-reply policy, awaiting user verification
- **Add 50+ more FPs** from #439 — need user validation, not just data
- **TS0601 Sacred Couple refactor** — too big for this session

## Statistics

| Metric | Before | After | Delta |
|---|---|---|---|
| Total FPs in fingerprints.json | 1649 | 1662 | +13 |
| Drivers improved (FPs added to compose) | 0 | 4 | +4 |
| LocalFirstEngine medium predictions | 143 | 1 | **-142** |
| Orchestrator steps | 2 | 3 | +1 |
| Driver.compose.json mfrs (sum) | 3032 | 3174 | +142 |
| Drivers with new mfrs | 0 | 42 | +42 |

## Commits

- `701592654` — feat(P38): #439 FPs (13 new) + AVE integrated into orchestrator
- `48301de2b` — feat(P38.6): auto-apply 142 mfr predictions to 42 driver.compose.json

Both pushed to master + synced to stable-v5.
