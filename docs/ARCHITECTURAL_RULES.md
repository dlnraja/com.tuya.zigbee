# Tuya Unified Architectural Rules (v7.5.31)

## R1: Universal Interpretation
- EVERY incoming frame must pass through `IntelligentFrameAnalyzer`.
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
- All specialized workflows (triage, sync, promo) must be orchestrated by the Hybrid Engine Workflows.
- Use `concurrency: global-cicd` to prevent SDK collisions.

## R6: High-End Parity (Philips Hue+)
- Bulbs must support `AdaptiveLightingManager` (Natural Light).
- Permanently powered devices must support `Radio Sensing` (RSSI/LQI fluctuation) for presence.

## R7: Smart Feature Emulation
- Devices with missing hardware features (Child Lock, Energy reporting, timers) MUST use software compensation via `SmartFeatureEmulationMixin`.
- Safety thresholds (Overload protection) are mandatory for all `energy.mains` devices.
- Use `IntelligentInferenceEngine` to predict battery depletion or signal failure before it impacts user experience.

## R24: Caseless & Accent-Permissive Pairing (Rule 24)
- **Unified Normalization:** Every manufacturer name and product/model ID must be normalized using Unicode-decomposed (`NFKD`) cleaning to strip accents, emojis, and special characters.
- **Lowercase Snake-Case Keying:** All resolution is keyed in standard lowercase snake_case to avoid mismatching variants (e.g., `_TZE200_kb5noeto`, `_tze200_KB5NOETO`, `_Tze200_Kb5noeto` are mapped to the same entry).
- **O(1) Dynamic Matcher Indexing:** Pair matching must construct an index memory hash map upon launch for high performance lookups rather than linear array sweeps.
- **Global Variant Resolvers:** Custom manufacturer maps (like `data/manufacturers.json`) are checked to link exotic variants (e.g., `_TZE200_1234abcd`) back to their canonical brand drivers.

## R25: Promotion-Time Documentation & Registry Sync (Rule 25)
- **Mandatory Registry Sync:** On every app promotion (draft-to-test / production / branch synchronization), it is mandatory to recursively audit, normalize, and update all markdown documentation files (`.md`), technical registries/reference databases (like `app.json`, `package.json`, fingerprint matrices, and cross-references), dotfiles (`.eslintignore`, `.homeyignore`, etc.), rules configuration files (such as `.clinerule`, `.cursorrules`, etc.), architectural maps, and cartography/index files (like `PROJECT_INDEX.md`, `FINGERPRINT-CROSSREF.md`) to maintain perfect structural alignment with active codebase updates and prevent documentation rot.
- **CI/CD Comment Robustness:** When grep'ing for banned words, comment lines (`//` or `*`) must be ignored (using `grep -v '^[[:space:]]*//' | grep -v '^[[:space:]]*\*'`) to prevent false-positive failures during code-quality validations.
- **Strict Syntax Guard Isolation:** The temporary draft or development scripts directory (`temp`) must be explicitly ignored by the syntax checker so only active production, lib, drivers, and standard CI/CD files are validated, keeping the repository's build green.
- **Hybrid-Compatible Base Exports:** Base classes exported from `lib/devices/` (like `SensorBase` / `UnifiedSensorBase.js`) must use direct exports together with self-referential class properties (`SensorBase.SensorBase = SensorBase; module.exports = SensorBase;`) to ensure absolute compatibility with both direct destructured requires (used by driver implementations) and index-based requires.

## R26: Universal Evolution & Continuous Enrichment Loop (Rule 26)
- **Continuous Lifecycle Sweep:** On *every* single prompt execution or task processed, the developer agent MUST execute a comprehensive, full-scope repository sweep.
- **Components of the Loop:** This loop comprises: scanning and triaging latest community PRs/issues/images (`scan-prs-issues.js`), auto-learning newly found fingerprints (`auto-learn-fingerprints.js`), running self-heals and automated code-fixes (`auto-fix-common-issues.js`), verifying drivers, and collectively enriching ALL yml files, javascript source codes, base classes, rules configs (`.clinerule`, `.cursorrules`, `.windsurfrules`), automations, cartographies, indexes, and reference databases. No element of the ecosystem must be left stagnant.


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
- All specialized workflows (triage, sync, promo) must be orchestrated by the Hybrid Engine Workflows.
- Use `concurrency: global-cicd` to prevent SDK collisions.

## R6: High-End Parity (Philips Hue+)
- Bulbs must support `AdaptiveLightingManager` (Natural Light).
- Permanently powered devices must support `Radio Sensing` (RSSI/LQI fluctuation) for presence.
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
- All specialized workflows (triage, sync, promo) must be orchestrated by the Hybrid Engine Workflows.
- Use `concurrency: global-cicd` to prevent SDK collisions.

## R6: High-End Parity (Philips Hue+)
- Bulbs must support `AdaptiveLightingManager` (Natural Light).
- Permanently powered devices must support `Radio Sensing` (RSSI/LQI fluctuation) for presence.
26: 
27: ## R7: Smart Feature Emulation
28: - Devices with missing hardware features (Child Lock, Energy reporting, timers) MUST use software compensation via `SmartFeatureEmulationMixin`.
29: - Safety thresholds (Overload protection) are mandatory for all `energy.mains` devices.
30: - Use `IntelligentInferenceEngine` to predict battery depletion or signal failure before it impacts user experience.
