# 🚀 OPUS 4.6 MEGA-PROMPT — Universal Tuya Maintenance Framework

This framework defines the strict boundaries and architectural imperatives for all AI agents (Gemini, Claude, GPT, etc.) operating on the Universal Tuya Zigbee codebase.

---

## 🏗️ 1. ARCHITECTURAL PILLARS

### L0-L8: The Foundation
*   **L0 (Raw)**: `handleFrame` override on `ZigBeeNode` is the absolute entry point.
*   **L5 (DP Engine)**: `TuyaDPParser` is the source of truth for all `0xEF00` payloads.
*   **L7 (Emulation)**: Software-based fallback for missing hardware features.

### 🆕 L9-L11: The Elite Layers
*   **Layer 9 (Session)**: **Zosung IR Fragmentation**. Must use cluster `0xE004` (Learn) and `0xED00` (Transmit).
    *   *Directive*: Buffer incoming frames on `0xE004` until the "EOD" (End of Data) marker is detected.
    *   *Transcoding*: Support Broadlink/Pronto hex conversion to Zosung raw format.
*   **Layer 10 (Health)**: **Heartbeat Guard**. Monitor Cluster `0x0000`, Attribute `0xFF01` (Tuya Check-in).
    *   *Directive*: If 3 consecutive heartbeats are missed, mark the device as `unavailable` in Homey.
*   **Layer 11 (Sanity)**: **Data Plausibility Filter**.
    *   *Directive*: Reject sensor reports that exceed physics-based deltas (e.g., >10°C change in <5s).

---

## 🎯 2. ZERO-DEFECT OPERATIONAL RULES

### Rule #1: Fingerprint Integrity (MFS + PID)
*   **The Law**: A valid fingerprint match **MUST** combine `manufacturerName` AND `productId`.
*   **Hallucination Guard**: Never assume a driver supports a `manufacturerName` without verifying the specific `productId` (e.g., TS0601, TS0201).

### Rule #2: SDK 3.x Compliance
*   **`this.` Prefix**: Always use `this.homey`, `this.log`, `this.setCapabilityValue`.
*   **Async Overrides**: `onInit`, `onAdded`, `onDeleted`, `onSettings` MUST be `async`.
*   **Flow Safety**: Always wrap flow card lookups in `try-catch` to prevent app-wide crashes if a card ID is missing.

### Rule #3: Case-Insensitive (CI) Protocol
*   **The Law**: All manufacturer strings and IDs are unreliable in their casing.
*   **Directive**: Use `lib/utils/CaseInsensitiveMatcher.js` for ALL comparisons.

### Rule #4: Silent Operation
*   **Doctrine**: No automated forum posting.
*   **Feedback Loop**: Use GitHub Issues and PR comments for user-facing communication.

---

## 🛠️ 3. TECHNICAL SPECIFICATIONS

### Zosung IR Protocol
*   **Cluster 0xE004**: Learning. Command `0x01` starts learning. Frame contains the captured IR code.
*   **Cluster 0xED00**: Transmit. Requires sending the IR payload in a specific Zosung-encoded hex buffer.

### Tuya MCU OTA (v7.4.20+)
*   **Cluster 0xEF00, Command 0x1C**: Used for MCU-level firmware updates.
*   **Safety**: Only initiate if the battery is >50% or the device is mains-powered.

---

## 🤖 4. AI AGENT BEHAVIOR
1.  **Analyze first**: Before any code change, scan the `docs/rules/` directory.
2.  **Verify second**: Use `homey app validate` to catch manifest errors.
3.  **Sanitize third**: Ensure no invisible characters or `??` artifacts exist.
4.  **Ground Truth**: `diagnostics/summary.json` is the ultimate source of truth for runtime errors.

**Version**: 4.6.0 (Opus Standard)
**Last Audit**: 2026-05-01
**Signed**: dlnraja-bot / Antigravity Agent

## AI AUTOMATION RULES (v10.0)
1. **Anti-Degradation**: AI bots MUST NOT remove a manufacturerName (MFS) from a driver.compose.json just because it is found in another driver. It must be kept in both, and collision handled at runtime or pairing logic.
2. **Enrichment**: Any MFS conflict should be logged as MFS_COLLISION_WARNING instead of deleting footprints. This preserves backward compatibility for exotic variants.
3. **MFS + DeviceID Matrix**: Automations must not only check if an MFS is supported, but MUST analyze the exact combination of MFS + DeviceID (e.g., _TZE200_xxxx + TS0601) to finely understand supported features and smartfeatures.
4. **Heuristic Variant Adaptation**: Manage variant differences smartly without degrading the existing code. Adapt heuristically to each version and variation, ensuring the app remains fully functional, stable, and within Athom's size limits.
