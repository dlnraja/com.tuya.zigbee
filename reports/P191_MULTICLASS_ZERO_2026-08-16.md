# P191 — Multi-class down to zero (2026-08-16)

P190 called the last six legitimate and stopped. Pushed to actually check rather
than assert, five of the six turn out to be wrong too.

**30 → 0.**

## The four "legitimate curtain pairs" were not pairs

I had accepted `curtain_motor_shutter` + `wall_curtain_switch` as "both drivers
are curtain, so fine". Two facts kill that:

- Johan enrichment gives **TS130F** for all four manufacturers, consistently
  (Moes MS-108ZR, plus LoraTap and Nous rebrands of the same module).
- **`curtain_motor_shutter` does not declare TS130F at all.** Its productId list
  is a 50-entry accumulation containing `LCT001`, `LCT007`, `RB 185 C`,
  `lumi.weather`, `WSDCGQ01LM`, `ZG-227Z`, `TS0201` — Hue bulbs, Xiaomi weather
  stations and temperature sensors, in a window-covering driver.

So there was never a second product. It is one TS130F curtain module, correctly
in `wall_curtain_switch` (which declares exactly `TS130F`), plus a catch-all that
had swept it up and could never match it anyway.

"Both drivers are curtain-ish" was pattern-matching on driver names instead of
checking productIds.

## The dimmer pair

`_TZB210_g01ie5wu` is `TS0501B_dimmer_2` per zigbee-herdsman.
`wall_dimmer_1gang_1way` declares `TS0501B`; `wall_dimmer_tuya` does not. Same
shape as the curtains — one real home, one placement that cannot match.

## The thermostatic valve

`_TZE200_a4bpgplm` is a TRV06-family radiator valve, correctly in
`device_radiator_valve` (TS0601). I had waved through its presence in
`generic_diy` as "tolerable catch-all".

It is not tolerable. `generic_diy` is the **DIY** driver — its productIds are
`CC2530`, `CC2531`, `CC2652`, `PTVO`, `ESP32`, `EFEKTA`, `MAKER`. A commercial
Tuya valve has no business there, and the driver does not declare `TS0601`
either, so the placement could never match.

## Result

| check | before | after |
|---|---|---|
| multi-class manufacturers | 6 | **0** |
| human-reported coverage gaps | 0 | **0** |
| dual-claim conflicts | 0 | **0** |
| anti-bot regression gate | clean | clean |
| sacred-couple registry audit | 0 failures | **0 failures** |
| mfs_db alignment | clean | clean |

Three registry cases added, 6 strips applied. Every manufacturer keeps the driver
that declares its real productId.

## Two findings reported rather than changed

**`curtain_motor_shutter` is a catch-all with 50 productIds** spanning at least
four unrelated device families. Trimming it is a much larger job than these four
manufacturers and would need its own evidence pass — but it should not be allowed
to keep growing.

**Four dimmer drivers declare `class: "socket"`** while exposing `dim`:
`wall_dimmer_1gang_1way`, `dimmer_2_gang_tuya`, `dimmer_wall_plug`,
`dimmer_wall_switch`. Nineteen other dimmer drivers use `light`. Changing a
driver's class changes the tile and the applicable flow cards for **already
paired** devices, and four drivers sharing the value suggests it may have been
deliberate. That is a human call, not a sweep.

## The pattern behind all of it

Every wrong placement in P189, P190 and P191 shared one shape: **a manufacturer
in a driver that does not declare its productId**. The couple can never match, so
nothing visibly breaks — the entry just sits there widening a catch-all's claim
surface until the day the catch-all also acquires the right productId, and then a
user gets the wrong device type.

That check is now in the tooling
(`cross-source-user-report-triage.js`, the `matches` column), driven by evidence
that did not come from our own manifests.

## Commands

```bash
node tools/ci/cross-source-user-report-triage.js
node tools/ci/anti-bot-regression-gate.js
node tools/ci/audit-sacred-couple.js --from-registry
node tools/ci/dual-claim-compose-gate.js
```
