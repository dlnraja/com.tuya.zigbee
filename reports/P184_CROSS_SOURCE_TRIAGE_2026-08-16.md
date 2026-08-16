# P184 — Cross-source triage of real user reports (2026-08-16)

Cross-referencing every external signal available from here — GitHub issues and
pull requests, the Homey community forum, and the Gmail crash diagnostics —
against what the drivers actually claim. Read-only throughout; nothing was posted
to the forum, per the silent-first mandate.

## What was reachable

| Source | State | Volume |
|---|---|---|
| GitHub (`gh`, authenticated as dlnraja) | live | 100 issues, 40 pull requests |
| Homey forum (topics 140352, 26439, 89271, 146735) | live, read-only scan | 1 gap, 205 multi-driver mentions |
| Gmail crash diagnostics | cached (`gmail-crash-patterns.json`) | 8 manufacturers |
| `mfs_db`, `z2m_cache`, driver manifests | local | 431 drivers |

## Headline result

**Every Zigbee identity a real user reported is claimed by a driver.**

- 1,347 manufacturer names appear somewhere across the corpus
- 194 of those appear in a human-written report rather than a bulk crawler dump
- **0** of those 194 are unclaimed by any driver
- 14 unclaimed names remain, all harvested by the `[Auto]` community-sync issues —
  candidates for enrichment, not defects

Separating human reports from bot dumps was the whole difficulty. A single
`[Auto] 2160 new fingerprints from community` issue contributes more manufacturer
names than every human bug report in the project's history combined, so mixing
them makes the coverage question unanswerable.

The forum scan reported exactly one gap: `_TZE200_ABC123` on T140352 post #2165,
posted by dlnraja as a worked example. Not a device.

## Individual reports checked

| Issue | Symptom | Status now |
|---|---|---|
| #506 | temperature/humidity sensor recognised as **Air Purifier** (`_TZ3000_fllyghyj` + TS0201) | routed to `climate_sensor`; fixed by merged PR #509 |
| #513 | ZT08 climate sensor pairs as *Unknown Zigbee unit* (`_TZE284_hodyryli` + TS0601) | routed to `climate_sensor_zt08`; reporter confirmed values correct on 9.0.533 |
| #516 | humidity displayed divided by 10, v9.0.491 | no driver hardcodes a humidity divisor; `SmartDivisorManager` defaults humidity to 1 with per-manufacturer ×10 overrides. Already addressed |
| #388 | rain sensor recognised as water leak sensor (TS0207) | separate drivers exist; dual-claim gate reports no conflict |

There are **no open issues** on the repository.

A note on #516 worth recording, because it explains why the humidity class of bug
keeps returning: `VALID_RANGES` for `measure_humidity` is 0–100, so a wrongly
applied ÷10 produces 5.5% — which passes range validation. The sanity filter
structurally cannot catch this one. The discriminator has to be the raw
magnitude, not the result: a raw integer at or below 100 means divisor 1, above
100 means ÷10. That is what `smartDivisorDetect` already does, and why the fix
must stay in the divisor layer rather than in per-driver transforms.

## New tool

`tools/ci/cross-source-user-report-triage.js` (also wired into
`weekly-sovereign-loop.js`):

- collects identities from GitHub (`--fetch` refreshes via `gh`), the cached
  forum scan and the Gmail diagnostics
- classifies each mention as human-reported or bulk-harvested
- resolves each against the driver manifests
- fails under `--strict` when a **human-reported** manufacturer has no driver

That last point makes today's clean result durable: if a user reports a device
the app does not claim, CI says so instead of it waiting in an issue queue.
Registered as rule Z9 in the enforcement matrix.

## Secondary finding: 30 manufacturers span several device classes

The most common user complaint in the forum reports is "my device paired as the
wrong type". The dual-claim gate finds zero conflicts, which is correct — these
manufacturers appear in several drivers with **non-intersecting** productId sets,
exactly the legitimate case the sacred-couple doctrine describes. None of them
can cause a mispairing today.

They are still the right shortlist to check first when such a report arrives:

| manufacturerName | classes | example split |
|---|---|---|
| `_tz3210_jaap6jeb` | light / sensor | `bulb_rgbw` (TS0505B) vs `contact_sensor` (TS0203) |
| `_tz3000_n2egfsli` | button / sensor | `button_wireless_2` vs `contact_sensor` |
| `_tz3000_g9g2xnch` | button / socket | `smart_knob` (TS004F) vs `switch_1gang` (TS0001) |
| `_tzb210_g01ie5wu` | light / socket | `wall_dimmer_tuya` vs `wall_dimmer_1gang_1way` |
| `_tz3000_m0vaazab` | other / socket | `zigbee_repeater` (TS0207) vs `remote_button_wireless_usb` |

The full list of 30 is in `reports/CROSS_SOURCE_USER_TRIAGE.md`. Deliberately not
auto-changed: each split needs a real product check, and the last time identity
data was bulk-edited it produced the 94-commit strip-and-restore loop documented
in P183.

## Commands

```bash
node tools/ci/cross-source-user-report-triage.js --fetch
node tools/ci/cross-source-user-report-triage.js --strict
node tools/ci/rules-enforcement-matrix.js
```
