# AggregateError and the `energy_` setting prefix

Verdict: **refuted** as the cause of Athom `AggregateError`.

`energy_source` is a real validator defect. homey-lib 4.4.1 (`node_modules/homey-lib/lib/App/index.js`, `RESERVED_SETTING_PREFIXES`) warns when a setting id starts with `homey:`, `zw_`, `zb_`, `mtr_`, `thread_`, `zone_`, `energy_`, `satellite_mode_`, or `homekit_`. The warning is `console.warn`, not a thrown error, which is why a local `homey app validate --level publish` can exit 0 and still print `drivers.<id> invalid setting id: energy_source`. That defect is renamed to `tuya_energy_source` and blocked by `npm run check:p3285`. It does not separate the refused Athom builds from the accepted ones.

Counts below are `git grep` of the setting id `"id": "energy_source"` in `drivers/*/driver.compose.json` and `driver.settings.compose.json` at the commit that was published. Driver ids `energy_meter_3ch_bidirectional`, `energy_meter_3phase`, and `energy_meter_din` match the prefix `energy_` and are not settings. No other reserved prefix occurred as a setting id on the compared commits.

## Evidence matrix

| Version | Athom build | Result | Commit | `energy_source` files | Payload drivers | What the ledger says changed |
| --- | --- | --- | --- | --- | --- | --- |
| 9.0.1365 | 3483 | AggregateError | `bcbc9a7c4e` | 0 | not recorded | first build with `deprecated: true` on `wall_remote_4_gang`; 9.0.1364 / #3482 reached Test |
| 9.0.1599 | 3682 | Test | `11ca32b731` | 0 | 347 | payload accepted, draft then Test |
| 9.0.1602 | 3684 | AggregateError | `49be689153` | 93 | 361 | 14 never-published driver ids added over the 347-driver Test set |
| 9.0.1603 | 3685 | AggregateError | `cc97563484` | 103 | 353 | 6 never-published ids still released; settings, flow cards, images, and assets matched the accepted tree |
| 9.0.1604 | 3686 | Test | `83fa78e9b4` | 103 | 347 | same driver set as 9.0.1599, hold list restored |
| 9.0.1606 | 3688 | AggregateError | `e2120e3367` | 103 | 347 + released holds | P3095 bisect, held drivers released |
| 9.0.1615 | 3697 | Test | `86628bcc39` | 103 | 347 set | `release_held=none`; ledger says #3687–#3696 came from released held drivers |
| 9.0.1616 | not stored | AggregateError | `8725d07254` | 103 | 347 + 1 released id | isolated `water_leak_aoyan_ay222z` |
| 9.0.1618 | not stored | AggregateError | `2718d08ef3` | 103 | 347 + 2 released ids | `water_leak_blitzwolf_bw_is9` and `sauna_thermostat_ae5503` |

Source of the result column: `docs/knowledge/athom-publish-outcomes.jsonl`. The setting was introduced by `85ddc0b480` (2026-10-26, P3067, 92 files). Its parent `6ecb7d1d82` has 0. Every AggregateError in this table from 9.0.1365 through 9.0.1599 is therefore before the setting existed.

## 347 / 348 boundary

The figure 347 is the last accepted payload driver count (#3682, #3686, #3697). It is not a count of drivers that carry `energy_source`. That count moved 0 → 92 → 93 → 103 and then stayed at 103 on both sides of the boundary. The refused payloads at 353 and 361 drivers have the same setting the accepted 347-driver payload has. Releasing one never-published driver on top of that accepted set was enough to get AggregateError again (9.0.1616), with no change to the setting count.

Build #3699 is not a row in the outcomes ledger. #3697 is 9.0.1615 and is the last numbered Test build there. The next recorded AggregateError versions, 9.0.1616 and 9.0.1618, still have 103 `energy_source` files, the same number as #3697.

## Other AggregateError candidates

These are the candidates the same ledger actually distinguishes. They are not a claim that any one of them is the only server-side check.

| Candidate | Evidence | Relation to AggregateError |
| --- | --- | --- |
| Never-published driver id in the payload | 347-driver set accepted three times; 353, 361, and single released hold ids refused | Strongest correlation in this file |
| `deprecated: true` | #3483 refused, #3482 and the revert reached Test, no `energy_source` yet | Explains that one pair, not the later streak |
| Manifest byte size | Accepted 9.0.1604 app.json is 3,328,185 bytes; refused 9.0.1616 manifest is recorded at 3,110,579 bytes | Does not rise with the failures |
| Flow card ids, images, assets | 9.0.1603 note: those diffs were clean against accepted 9.0.1599 | Not the delta of that refusal |
| Identical bytes, opposite result | 9.0.1424 AggregateError and 9.0.1425 Test are recorded as the same content | At least one historical AggregateError was flaky |
| Socket hang up | Many `processing_failed` rows, including 9.0.1596–9.0.1598 at 347 drivers | Different `stateMeta`; not AggregateError |
| Diagnostic staging path | Run 43487854250 wrote `/tmp/homey-diag-catalogue` (372 drivers) and the size gate read `/tmp/homey-publish-temp` | Died before upload. `athom-final` had no build for 9.0.1619, so this run never became an AggregateError |

Reserved prefixes stay blocked because the SDK rejects them. The Athom accept/refuse split in this ledger follows the published driver set, not the presence or the count of `energy_source`.
