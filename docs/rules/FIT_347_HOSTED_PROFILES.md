# Fit in 347 drivers: driver-count cap and hosted profiles (P3264)

Requested by dlnraja (t839u, t840u, 03/11/2026 Paris). Athom refuses every build with more than 347 drivers
(observed; ticket 157057 is pending, so the cause isn't confirmed yet). If a P3262 driver-count-ceiling doc lands on master, this file extends it.

## Rules

1. **Cap.** The publish payload ships at most `cap` (347) drivers, with a target of 330. `config/architecture/driver-cap.json`
   is the SSOT. `scripts/prepare-publish.js` stops with FATAL(P3264) above the cap, and `scripts/ci/driver-cap-gate.js` runs in
   `ci-self-check.yml`.
2. **No new driver id.** `drivers/` may only hold ids listed in `driver-cap.json` `sourceIds`.
   Generators and scaffolders call `lib/arch/DriverCap.assertCanCreateDriver()`: `scripts/automation/driver-generator.js`
   and `.github/scripts/auto-driver-scaffold.js`. When an id is refused, the generator skips it and doesn't create the folder.
3. **Where new couples go**, in this order:
   a. a surviving published driver with the same class and capabilities. Fingerprint sync, enrich/promotion,
      apply-forum-fixes and sync-fingerprints-to-compose already write to existing drivers only.
   b. a continuation of a full root (`docs/rules/DRIVER_CONTINUATIONS.md`). Every continuation **must** be held
      (`config/publish-hold-drivers.json`) so that P3229 folds it into its root. `scripts/ci/driver-continuations-check.js` enforces this.
   c. a **hosted profile**: a held, never-published driver whose exact couples ship inside a published *dormant slot*.
4. **One couple, one driver.** A hosted profile is skipped at publish time if any of its couples (caseless) already ships on
   another driver. Example: `co_sensor_dcr_co`, whose `_TZE20x_7bztmfm1 × TS0601` ships on `smart_air_detection_box`.
5. **Paired devices.** No published id is removed or merged without the user's OK. Any of them could have paired devices.

## Hosted profiles

- SSOT: `config/architecture/hosted-profiles.json`, which lists `dormantSlots`, `hosts` and `notHosted`. Generated file:
  `lib/hosting/hosted-profiles.runtime.json`, written by `node scripts/arch/build-hosted-profiles.js`. CI checks it is in sync with `--check`.
- A dormant slot is a published id whose 9.0.1574 couples are fake or unpairable: `device_generic_tuya`,
  `sensor_contact_presence`, `smart_rcbo`, `switch_plug_1` and `air_purifier_siren`.
- What happens at publish time, in `prepare-publish` P3264:
  - `foldHosted` adds the profile's exact couples to the host before compaction and drops the held id.
  - The couples get sacred pins: at most 2 case forms, for both the compaction and the P3201 sourced pass.
  - The sacred pins of the held id are moved to the host (`retargetSacred`).
  - The profile's folder still ships (P2930b `keepIds`).
- At runtime, the host `driver.js` `onMapDeviceClass` calls `HostedProfiles.mapDeviceClass`:
  - An exact couple, matched without regard to case, gets the profile's own `device.js`, wrapped so that `migrateDeviceClass` runs once.
  - Anything else gets the host device class.
- Limits: the device pairs under the host's name. Flow cards and settings that only the profile has are not shipped.

## Tests

`test/critical/p3264-fit-347.test.js`

## Athom's count: 345 visible (03/11/2026)

- The public API (`https://apps-api.athom.com/api/v1/app/com.dlnraja.tuya.zigbee`, no auth) lists **345** drivers for the
  accepted 9.0.1615 build, while we ship 347. The two missing drivers are exactly the ones with `deprecated: true`:
  `air_purifier_siren` and `sensor_lcdtemphumidsensor_temphumidsensor`. Athom hides deprecated drivers, and they can't be paired.
  Flow cards are identical on both sides (2802/561/1268 = 4631).
- So the cap may be 347 shipped or 345 visible. Keep shipped ≤ 347 and aim for ≤ 330.
- **Never host profiles in a deprecated driver.** `air_purifier_siren` was dropped as a slot, and its 2 Excellux profiles moved to
  `sensor_contact_presence`. The test enforces this.
- `scripts/ci/athom-api-count-compare.js` runs after each upload in `publish.yml`. The expected API count is the payload minus the
  deprecated drivers, and an unexplained gap makes the step red.
- The flow-card cap (4631) is unproven. Hosting adds no flow cards, because hosted-only cards aren't shipped.

## The rule is the accepted id set, not a fixed number (parent steering 03/11/2026)

- In October, master was accepted with **446** drivers and refused at 447 or more (ATHOM_NEW_DRIVER_REJECTION_2026-10-11.md).
  So the likely rule is "**no driver id outside the last accepted set**" (ids that were never published are refused), not a fixed cap of 347.
- Priority 1: a new couple goes into a **published** id. Priority 2: a new device type goes into a published generic driver
  (device_generic_tuya, or the hosting described in this doc), or into a repurposed placeholder id, but only if Homey allows it.
- **Dropping a published id does not necessarily free a slot** for a new id. Driver count reduction (target ≤ 330) is only headroom.
- `driver-cap.json` `cap` is the guardrail. The authoritative ceiling rule is docs/rules/DRIVER_COUNT_CEILING.md (P3262, not merged
  into master at the time of writing). Extend that file when it lands, and don't duplicate it here.
