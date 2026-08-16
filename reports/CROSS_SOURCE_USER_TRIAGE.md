# Cross-source user report triage

Generated: 2026-08-16T18:42:08.411Z

Sources: 100 GitHub issues, 60 pull requests, forum scan present, Gmail diagnostics present.

Manufacturers mentioned anywhere: **1347** — of which **194** appear in a human-written report.
Human-reported and not claimed by any driver: **0**.
Harvested by bulk crawlers and not claimed: **14** (expected; these are candidates, not defects).

## Human-reported coverage gaps

None. Every manufacturer a user reported is claimed by at least one driver.

## Placements with no observed modelId overlap

A driver lists this manufacturer but shares none of the modelIds mfs_db has seen it
report, so on current evidence the couple cannot occur. Harmless today — it simply
never matches — but it widens the driver's claim surface for nothing.

Read the evidence column before acting: mfs_db is aggregated from crawlers and a
single low-confidence `local` source can mean the model list is merely incomplete.

| manufacturerName | observed modelIds | evidence | no overlap in | matched elsewhere |
|---|---|---|---|---|
| `_tz3000_blhvsaqf` | TS0001, TS0601 | local/z2m (conf 0.17) | switch_wall_7gang | switch_1gang (TS0001/TS0601) |
| `_tz3000_g9g2xnch` | TS0001, TS0601 | local/z2m (conf 0.17) | smart_knob | — |
| `_tz3000_r0o2dahu` | TS0001, TS0601 | local/z2m (conf 0.17) | smart_knob | — |
| `_tz3008_1a8m8wd6` | TS011F_plug_1 | z2m (conf 0.75) | generic_tuya | — |
| `_tz3210_dse8ogfy` | TS0042, TS0503A, TS0601 | local/z2m/hubitat (conf 0.25) | fingerbot | — |
| `_tz3000_vd43bbfq` | TS0601_lock | local (conf 0.08) | curtain_module | — |
| `_tze204_5cuocqty` | TS0601_dim1 | local/integration-2026-07-12 (conf 0.50) | switch_1gang | — |
| `_tz3000_uri7ongn` | TS0004, TS0601 | local/z2m/hubitat (conf 0.25) | smart_knob | — |
| `_tz3000_yj6k7vfo` | TS0040 | local (conf 0.08) | button_wireless_4_ts0041 | — |
| `_tze204_xtrnjaoz` | TS0201 | local (conf 0.08) | curtain_motor | — |
| `_tz3000_3dfewsk1` | TS0207 | local (conf 0.08) | water_leak_sensor_tuya | — |

## Manufacturers spanning several device classes

One manufacturer legitimately covers several products, so this is not an error list.
The `matches` column shows which of its observed modelIds each driver actually claims —
when every driver matches something distinct, the spread is the sacred-couple case working as intended.

The zigbee-herdsman column is the only evidence that did not come from our own
manifests. When it names a single device type, a driver of a different class holding
the same manufacturer is a misattribution, whatever mfs_db says.

| manufacturerName | classes | zigbee-herdsman says | placements |
|---|---|---|---|
