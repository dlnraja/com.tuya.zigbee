# Investigation 2026-06-28 - Battery, Buttons, Flows

Date/time: 2026-06-28 15:13 Europe/Paris
App: `com.dlnraja.tuya.zigbee` v9.0.136
Branch: `master`
Baseline commit: `35e0e533d1`

## Sources crossed

- Local rules/docs: `.github/AI_RULES.md`, `.github/WORKFLOW_GUIDELINES.md`, `docs/BUTTON_CAPABILITY_GUIDE.md`, `docs/BIDIRECTIONAL_BUTTONS.md`, `docs/GLOBAL_INVESTIGATION_PLAN.md`, `docs/FORUM_ISSUES_CONSOLIDATED.md`, `docs/GITHUB_ISSUES_PR_ANALYSIS.md`.
- Git history: recent publish fixes around `de165cfca4`, `94be7306f8`, `0ca4baa06e`, then bot publish marker `35e0e533d1`.
- GitHub/forum correlation: forum thread `https://community.homey.app/t/140352`, PRs #120, #125, #341, #343, #344, #345.
- Diagnostics/Gmail pipeline: only redacted/anonymized paths are considered safe for automation (`fetch-gmail-diagnostics.js`, `privacy-redactor.js`, `collect-diagnostics.js`). No raw mailbox dump or secret material must be committed.

## Root causes found

1. `UnifiedBatteryHandler` used `this.homey.setInterval(...)` without initializing `this.homey`. On devices where the handler was created before a stable Homey scheduler reference, battery initialization could fail or stall, leaving Homey with unknown battery values.
2. Old rules and self-heal scripts still treated `measure_battery + alarm_battery` as desirable. Homey SDK3 should not expose both on the same driver, and the conflict created unstable battery semantics.
3. The previous automatic mains/switch heuristic was too broad. It removed battery capability from wireless/scene/button-like drivers that can legitimately be battery powered.
4. Driver-specific flow cards still contained `[[device]]` in `titleFormatted`. This is invalid for Homey publish validation on these cards and caused publish-level failures.
5. The CI guards still encoded the old battery rule, so automated repairs could reintroduce the same battery conflict after a human fix.

## Code/documentation actions

- `lib/battery/UnifiedBatteryHandler.js`: initialized a scheduler source and added safe interval helpers with fallback cleanup.
- Driver manifests: removed all `measure_battery + alarm_battery` dual exposure, retained `measure_battery` only where `energy.batteries` exists, and preserved battery support for mixed or wireless drivers.
- Self-heal/precommit/validators: changed dual battery from repair target to error condition; stopped injecting `alarm_battery`.
- Mains checks: limited battery removal to explicit mains-only manifests (`energy.mains === true` and no `energy.batteries`).
- Flow manifests: removed invalid `titleFormatted` entries that referenced `[[device]]`.

## Validation

- `npm run precommit`: pass; security scanner clean; mixin order 0 errors.
- `npm run validate:recursive`: pass, 429/429 drivers, 0 failed, 0 critical errors, 250 existing fingerprint-casing warnings.
- `npm run validate:flows`: pass, Missing Flows 0, Format Errors 0.
- `npm run validate:publish`: pass.
- Targeted audit: 429 driver manifests, dual battery conflicts 0, `measure_battery` without `energy.batteries` 0, residual `[[device]]` in driver flow compose files 0.
- `git diff --check`: pass.

## Remaining non-blocking warnings

Homey currently warns that some flow cards have no `titleFormatted`. Those cards validate for publish today. They should be filled later with argument-complete formats that do not use `[[device]]`.

## Follow-up 2026-06-28 16:50 Europe/Paris - Radar and TS0041 routing

Additional sources crossed: GitHub issues #420, #410, #412, forum thread `https://community.homey.app/t/140352`, local driver history for `motion_sensor_radar_mmwave`, `presence_sensor_radar`, `button_wireless_4`, `smart_button_switch`, and `PhysicalButtonMixin`.

Root causes found:

1. Wenzhi `MTG235-ZB-RL` (`_TZE204_clrdrnya` / `_TZE200_clrdrnya`) was split across presence-radar and mmWave assumptions. The latest issue data maps DP1 to presence, DP9 to distance, and DP12 to illuminance, matching the mmWave driver better than the generic presence radar driver.
2. The mmWave DP9 parser used a temperature capability hint, so valid distance payloads could be mis-normalized or ignored.
3. Mains-powered mmWave devices could retain legacy `measure_battery`, `measure_temperature`, or `measure_humidity` capabilities from older pairings, causing Homey dashboard question marks or phantom readings.
4. `_TZ3000_yj6k7vfo` reports as `TS0041`, but issue #412 shows four endpoints with on/off clusters. Treating only the product id as one-button caused the wrong driver/mixin assumptions.

