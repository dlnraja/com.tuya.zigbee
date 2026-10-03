# Spec 004: Non-native low-level layers
## Outcome
Common interface (`read/write/command/onReport`) for non-native channels (Tuya DP 0xEF00, 0xE000/0xE001,
manufacturer-specific, raw frames). Native clusters pass through untouched.
## Requirements
- Fallbacks via raw RX/TX and manual cluster commands, parallel or fallback per device profile.
- Each layer self-disables after N consecutive failures (circuit breaker), logs once.
- Never awaited on the pairing/onNodeInit critical path.
## Existing code: lib/LowLevelBridge.js, lib/layers/ProtocolRxTxChain.js, lib/layers/CrossLayerRedundancy.js, lib/TuyaSpecificCluster.js.
## Constitution: D1, D2.
