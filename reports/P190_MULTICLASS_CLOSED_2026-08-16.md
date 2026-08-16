# P190 — Multi-class question closed (2026-08-16)

P189 resolved 18 of the multi-class manufacturers and left 11, of which I said
one needed a human decision because it had no correct driver to keep.

That was a stopping point, not an answer. Widening the evidence hunt beyond
zigbee-herdsman settles five more, including the one I had deferred.

**30 → 6, and all six remaining are legitimate.**

## Where the missing evidence was

`data/z2m_herdsman_cache.json` covered 22 of 29. Three other local sources are
also independent of our manifests and had been unused:

- `data/community-sync/all-enriched.json` — Johan-derived enrichment, with
  productId, device type and capabilities
- `data/product-reference.json` — `deviceClass`, battery types, energy profile
- `data/fingerprints.json` — the curated runtime routing DB

Together they resolve all five.

| manufacturerName | independent evidence | correct driver | was also in |
|---|---|---|---|
| `_TZ3000_uri7ongn` | herdsman **ERS-10TZBVK-AA smart knob**, TS004F, CR2032; product-reference `deviceClass: button` | `smart_knob` | `power_meter`, `relay_board_4_channel` |
| `_TZ3000_ixla93vd` | same herdsman device | `smart_knob` | `switch_wireless` |
| `_TZ3210_ol1uhvza` | Johan **TS130F curtain module**; product-reference `windowcoverings` | `wall_curtain_switch` | `climate_sensor` |
| `_TZ3210_dwytrmda` | Johan **TS130F curtain module** | `wall_curtain_switch` | `dimmer_1_gang` |
| `_TZ3000_vd43bbfq` | `fingerprints.json` **TS130F curtain module**; Johan agrees | `curtain_module` | `fingerprint_lock` |
| `_TZ3000_n2egfsli` | Johan **TS0203 / RH3001 / SNZB-04, alarm_contact** | `contact_sensor` | `button_wireless_2` |

## The knob case was worse than "misattributed"

`_TZ3000_uri7ongn` is a battery rotary knob living in `power_meter` and
`relay_board_4_channel`. Neither is right, which is why P189 could not simply
strip: there was no correct driver to fall back to.

`smart_knob` declares exactly `TS004F` and `ERS-10TZBVK-AA` — the knob's real
identity — and did not list it. So the fix was to **add** it there first, then
strip.

That ordering matters. `align-mfs-db-intelligent.js` only ever strips; it never
adds. That asymmetry is what orphaned `_TZ3000_qeuvnohg` in P188, and it would
have orphaned this knob too.

There is a second reason this one could not be left alone: **`power_meter` also
declares `TS004F`**. A knob sitting there was a live dual-claim waiting for the
other side to acquire the same manufacturer.

## Circular evidence, again

`_TZ3000_vd43bbfq` was listed in P189 as "lock/windowcoverings, no herdsman
evidence", and mfs_db reported its model as `TS0601_lock`. That value was read
back out of the `fingerprint_lock` compose being audited. The curated
`data/fingerprints.json` says `TS130F`, `type: cover`.

Same for `_TZ3000_n2egfsli`: `lib/tuya/fingerprints.json` carries two records for
it, one saying `contact_sensor` and one saying `button_wireless_2` with
`source: "driver-compose-2026-07-14"` — visibly derived from a manifest.

The rule that keeps emerging: **check the provenance field before trusting a
record.** Anything sourced from `local` or `driver-compose` cannot adjudicate a
placement.

## Result

| check | result |
|---|---|
| human-reported coverage gaps (Z9) | **0** |
| dual-claim conflicts | **0** |
| anti-bot regression gate | clean |
| sacred-couple registry audit | 0 failures |
| mfs_db alignment | clean |
| multi-class manufacturers | **11 → 6** |

Four registry cases added, one P189 case superseded (it had put `ixla93vd` on
`switch_wireless`; herdsman shows it is the same knob as `uri7ongn`).

## The six that remain, and why each is fine

| manufacturerName | drivers | why legitimate |
|---|---|---|
| `_TZ3000_1dd0d5yi`, `_femsaaua`, `_e3vhyirx`, `_jwv3cwak` | `curtain_motor_shutter` + `wall_curtain_switch` | Moes MS-108ZR curtain switch module — both drivers are curtain, different productIds |
| `_TZB210_g01ie5wu` | `wall_dimmer_1gang_1way` + `wall_dimmer_tuya` | Zigbee dimmer in two dimmer drivers |
| `_TZE200_a4bpgplm` | `device_radiator_valve` + `generic_diy` | TRV in its correct driver plus the generic catch-all |

No further action. The original passage — "30 manufacturers span several device
classes, none can cause a mispairing" — was half right: they could not cause a
*dual-claim*, but 24 of them were offering users a device of entirely the wrong
type, which is the same complaint from the user's side.

## Commands

```bash
node tools/ci/cross-source-user-report-triage.js
node tools/ci/anti-bot-regression-gate.js
node tools/ci/audit-sacred-couple.js --from-registry
```