Actions:

- Moved `_TZE204_clrdrnya` / `_TZE200_clrdrnya` to `motion_sensor_radar_mmwave` and removed them from `presence_sensor_radar`.
- Corrected DP9 distance parsing and added startup cleanup for unsupported mains-powered capabilities.
- Routed `_TZ3000_yj6k7vfo` to `button_wireless_4`, removed it from the smart one-button driver, and pinned `buttonCount: 4` in `PhysicalButtonMixin`.
- Repaired the local `prepush` contract: `master-automation.js` now accepts canonical SDK3 `sdk`, and `package.json` points to the existing dual-layer gate instead of the missing `pre-push-intelligent.js`.

Validation:

- `node --check` on touched JS files: pass.
- Target fingerprint audit: `_TZE204_clrdrnya`, `_TZE200_clrdrnya`, and `_TZ3000_yj6k7vfo` each resolve to exactly one intended driver.
- `npm run validate:recursive`: pass, 429/429 drivers, 0 critical errors.
- `node scripts/_validate_all.js`: pass.
- `npm run precommit`: pass; security scanner clean.
- `npm run validate:publish`: pass, with existing non-blocking `titleFormatted` warnings.
- `npm run prepush`: pass; zero AggregateError. GitHub Actions later caught a TS0041 cartesian fingerprint collision that is fixed in the follow-up below.
- `git diff --check`: pass.

## Follow-up 2026-06-28 17:28 Europe/Paris - TS0041 collision hardening

GitHub Actions source: Unified CI/CD Orchestrator run after commit `c15af9285c`. The strict fingerprint job failed on 8 new collisions, all caused by adding `TS0041` to the generic `button_wireless_4` driver. Homey Compose expands `manufacturerName x productId`, so every existing 4-button manufacturer in that driver also claimed `TS0041` and collided with `switch_1gang`.

Actions:

- Removed `TS0041` from generic `button_wireless_4`; it remains for normal `TS0044`/`TS004F`/`SNZB-01M`/`TS0014` routing.
- Added dedicated `button_wireless_4_ts0041` for only `_tz3000_yj6k7vfo`, `_TZ3000_yj6k7vfo`, and `_TZ3000_YJ6K7VFO` with `productId: TS0041`.
- Reused the proven 4-button implementation and generated dedicated 4-gang Flow cards so Homey shows buttons 1-4 without relying on switch capabilities.
- Set `gangCount = 4` and made the fallback Flow card id use `this.driver.id`, avoiding hard-coded `button_wireless_4` ids.

Validation:

- `node .github/scripts/fp-collision-check.js --baseline .github/fingerprint-collision-baseline.json`: pass, `0 current, 0 baseline, 0 new`.
- `npm run validate:recursive`: pass, 430/430 drivers, 0 critical errors.
- `node scripts/_validate_all.js`: pass, 3/3 checks.
- `npm run validate:publish`: pass, existing non-blocking `titleFormatted` warnings only.
- `npm run prepush`: pass, zero AggregateError and zero fingerprint collisions.

## Follow-up 2026-06-28 18:14 Europe/Paris - Publish workflow Docker hardening

GitHub Actions source: Auto-Publish on Push run `28328116030` after commit `27d7064b83`. The app code did not run yet; the job failed before checkout while building the external `athombv/github-action-homey-app-version` Docker action. Docker Hub timed out while resolving `node:lts-alpine`, so the publish path depended on an external container pull for a simple version bump.

Actions:

- Added `.github/scripts/bump-homey-version.js`, a repo-local Node version bumper for Homey app manifests.
- Replaced the Docker-based version action in `auto-publish-on-push.yml`, the manual `publish.yml`, and the dormant `homey-app-cicd.yml.manual` template.
- Preserved the existing `patch`/`minor`/`major` behavior, package and `.homeycompose` sync, `.homeychangelog.json` entry creation, and `steps.bump.outputs.version` contract.

Validation:

- `node --check .github/scripts/bump-homey-version.js`: pass.
- YAML parse for `auto-publish-on-push.yml` and `publish.yml`: pass.
- Isolated functional test: `9.0.139 -> 9.0.140` patch bump, with `app.json`, `package.json`, `.homeycompose/app.json`, and `.homeychangelog.json` synchronized.
- `git diff --check`: pass.
