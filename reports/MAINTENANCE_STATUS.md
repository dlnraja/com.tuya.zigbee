# Universal Tuya Zigbee Maintenance Status - April 7, 2026

## 🛡️ Stability Overview
The Universal Tuya Zigbee app (v7.0.x) has been successfully stabilized and hardened. Critical regressions in multi-gang switch flow cards have been resolved, and the CI/CD pipeline is now fully automated and resilient.

## 🛠️ Key Repairs & Improvements

### 1. Multi-Gang Flow Card Fix (Issue #170)
- **Problem**: Custom Flow Action cards for 3-gang and 4-gang switches (e.g., "Turn on gang 2") were not triggering the device or were failing to register.
- **Solution**: 
  - Refactored `HybridSwitchBase.js` to use `getDeviceActionCard` (SDK 3 compliant).
  - Implemented dual ID lookup (e.g., `switch_3gang_turn_on_gang2` and `turn_on_gang2`) to handle varied manifest ID patterns.
  - Extracted flow registration into a modular method `_registerFlowActionListeners`.
- **Impact**: Multi-gang switches are now fully controllable via Flow cards as expected.

### 2. Unified BSEED Initialization
- **Problem**: BSEED (ZCL-only) switches had redundant and inconsistent initialization logic, often bypassing new base class features.
- **Solution**: 
  - Cleaned up `Switch2GangDevice`, `Switch3GangDevice`, and `Switch4GangDevice`.
  - Redirected BSEED init to use `this._registerCapabilityListeners()` which now handles both standard capabilities and custom Flow Actions.
  - Maintained critical ZCL-only broadcast filtering logic using the base class `markAppCommand`.
- **Impact**: Single code path for capability registration across all device variants, reducing bug surface.

### 3. CI/CD Pipeline Hardening
- **Problem**: The `daily-everything` workflow was prone to slow builds and lacked intelligent orchestration.
- **Solution**: 
  - Integrated `npm` dependency caching to speed up CI runs.
  - Enabled the `autonomous-maintenance-orchestrator.js` as the primary driver for daily health checks.
  - Re-activated diagnostic workflows (pending credential population in `.env`).

## 🔍 Remaining Recommendations
1. **Credentials**: Populate `GMAIL_EMAIL` and `GMAIL_APP_PASSWORD` in the repository secrets to enable the full autonomous diagnostic loop.
2. **Punycode**: While the `punycode` package is current, any future migration should prioritize the `builtin/punycode` removal in favor of `tr46` if web-facing validation is added.
3. **Audit**: Monitor the next CI run to ensure that Rule 11 (Prefixing) correctly identifies and fixes any newly added drivers.

---
**Status: STABLE / SDK3 COMPLIANT**
