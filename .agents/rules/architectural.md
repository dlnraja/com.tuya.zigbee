# Architectural Principles

## 1. Truth-First Policy
- **Database Centralization**: All device identification and capability mapping must rely on the ground-truth `driver-mapping-database.json`.
- **Manifest Integrity**: Fingerprints in `driver.compose.json` must be unique and verified.
- **Deduplication**: Periodic automated audits must run to identify and resolve duplicate mappings or overlapping fingerprints.

## 2. SDK 3 Compliance
- **Modern Managers**: Use `getTriggerCard`, `getActionCard`, `getConditionCard` for flow logic.
- **Reference Equality**: Avoid legacy `getDevice` patterns; use direct capability references.
- **Asynchronous Integrity**: All driver and device initializations must handle `async/await` patterns correctly to avoid race conditions.

## 3. Autonomous Evolution
- **Self-Healing Drivers**: The `SmartDriverAdaptation` layer is designed to bridge unknown Tuya DPs to standard capabilities based on heuristic analysis.
- **Diagnostic Feedback**: Use diagnostic reports from community and crash logs to evolve mapping heuristics iteratively.
- **Safety Fallbacks**: AI-generated mappings must be verified against known Tuya protocol specs before deployment.
