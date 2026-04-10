# Universal Tuya Architectural Rules (v7.2.0)

## R1: Universal Interpretation
- EVERY incoming trame must pass through `IntelligentFrameAnalyzer`.
- NO driver should implement raw parsing; use the analyzer's decoded output.

## R2: Manufacturer Quirks (Exotic Handling)
- Proprietary brand logic (Xiaomi, Bosch, Legrand) MUST reside in `ExoticQuirkEngine.js`.
- Use `ManufacturerFeatureMapper` to bridge obscure clusters to Homey capabilities.

## R3: Protocol Deduplication
- Use `_isDuplicateCorrelation` with a 1000ms window for all state changes.
- Never trigger a flow card without checking the sequence correlation key.

## R4: Adaptive Resilience
- Capacities are DISCOVERED in real-time if an unknown cluster reports data.
- Capabilities are only REMOVED after a 7-day silent window.

## R5: CI/CD Harmony
- All specialized workflows (triage, sync, promo) must be orchestrated by the Nexus Workflows.
- Use `concurrency: global-cicd` to prevent SDK collisions.

## R6: High-End Parity (Philips Hue+)
- Bulbs must support `AdaptiveLightingManager` (Natural Light).
- Permanently powered devices must support `Radio Sensing` (RSSI/LQI fluctuation) for presence.
