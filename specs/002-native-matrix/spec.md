# Spec 002: Native vs non-native cluster/capability matrix
## Problem
Drivers sometimes list Tuya-private clusters in their pairing manifest, and some mfr+pid couples live on two drivers.
## Outcome
SSOT `data/native-matrix.json` + `docs/NATIVE_MATRIX.md`: per cluster id, native or not (zigbee-clusters class exists and
homey-zigbeedriver maps capabilities), mapped capabilities, and how often it is seen in repo interviews/diags/issues.
## Requirements
- MUST derive "native" from athombv/node-zigbee-clusters + athombv/homey-zigbeedriver; enrich with cluster counts from
  interviews/diags/issues (counts + source links only, no raw dumps).
- MUST classify 0xEF00, 0xEF01, 0xE000, 0xE001 and 0xFC00–0xFFFF as non-native.
- MUST gate CI: fail on a NEW non-native cluster in `zigbee.endpoints.*.clusters`, or a NEW case-insensitive mfr+pid couple on two drivers.
## Constitution: D1, D3, D5, C2.
## Acceptance
`scripts/gates/native-matrix-gate.js` runs in PR Gate and Auto-Fix pipeline; `data/native-matrix-baseline.json` freezes
existing violations (252 endpoint entries, 705 dual couples at creation) and only shrinks.
