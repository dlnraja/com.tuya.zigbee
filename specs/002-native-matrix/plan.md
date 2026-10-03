# Plan 002
- Gate (done): expand manufacturerName × productId (lower-cased) → couple→drivers; >1 driver = violation.
  Endpoint `clusters` with a non-native id = violation. Only entries absent from baseline fail.
- Note: Homey matches drivers by manufacturerName+productId; endpoint clusters configure bindings/endpoint access, so a
  non-native id there does not block matching but makes init depend on it — tracked for burn-down.
- Generator `scripts/gen/native-matrix.js` (pending) builds SSOT from node_modules zigbee-clusters + homey-zigbeedriver + census.
- Burn-down: resolve dual couples using data/leads/dual-couples.json verdicts, then `--write-baseline`.
