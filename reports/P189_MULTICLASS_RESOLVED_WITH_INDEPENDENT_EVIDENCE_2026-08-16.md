# P189 — The multi-class manufacturers, resolved on independent evidence (2026-08-16)

This closes the item I deferred twice: the manufacturers appearing in drivers of
different device classes, and whether that is legitimate.

**It also corrects P185, which got the answer wrong.**

## Why P185 was wrong

P185 concluded "26 of the 30 are legitimate", reasoning that mfs_db lists several
modelIds per manufacturer and each driver matches a different one.

P188 exposed the flaw while investigating something else:
`scripts/automation/mfs-aggregator.js` builds mfs_db partly from a `local`
source, and `fetchLocal()` reads `productIds[0]` out of **every driver compose
that lists the manufacturer**. So mfs_db learns a manufacturer's modelIds from
the very placements being audited. Using it to validate those placements is
circular.

The tell was there: every one of those records carries `sources: ["local", …]`.

## The independent source

`data/z2m_herdsman_cache.json` is a snapshot of zigbee-herdsman-converters —
1,225 devices, 1,385 manufacturers, fetched from upstream. It never saw our
manifests. For each manufacturer it gives the vendor, model and a plain-language
description of what the device actually is.

22 of the 29 remaining multi-class manufacturers are in it. The verdict reverses:

| manufacturerName | zigbee-herdsman says it is | but also lived in |
|---|---|---|
| `_TZ3000_3zofvcaa`, `_lqb7lcq9`, `_pvlvoxvt`, `_TZ3210_8n4dn1ne`, `_urjf5u18` | **2 gang 2 usb wall outlet** (TS011F) | `climate_sensor` |
| `_TZ3000_5k5vh43t`, `_gszjt2xx`, `_misw04hq`, `_nkkl7uzv`, `_nlsszmzl`, `_ufttklsz`, `_wlquqiiz` | **Repeater** (TS0207) | `motion_sensor` |
| `_TZ3000_m0vaazab` | **Repeater** | `remote_button_wireless_usb` |
| `_TZE200_2imwyigp` | **3 gang switch** (MG-ZG03W) | `contact_sensor` |
| `_TZ3000_g9g2xnch` | **2-in-1 dimming and scene remote** (YSR-MINI-Z) | `switch_1gang` |
| `_TZ3000_r0o2dahu` | **Wireless switch, 6 buttons** (TS004F) | `switch_1gang` |
| `_TZ3000_fa9mlvja` | **Smart button** (IH-K663) | `wall_switch_4_gang` |
| `_TZ3000_ixla93vd` | **Smart knob** (ERS-10TZBVK-AA) | `wall_switch_4_gang` |

A range extender offered as a motion sensor, and a USB wall outlet offered as a
climate sensor. That is the forum's most common complaint — "my device paired as
the wrong type" — and it was in this list the whole time, hidden behind evidence
that had been laundered through our own manifests.

P185 also inverted one case: it flagged `smart_knob` as the impossible home for
`_TZ3000_g9g2xnch`, when herdsman says the knob is exactly what it is and
`switch_1gang` was the intruder.

## What changed

Five cases added to `data/user-misattribution-registry.json`, each naming the
canonical driver and the forbidden ones. Then `align-mfs-db-intelligent.js
--apply` performed the removals: **18 strips across 6 drivers**.

Deliberately routed through the registry rather than by editing composes:

- the registry is the human decision record, and it now carries the reasoning
- the anti-bot gate repaired in P188 reads it, so the enrichment pipeline can no
  longer put them back — the exact loop that made every previous attempt fail
- every case keeps its correct driver, so nothing can be stranded

Verified after applying:

| check | result |
|---|---|
| human-reported coverage gaps (Z9) | **0** |
| dual-claim conflicts | **0** |
| anti-bot gate | clean |
| multi-class manufacturers | **29 → 11** |

The registry edit is 70 insertions and **zero deletions**. My first attempt wrote
it with `JSON.stringify`, which expanded every inline array and produced 95 lines
of reformatting noise on a hand-curated file; reverted and inserted as text.

## The 11 that remain

| manufacturerName | herdsman | assessment |
|---|---|---|
| `_TZ3000_1dd0d5yi`, `_femsaaua`, `_e3vhyirx`, `_jwv3cwak` | Moes MS-108ZR curtain switch module | legitimate — both drivers are curtain |
| `_TZB210_g01ie5wu` | Zigbee dimmer | legitimate — both drivers are dimmers |
| `_TZE200_a4bpgplm` | Thermostatic radiator valve | correct driver plus the `generic_diy` catch-all; tolerable |
| `_TZ3000_uri7ongn` | **Smart knob** | **both** placements wrong (`power_meter`, `relay_board_4_channel`) — needs a human decision, since no correct driver exists to keep |
| `_TZ3210_ol1uhvza`, `_TZ3000_vd43bbfq`, `_TZ3000_n2egfsli`, `_TZ3210_dwytrmda` | not in herdsman | no independent evidence; left alone |

## Tooling

`cross-source-user-report-triage.js` now reads the herdsman cache and prints what
it says next to each placement, so the independent verdict is visible instead of
having to be rediscovered.

The mfs_db-derived "no overlap" column is kept but is now explicitly subordinate:
it still reports `smart_knob` as impossible for `_TZ3000_g9g2xnch`, because
mfs_db learned `TS0001` from the `switch_1gang` placement that was just removed.
It will self-correct on the next crawl. Any future check built on mfs_db needs to
ask where the evidence came from first.

## Commands

```bash
node tools/ci/cross-source-user-report-triage.js
node tools/ci/anti-bot-regression-gate.js
node tools/ci/align-mfs-db-intelligent.js --check
```
