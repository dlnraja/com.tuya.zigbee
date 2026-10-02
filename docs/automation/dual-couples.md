# Couples listed on two or more drivers (P2794)

Homey matches a device when its manufacturerName **and** its productId are both listed by the same
driver. A driver's couples are therefore the product of its two lists, and a manufacturerName that
legitimately sits on two drivers creates "dual couples" for every productId both drivers share.
`scripts/leads/dual-couples.js` classifies them (case-insensitive); the full per-couple verdicts are in
`data/leads/dual-couples.json` (CI-only, not shipped).

## Evidence used per couple

| Evidence | Meaning |
|---|---|
| productId family | TS0001/TS0011 = 1 gang, TS0002/TS0012 = 2, TS0003/TS0013 = 3, TS0004/TS0014 = 4; TS011F/TS0121 = plug; TS130F = cover; TS004x = button; TS0202/0203/0201/0207/0205/0204/0210/0222 = motion/contact/climate/water/smoke/gas/vibration/illuminance; TS110E/TS110F/TS0052 = dimmer; TS050xA/B = light; TS0601 = DP-based (no information) |
| DP sets | `data/dp_registry.json`: `state_l1..lN` / `switchN` → N gangs; a single `state` on DP1 → 1 gang |
| converter definitions | zigbee-herdsman-converters cache: "N gang" in a single-model definition |
| registry | `data/user-misattribution-registry.json` canonical/forbidden drivers (strongest) |
| driver | number of `onoff` / `onoff.gangN` capabilities = gang count; class + capabilities = device type |
| seen | `external` (z2m, issue posts, leads, non-local mfs_db entries), `internal` (our mfs_db / fingerprint tables), `none` (only exists as the product of two lists) |

## Patterns found (master, after resolution: 704 dual couples)

| Pattern | Couples | reported by a source | clear | adapt | kept |
|---|---|---|---|---|---|
| same class duplicate (sensor) | 170 | 30 | 0 | 0 | 170 |
| light duplicate drivers | 139 | 8 | 0 | 0 | 139 |
| light colour vs dim/white | 85 | 10 | 0 | 0 | 85 |
| same class duplicate (button) | 69 | 4 | 0 | 0 | 69 |
| cross class (button/socket) | 49 | 7 | 3 | 0 | 46 |
| cross class (socket/windowcoverings) | 41 | 0 | 0 | 0 | 41 |
| same class duplicate (windowcoverings) | 28 | 14 | 0 | 0 | 28 |
| cross class (light/socket) | 24 | 5 | 0 | 0 | 24 |
| switch same gang (1) | 18 | 9 | 0 | 0 | 18 |
| cross class (sensor/socket/windowcoverings) | 17 | 0 | 0 | 0 | 17 |
| cross class (sensor/windowcoverings) | 12 | 5 | 0 | 0 | 12 |
| switch gang mismatch (1/2) | 12 | 0 | 0 | 12 | 0 |
| cross class (sensor/socket) | 11 | 1 | 0 | 0 | 11 |
| other small groups (11 patterns) | 29 | 12 | 0 | 0 | 29 |

Key observation: 599 of 704 dual couples (85 %) are not reported by any source — they only exist
because two drivers share both a manufacturerName and a long productId list. They do not correspond to
a real device and are harmless; only 105 couples are reported somewhere.

## Verdicts

- **clear** — the evidence picks one driver (registry; or productId/DP/converter gang count matching
  exactly one switch driver with no conflicting evidence; or a type-specific productId matching exactly
  one driver of that type).
- **adapt** — switch drivers with different gang counts and no or conflicting gang evidence → kept; the
  runtime gang adapter handles it (below). Currently the 12 `_TZE204/_TZE284_amp6tsvy` couples on
  switch_1gang + switch_2gang.
- **kept** — light vs dimmer, duplicate drivers of the same type, cross-type couples where the
  productId does not tell the device type, or same gang count on every driver: both drivers can run the
  device, so nothing changes.

## Resolutions (clear evidence only)

A clear verdict is turned into a manifest change only if nothing reported is lost:
1. drop the productId from the losing driver when every manufacturerName there either keeps the couple
   on the winning driver or is not reported with that productId; else
2. drop the manufacturerName from the losing driver when none of its other couples there is reported;
3. otherwise keep (blockers listed in the report).

Applied on master and stable-v5:
- `curtain_motor`: productIds `ZG-301Z` and `ZG-302Z1` removed. Registry entry `hobeian-zg301z-switch`
  (HOBEIAN 1-gang relay, dedicated heal module on switch_1gang) and two existing tests
  (p2433, p2692) already required this. `ZG-301Z-MOTO` (the HOBEIAN curtain variant) stays on
  curtain_motor, and switch_1gang keeps HOBEIAN + ZG-301Z / ZG-302Z1, so new pairings land on the
  switch driver. This also removed 2 dual couples that no source reports (`heobian` spelling).
- Devices already paired on curtain_motor keep their driver (Homey never re-matches a paired device).
  The removed entries are recorded in `lib/data/dual-couple-legacy.json`; the driver-migration hint in
  `BaseUnifiedDevice` reads it and stays quiet for those devices.

Kept although clear (would lose sourced couples): `_TZ3000_jak16dll`, `_TZ3000_cayepv1a`,
`_TZ3000_lepzuhto` + TS011F on button_wireless_2 vs a plug driver — the same names are reported as
TS0042 buttons on button_wireless_2, and dropping TS011F there would unpair sourced plugs of other
manufacturerNames (and the in-place identity profile of `_TZ3000_pmz6mjyu`).

## Runtime gang adapter (`lib/devices/GangCountAdapter.js`)

Attached in `UnifiedSwitchBase` (all switch_Ngang drivers), wrapped, non-blocking:
- counts boolean DPs 1..N seen after pairing (DP1 alone = 1 gang, DP1+DP2 = 2, …) and endpoints 1..N
  carrying onOff;
- always: when the observed count differs from the driver's, logs once and stores
  `gang_adapter_hint` (`{ observed, driver, suggest: "switch_<N>gang" }`);
- for couples in `lib/data/dual-couple-adapt.json` only: adds missing `onoff.gangN` (with listeners,
  restored on restart) and later removes only the capabilities it added itself if fewer gangs show up.
  Manifest capabilities are never removed, so existing flows keep working.

## Automation

`oss-lan-source-enrich.yml` runs `node scripts/leads/dual-couples.js` after the coverage audit:
report only, committed with the other lead files. `--apply` (manifest changes) and `--write-runtime`
(refresh of the adapter list) are maintainer-only.

## Counts

- `check-driver-collisions.js`: 707 → 703 on master (classifier count 708 → 704; the classifier
  also merges productId spellings).
- `app.json`: 2,315,856 → 2,315,835 bytes (−21 B).
