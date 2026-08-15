# MULTI-SOURCE FORUM INVESTIGATION — 2026-08-15

> Silent enrichment only (T157628). No Homey Community posts.
> Sources: forum silent scan · free-scrape · Homey diags · Gmail crash gate · GH issues · GH Pages · CI

## Source matrix (executed)

| Source | Result |
|--------|--------|
| Forum silent multi-scan (7 topics) | 117 actionable · **0 new FPs** |
| Free-scrape focus 2137/2138 | 14/14 OK (direct + jina) · 4 diag UUIDs · 38 sacred couples |
| Homey diag artifacts | Peter **5.12.70** crashes confirmed (auditCapabilities / `.catch` / `setTimeout`) |
| Gmail crash-pattern-gate | **verdict ok** · watch `[]` · all known fatals `fixed_*` |
| Gmail GHA | last success `31886079596` |
| GH Issues open | **#513 only** (`_TZE284_hodyryli` + TS0601) |
| GH Pages | live https://dlnraja.github.io/com.tuya.zigbee/ + dashboards.html |
| FP collision CI | was FAIL (`8eazvzo6` climate∩switch) → **fixed** (strip from climate) · **0 new** |
| Syntax Check | success (post Buffer fix) |
| Auto-Publish 9.0.518 | in progress at report time |

## Forum T140352 — recent Sacred Couples (post ≥2099)

| Post | Couple | Driver hit | Action |
|------|--------|------------|--------|
| #2099 VicBehrens | Moes / TS0014 | multi (pid) | watch; needs exact mfr |
| #2106 Beck51 | `_TZE284_pcdmj88b`\|TS0601 | `thermostatic_radiator_valve` | OK in app |
| #2112 Nigel | `_TZE200_ka8l86iu`\|TS0601 | `presence_sensor_radar` | OK |
| #2115 Thierry | `_TZE204_dhotiauw`\|TS0601 | `din_rail_meter` | OK |
| #2120/#2132 Royce | `_TZE204/_TZE284_clrdrnya`\|TS0601 | `presence_sensor_radar` | OK (+ relay map) |
| #2122/#2125 blutch | HOBEIAN soil TS0203 | soil path | OK (prior fix) |
| #2131 TBoy | TS0004 4ch relay | `relay_board_4_channel` (+pid noise) | OK if mfr matches |
| #2133/#2138 PresentSky | `_TZE284_m1cvyneb`\|TS0601 | `wall_dimmer_tuya` | FP OK; diag `f20dc4f0` found in Athom build **2802 / v9.0.491** |
| #2135 Royce Avatto | `_TZE28C1000000_jtbgusdc`\|TS0601 | `dimmer_2_gang_tuya` | OK |
| #2137 Peter | SOS / contact / water / crash | stable crash class | tell **≥5.12.81** |
| Johan #5491 | `_TZE284_nt4pquef` / `_TZE284_aao3yzhs` | climate / soil | OK |

Other topics (146735, 26439, 89271, 43287, 157628, 157859): scanned READ-ONLY; no new FPs; RF coexistence education only.

## GH Issue #513

- Couple: `_TZE284_hodyryli` + `TS0601`
- Present in **`drivers/climate_sensor_zt08`** (dedicated ZT08 driver)
- User was on **9.0.328** → unknown unit likely pre-ZT08 driver
- Status: awaiting user re-pair on current Test (**≥9.0.518**)
- Silent: no forum reply; GH comment optional for verification

## Email / crash truth (Peter era)

From `634f7b19-…` + `_crash-samples.json` (app **5.12.70**):

1. `auditCapabilities is not a function` → fixed #519
2. `undefined.catch` (SOS listeners) → fixed #518
3. `undefined.setTimeout` → fixed #521/#522
4. `capability is not defined` → fixed_p136 (`generic_tuya`)

Stable Test **5.12.81** carries these. Master has same class + Buffer/L99 CI fixes.

## CI / Pages

| Check | Status |
|-------|--------|
| Fingerprint collisions | **0 new** after climate strip `8eazvzo6` |
| Unified CI prior fail | same collision — will green on next push |
| Device Finder Pages deploy | success |
| Dashboards page | 6 dashboards linked |

## PresentSky root cause (#2133 / #2138 diag f20dc4f0)

- User message: “Wall dimmer wrongly recognized as temperature sensor”
- Couple **only** in `wall_dimmer_tuya` now (not in `climate_sensor` / `app.json`)
- Live log still shows `Driver:climate_sensor` → **stale pair** from earlier mis-route
- Action: remove device → re-add on Test **≥9.0.518** → must land on Wall Dimmer (silent; no forum paste)

## Remaining (no invent)

1. PresentSky: re-pair after Test update (FP already correct)
2. Peter: update Homey Test to **≥5.12.81**; polarity for inverted contacts; SOS/smartbutton if still broken → new diag
3. #513: user verify on latest Test (`climate_sensor_zt08`), then close
4. Shared App ID Test flip master↔stable (ops)
5. Local Gmail IMAP optional (GHA already green)

## Doctrine

Sacred Couple · BOTH for crashes · silent forum · no AI paste · surgical dual-app only.
