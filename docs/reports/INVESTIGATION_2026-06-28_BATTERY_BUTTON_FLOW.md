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

## Follow-up 2026-06-29 20:32 Europe/Paris - Full Gmail diagnostic recovery and lifecycle hardening

Sources crossed:

- GitHub Actions Gmail Diagnostics Auto-Analysis run `28394162348` on branch `harden-github-actions-from-v90147`.
- Sanitized artifact `sanitized-diagnostics-report` only; raw Gmail, crash payloads, dashboard payloads, secrets, and PII were not committed.
- PR #436 checks after commit `e87083acc3`.
- Local diagnostics gates: `privacy-redactor.js`, `diagnostic-history-gate.js`, flow/button/voice/security/precommit checks.

Diagnostic recovery result:

- Historical window: `2019-01-01` to `2026-06-29`, single-window IMAP run, `maxResults=20000`, `maxTotalResults=20000`, `chunkDays=0`, `reprocess=true`, `autoImplement=false`.
- Messages matched and fetched: `10742`.
- Types: `general=6091`, `github=2213`, `crash_report=765`, `device_issue=544`, `diagnostic=530`, `bug_report=293`, `interview=151`, `changelog=130`, `homey_system=25`.
- Diagnostic categories: `runtime_crash=819`, `button_flow=314`, `battery_unknown=131`, `security_privacy=126`, `missing_capability_listener=4`.
- Cross-reference summary: `637` fingerprints, `343` pseudonymous users, `1015` error patterns.
- New fingerprint candidates: `291`; deep research was intentionally disabled (`autoImplement=false`).
- Privacy: workflow privacy gate sanitized generated files; local privacy re-check on the downloaded artifact scanned 4 files and required 0 additional sanitizations.

Root-cause interpretation:

1. Button and flow regressions are now covered by the dedicated button-flow registration patch and `check:button-flows`; the full history still records old invalid card ids, but current flow/card gates report 0 duplicates and 0 button-flow routing errors.
2. Battery unknown reports correlate with old DP/ZCL battery gaps and overly broad mains heuristics. Current branch already restores button-device battery persistence/fallbacks and low-battery flow routes; remaining history is now used as regression input, not as raw state.
3. Runtime crashes include old `SourceCredits` missing-module reports, timer/lifecycle crashes after Homey app destruction, and retry/timer mistakes. `SourceCredits` now exists and is safe-required; this follow-up hardens the remaining lifecycle and retry paths found in current code.
4. Security/privacy signals are handled as process guardrails: diagnostics remain sanitized artifacts, `security-scan` is clean, and auto-implementation from email remains off unless explicitly requested.

Actions:

- Raised Gmail diagnostic history fetch capacity to `20000` and confirmed that full historical recovery works in one pass.
- Added batched IMAP fetching so the mailbox fetch phase can process the full 10742-message corpus without annual chunk timeouts.
- Corrected `drivers/switch/device.js` reporting retries: the 60-second delay is now the actual timer delay, retries stop after destruction, and retry failures preserve error context.
- Added safe Homey app access in EF00 paths (`TuyaEF00Manager`, `TuyaEF00Base`) before app-level DP flow triggers or app-level manager lookups.
- Hardened dynamic/background app access in `UniversalFlowCardLoader`, `SelfHealingDevice`, and `AutonomousEnricher`.

Validation:

- GitHub Actions Gmail run `28394162348`: success.
- PR #436 checks after `e87083acc3`: pass for production build, strict validation, validate, quality checks, syntax-check, AI-assisted smart merge, and security shield.
- `node --check` on touched JS files: pass.
- `npm run check:timer-context`: pass.
- `npm run check:flows`: pass, 420 files, 4781 unique cards, 0 duplicates.
- `npm run check:button-flows`: pass, 34 checked, 0 errors, 0 warnings.
- `npm run check:voice`: pass, 430 drivers and 642 `button.*` capabilities checked as event/maintenance-only.
- `npm run security-scan`: clean.
- `npm test`: pass.
- `npm run precommit:full`: pass, with existing broad warnings only.
- `git diff --check`: pass.

## Follow-up 2026-06-29 21:58 Europe/Paris - Johan TS0041 `_TZ3000_b4awzgct`

Sources crossed: GitHub issue #333/Johan TS0041 diagnostic, historical button commits, local `BUTTON_CAPABILITY_GUIDE`, `REGRESSION_ANALYSIS_v5.11`, Gemini PR review sweep for PRs #244/#310/#341/#343/#344/#345/#346/#429/#431/#433/#434/#435/#436, and current Homey Compose collision behavior.

Root cause:

- `_TZ3000_B4AWZGCT` was still routed through `button_wireless_1`, but the diagnostic shows a TS0041 device with four button endpoints. That made Homey expose the wrong driver surface: one `button.1`, missing button flows 2-4, and unreliable battery handling for the physical 4-button device.
- The earlier TS0041 hardening correctly created `button_wireless_4_ts0041` for `_TZ3000_yj6k7vfo`, but did not include the older `_TZ3000_b4awzgct` case variants reported by Johan/Lalla80111.

Actions:

- Removed `_TZ3000_B4AWZGCT` from `button_wireless_1`.
- Added `_tz3000_b4awzgct`, `_TZ3000_b4awzgct`, and `_TZ3000_B4AWZGCT` to `button_wireless_4_ts0041`, alongside the existing `_tz3000_yj6k7vfo` variants.
- Updated `app.json` to keep the published Homey manifest aligned with the driver compose files.
- Extended `scripts/ci/check-button-flow-routing.js` so future precommit checks fail if known 4-endpoint TS0041 manufacturers are routed back to the 1-button driver or if the dedicated TS0041 wrapper loses `productId: TS0041`.
- Repaired `npm run build-docs` to use the active Device Finder generator, avoiding stale docs/pages output.

Validation:

- `node --check scripts/ci/check-button-flow-routing.js`: pass.
- `npm run check:button-flows`: pass, 34 drivers checked, 0 errors.
- `node .github/scripts/fp-collision-check.js --baseline .github/fingerprint-collision-baseline.json`: pass, 0 current, 0 baseline, 0 new.
- `npm run check:voice`: pass, 430 drivers and 642 `button.*` capabilities checked.
