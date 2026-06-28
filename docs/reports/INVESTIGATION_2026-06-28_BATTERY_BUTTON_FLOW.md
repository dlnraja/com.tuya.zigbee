# Investigation 2026-06-28 - Battery, Buttons, Flows

Date/time: 2026-06-28 15:13 Europe/Paris
App: `com.dlnraja.tuya.zigbee.stable` v5.11.218
Branch: `stable-v5`
Baseline commit: `f58f0ee48c`
Remote note: `8c9c03badd chore(auto-heal): Apply Tuya self-heal repairs [skip ci]` was integrated before this push.

## Sources crossed

- Local rules/docs: `.github/WORKFLOW_GUIDELINES.md`, `.github/SECRETS.md`, `docs/BUTTON_CAPABILITY_GUIDE.md`, `docs/BIDIRECTIONAL_BUTTONS.md`, `docs/GLOBAL_INVESTIGATION_PLAN.md`, `docs/FORUM_ISSUES_CONSOLIDATED.md`, `docs/GITHUB_ISSUES_PR_ANALYSIS.md`.
- Git history: v5 maintenance commits through `f58f0ee48c`, plus remote self-heal `8c9c03badd`.
- GitHub/forum correlation: forum thread `https://community.homey.app/t/140352`, PRs #120, #125, #341, #343, #344, #345.
- Diagnostics/Gmail pipeline: only redacted/anonymized paths are considered safe for automation (`fetch-gmail-diagnostics.js`, `privacy-redactor.js`, Homey/Gmail diagnostic workflows). No raw mailbox dump or secret material must be committed.

## Root causes found

1. `UnifiedBatteryHandler` used `this.homey.setInterval(...)` without initializing `this.homey`. This could break periodic battery handling and explain unknown battery states.
2. Old validation and self-heal logic still tried to maintain both `measure_battery` and `alarm_battery`. That conflicts with the current SDK3 rule used by the project.
3. Wireless button/scene/knob drivers were treated as mains-like by broad switch heuristics, causing battery capabilities to be removed from legitimate battery devices.
4. Several v5 button drivers used `VirtualButtonMixin` but missed the import, risking runtime button/flow handling failures.
5. Driver-specific flow cards used `[[device]]` in `titleFormatted`, which fails Homey publish validation.
6. The v5 comprehensive GitHub Action failed on historical full-`lib/` ESLint debt instead of the project publish/precommit contract.
7. `sunday-master.yml` contained two steps with environment blocks but no `run` or `uses`, which makes the workflow invalid when parsed by GitHub.
8. The v5 curtain drivers and `switch_3gang` code triggered flow card ids that were absent or mismatched in the flow manifests.

## Code/documentation actions

- `lib/battery/UnifiedBatteryHandler.js`: initialized a scheduler source and added safe interval helpers with fallback cleanup.
- Driver manifests: removed all dual battery exposure; kept `measure_battery` only where `energy.batteries` is present.
- Button drivers: restored/imported `VirtualButtonMixin` and removed incorrect `mainsPowered` overrides from battery-capable button/scene/knob drivers.
- Self-heal/precommit/validators: changed dual battery from repair target to error condition; stopped injecting `alarm_battery`.
- Mains checks: limited battery removal to explicit mains-only manifests (`energy.mains === true` and no `energy.batteries`).
- Flow manifests: removed invalid `titleFormatted` entries that referenced `[[device]]`.
- Curtain drivers: aligned physical button triggers with their driver-specific flow ids.
- `switch_3gang`: added the three missing scene trigger cards and sent explicit `gang`/`action` tokens.
- GitHub Actions: changed the fleet validation gate to `npm run precommit`, matching the documented project contract; repaired the missing `run` commands in `sunday-master.yml`.

## Validation

- `npm run precommit`: pass; 1026 JS/compose files checked, 0 blocking errors, historical warnings only.
- `npm run validate:recursive`: pass, 228/228 drivers, 0 failed, 0 critical errors, 151 existing fingerprint-casing warnings.
- `npm run validate:publish`: pass.
- `node scripts/_validate_all.js`: pass for JSON, JS brackets, and flow-card references; only the historical non-blocking `pool_pump` strict-mode note remains.
- Workflow syntax audit: `comprehensive-auto-validation.yml` and `sunday-master.yml` now have 0 steps missing `run`/`uses`.
- Targeted audit: 228 driver manifests, dual battery conflicts 0, `measure_battery` without `energy.batteries` 0, missing `VirtualButtonMixin` imports 0, residual `[[device]]` in driver flow compose files 0.
- `git diff --check`: pass.

## Remaining non-blocking warnings

Homey currently warns that some flow cards have no `titleFormatted`. Those cards validate for publish today. They should be filled later with argument-complete formats that do not use `[[device]]`.
