# 🌌 TUYA ARCHITECT SOP (Standard Operating Procedure)

- **Name**: tuya-architect-sop
- **Description**: Master playbook for maintaining the Universal Tuya Engine with Zero-Defect standards.
- **Triggers**: "audit tuya", "fix drivers", "standardize fleet", "new tuya device"

## 🎯 Purpose
To ensure every driver in the Universal Tuya Engine adheres to the **5 Levels of Interpretation** and uses the **Antigravity v7.0.0** architecture.

## 🛠️ The 5 Levels of Interpretation
1. **L1: Physical Layer** -> Raw Zigbee Frames (handled by `node.handleFrame` hijacking).
2. **L2: Protocol Layer** -> ZCL vs Tuya DP (handled by `TuyaEF00Manager` / `TuyaProtocolManager`).
3. **L3: Mixin Layer** -> `PhysicalButtonMixin`, `VirtualButtonMixin`, `BatteryMixin`.
4. **L4: Base Layer** -> `UnifiedSwitchBase`, `UnifiedPlugBase`, `TuyaZigbeeDevice`.
5. **L5: Logic Layer** -> `markAppCommand`, `EnrichedDPMappings`, `FlowCardManager`.

## 📋 Steps for New Device Implementation
1. **Identify Protocol**: Determine if the device is standard ZCL or Tuya DP (`_TZE200_`).
2. **Apply Mixins**: Always include `PhysicalButtonMixin` and `BatteryMixin` for battery devices.
3. **Check Bidirectional Sync**: Ensure `registerCapabilityListener` calls `markAppCommand`.
4. **Map DPs**: Use `EnrichedDPMappings.js` for sensor data transformation.
5. **Register Flows**: Add `physical_pressed` flow cards in `app.json`.

## 🧪 Validation Patterns
- Run `node scripts/automation/mega-audit.js` before every commit.
- Verify `totalPhysicalPresses` in device store after physical testing.
- Check `markAppCommand` adoption in all gang switches.

## 💡 Pro-Tips
- Use `claude-code-local` for deep repository scans to avoid cloud latency.
- Leverage `antigravity-awesome-skills` to find community-validated DP patterns for exotic hardware.

## AI AUTOMATION RULES (v10.0)
1. **Anti-Degradation**: AI bots MUST NOT remove a manufacturerName (MFS) from a driver.compose.json just because it is found in another driver. It must be kept in both, and collision handled at runtime or pairing logic.
2. **Enrichment**: Any MFS conflict should be logged as MFS_COLLISION_WARNING instead of deleting footprints. This preserves backward compatibility for exotic variants.
