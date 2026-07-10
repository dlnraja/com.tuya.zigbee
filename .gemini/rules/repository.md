# Repository Rules & Architectural Standards

##  Core Stability (SDK 3 Compliance)
1.  **Flow Card Safety**: ALWAYS wrap `getTriggerCard`, `getActionCard`, and `getConditionCard` in `try-catch` blocks. Use `this._getFlowCard(id, type)` helper where available.
2.  **Explicit Flow IDs**: NEVER use "naked" `getDeviceTriggerCard()` without an ID argument.
3.  **This-Prefix Enforce**: ALWAYS use `this.` when calling SDK methods like `setCapabilityValue`, `getSettings`, or `addCapability` to avoid `ReferenceError`.
4.  **Asynchronous Integrity**: All method overrides (`onNodeInit`, `onDeleted`, `onSettings`) MUST be `async` and properly awaited.
5.  **Defensive getDevice**: Use the defensive `getDeviceById` override in drivers to prevent crashes during device removal.

##  Case-Less Architecture
1.  **Universal Matching**: Use `lib/utils/CaseInsensitiveMatcher.js` for ALL comparisons involving `manufacturerName`, `productId`, or `modelId`.
2.  **Manifest Integrity**: All fingerprints in `driver.compose.json` MUST be lowercase (except for specific brands like `SONOFF` or `eWeLink`).
3.  **Match Helper**: Prefer `CI.equalsCI(a, b)` and `CI.includesCI(arr, val)` over manual transformations.

##  Autonomous Maintenance
1.  **Self-Healing Engine**: Maintenance scripts in `scripts/maintenance/` are the source of truth for repository health.
2.  **Intelligence Ingestion**: Fingerprints from community intel (`data/community-intel.json`) must be ingested across drivers.
3.  **Shadow Mode**: All automated forum posting is gated by `SHADOW_MODE=true` by default.

##  Device Logic & Driver Health
1.  **Unified Engine**: Use `UnifiedSwitchBase` or `BaseUnifiedDevice` as the base for all new drivers.
2.  **DP Documentation**: Mapping DPs for multiple variants MUST include `variant` comments.
3.  **Physical Button Detection**: Use `PhysicalButtonMixin` for reliable reporting of wall switch presses.
4.  **Flow Action Routing**: Flow action cards MUST use `triggerCapabilityListener` to ensure Zigbee commands are sent, not just UI state updated.
5.  **NaN Safety**: Use `safeParse`, `safeDivide`, and `safeMultiply` from `tuyaUtils.js` for all arithmetic on incoming Zigbee data.

##  Maintenance & Cleanup
1.  **Branding**: Purge "Hybrid" or "Nexus" branding in favor of "Unified Engine" or "Universal".
2.  **String Integrity**: Ban invisible characters and `??` corruption artifacts in the codebase.
3.  **Tab Ban**: Use spaces for indentation, especially in `.yml` files.
