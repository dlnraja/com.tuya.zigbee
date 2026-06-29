# Crash Email Investigation - 2026-06-29

Generated: 2026-06-29 22:59:07 +02:00

Scope: sanitized Homey crash notification emails for `com.dlnraja.tuya.zigbee` v9.0.146.

## Findings

### 2026-06-29 14:50:17 UTC - Soil sensor DP update crash

- Symptom: repeated `TypeError: this.safeSetCapabilityValue is not a function`.
- Location reported by Homey: `drivers/soilsensor_2/device.js`, inside DP update handling.
- Root cause: the published build used the legacy `TuyaSpecificClusterDevice` inheritance path without the safe capability setter expected by newer drivers.
- Status in branch: covered by the existing hardening patch that adds `safeSetCapabilityValue()` and `setCapabilityValueSafe()` to `lib/TuyaSpecificClusterDevice.js`.

### 2026-06-29 20:10:52-20:11:04 UTC - Solar flow trigger crash

- Symptom: `solar_sunset_detected` failed because token `elevation` was `undefined` while Homey expected a number.
- Location reported by Homey: `lib/flow/FeatureFlowCards.js`, sunset trigger emission.
- Root cause: `FlowCardTrigger.trigger()` was called with card arguments in the token position, so declared tokens such as `elevation` were absent.
- Patch: sunrise/sunset emissions now pass sanitized token payloads first and state second, with numeric fallbacks for `elevation` and `azimuth`.
- Regression test: `test/feature-flow-cards.test.js` verifies a sunset event with missing solar data still emits valid Homey tokens.

## Privacy

The report intentionally omits mailbox message IDs, user email addresses, Homey IDs, and raw diagnostic payloads.
