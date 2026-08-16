# Rules Enforcement Matrix

Generated: 2026-08-16T17:02:16.694Z

Machine-checkable rules tracked: **49** — enforced **39**, unenforced **10**, broken references **0** (coverage **80%**).

A rule is "broken" when the gate it names has been renamed, deleted, or no longer contains the check.

| ID | Domain | Rule | Status | Enforced by / why not |
|----|--------|------|--------|------------------------|
| Z1 | zigbee | Settings keys are zb_model_id / zb_manufacturer_name, never camelCase | enforced | `tools/ci/regression-lessons-gate.js` |
| Z2 | zigbee | Fingerprint identity is the couple (manufacturerName, productId); the same mfr may live in several drivers with different pids | enforced | `tools/ci/dual-claim-compose-gate.js` |
| Z3 | zigbee | Two drivers must not claim the same (mfr, pid) couple | enforced | `scripts/validation/check-driver-collisions.js` |
| Z4 | zigbee | No wildcards in manufacturerName | enforced | `scripts/validation/check-fingerprint-health.js` |
| Z5 | zigbee | manufacturerName arrays must never be empty | enforced | `scripts/validate/homey-mandatory-check.js` |
| Z6 | zigbee | Marketing model names (ZG-*) are not Zigbee productIds; keep them but never rely on them | enforced | `tools/ci/battery-button-intelligence-gate.js` |
| Z7 | zigbee | Manufacturer matching goes through CaseInsensitiveMatcher, not manual toLowerCase | unenforced | no gate scans for ad-hoc toLowerCase on manufacturer strings |
| Z8 | zigbee | Fingerprints removed from a driver must be justified; bulk enrichment must not silently delete identity data | enforced | `tools/ci/anti-bot-regression-gate.js` |
| Z9 | zigbee | Every manufacturerName a user reported in an issue, on the forum or in a crash diagnostic must be claimed by some driver | enforced | `tools/ci/cross-source-user-report-triage.js` |
| B1 | battery | Linear voltage-to-percent formulas are banned; use the non-linear discharge curves | enforced | `tools/ci/battery-button-intelligence-gate.js` |
| B2 | battery | ZCL batteryPercentageRemaining is 0-200 and must be normalized, never used raw | enforced | `tools/ci/battery-button-intelligence-gate.js` |
| B3 | battery | A battery transform must not be a no-op that pins the capability to a constant | enforced | `tools/ci/battery-button-intelligence-gate.js` |
| B4 | battery | Pure mains devices strip measure_battery and declare no energy.batteries | enforced | `tools/ci/battery-button-intelligence-gate.js` |
| B5 | battery | measure_battery in a manifest requires an energy.batteries array | enforced | `scripts/validate/homey-mandatory-check.js` |
| B6 | battery | batteryVoltage unit (V / 100mV / mV) must be detected, not assumed | enforced | `tools/ci/battery-button-intelligence-gate.js` |
| B7 | battery | Do not hardcode value/10 or value/100 for temperature and humidity; use the smart divisor | enforced | `tools/ci/adaptive-double-division-gate.js` |
| F1 | flows | titleFormatted must never contain [[device]] | enforced | `scripts/maintenance/sanitize-manifest.cjs` |
| F2 | flows | Flow card IDs are globally unique across all drivers | enforced | `scripts/validation/verify_flows_integrity.js` |
| F3 | flows | Virtual buttons route through safeSetCapabilityValue, never raw setCapabilityValue on a button capability | enforced | `tools/ci/regression-lessons-gate.js` |
| F4 | flows | registerRunListener must not be written as registerRunListenerasync | enforced | `tools/ci/regression-lessons-gate.js` |
| F5 | flows | A declared alarm capability must have a reachable write path | enforced | `tools/ci/battery-button-intelligence-gate.js` |
| F6 | flows | Capabilities created at runtime should also be declared in the manifest | enforced | `tools/ci/battery-button-intelligence-gate.js` |
| F7 | flows | Backlight values are the strings off/normal/inverted, never numeric comparisons | unenforced | no gate inspects backlight comparisons |
| F8 | flows | Mixin order is PhysicalButtonMixin(VirtualButtonMixin(Base)) | unenforced | no gate parses the class expression order |
| S1 | sdk3 | No bare setTimeout/setInterval in drivers and lib; use safe-timers | enforced | `tools/ci/regression-lessons-gate.js` |
| S2 | sdk3 | No console.log in driver code | enforced | `scripts/ci/zero-defect-control.js` |
| S3 | sdk3 | Zigbee devices must not be left as a bare ZigBeeDevice without the hardening base | enforced | `tools/ci/bare-zigbee-device-gate.js` |
| S4 | sdk3 | Large JSON databases are parsed from a Buffer, never from a utf8 string, to survive the 64MB heap | enforced | `tools/ci/homey-heap-json-gate.js` |
| S5 | sdk3 | Two modules must not share a basename at different paths (class extends undefined) | enforced | `tools/ci/module-load-health.js` |
| S6 | sdk3 | Every JS file must parse | enforced | `scripts/PRE_COMMIT_CHECKS.js` |
| S7 | sdk3 | Every runtime module must load, not merely parse: a base class that resolves to undefined or a module object crashes the app at startup | enforced | `tools/ci/module-load-health.js` |
| P1 | publish | app.json, package.json and .homeycompose/app.json must agree on version | enforced | `scripts/validate/homey-mandatory-check.js` |
| P2 | publish | The generated app.json stays compactly serialized; auto-fixes must preserve its formatting | enforced | `scripts/validate/homey-mandatory-check.js` |
| P3 | publish | app.json stays under 4MB compacted; publish bundle under its own ceiling | enforced | `scripts/ci/publish-size-gate.cjs` |
| P4 | publish | energy.approximation must not coexist with measure_power or meter_power | enforced | `tools/ci/energy-compose-gate.js` |
| P5 | publish | app.json must stay in step with the driver compose files | enforced | `scripts/validation/app-json-dual-layer-validator.js` |
| P6 | publish | An Athom processing_failed that looks transient must not trigger a republish loop | enforced | `.github/scripts/processing-failure-republish-check.js` |
| P7 | publish | The publish size ceiling may only go down; raising it is not a fix | unenforced | the gate reads a threshold but nothing ratchets it |
| C1 | ci | Every workflow sets defaults.run.shell: bash | enforced | `scripts/ci/validate-github-actions-policy.js` |
| C2 | ci | Every workflow YAML must parse and carry permissions, concurrency and timeout-minutes | enforced | `scripts/ci/validate-all-yaml.js` |
| C3 | ci | CI must never auto-modify driver source files; linters are report-only | unenforced | policy only — no gate blocks a workflow that writes to drivers/ |
| C4 | ci | Automation must not author changes to lib/**, drivers/**/device.js or app.js | unenforced | no gate inspects commit authorship against changed paths |
| C5 | ci | Known regressions must never come back | enforced | `tools/ci/regression-lessons-gate.js` |
| M1 | forum | REPLY_TOPICS is 140352 and nothing else | enforced | `tools/ci/forum-ai-paste-gate.js` |
| M2 | forum | Never paste unchecked AI output into the Homey community | enforced | `tools/ci/forum-ai-paste-gate.js` |
| M3 | forum | External sources are never credited in commits, changelogs or forum text | unenforced | wording policy — needs human review |
| D1 | branches | Never push directly to stable-v5; backport surgically after a clean master soak | unenforced | branch protection concern, not a repo script |
| D2 | branches | Never full-tree sync between master and stable-v5 | unenforced | human classification BOTH / MASTER_ONLY / STABLE_ONLY |
| D3 | branches | App identity files are never copied across tracks | unenforced | no cross-branch diff gate exists |
