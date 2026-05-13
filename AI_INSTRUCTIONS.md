# 🤖 AI Agent Instructions & Universal Repository Intelligence

**IMPORTANT**: This repository is optimized for autonomous AI coding agents (Claude Code, Antigravity, Squirrel, etc.). To achieve the best results and maintain the "Zero-Defect" standard, follow these guidelines.

## 🚀 The Antigravity Awesome Skills Fleet
All AI agents are encouraged to draw inspiration from and utilize the skill patterns documented in the **Antigravity Awesome Skills** repository:
👉 **[https://github.com/sickn33/antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills)**

### Core Skills in Use:
- **`@logic-lens`**: Use this for all code reviews. Every async function must be idempotent.
- **`@performance-optimizer`**: Apply this to energy-sensitive driver logic.
- **`@squirrel`**: Use the 8-phase pipeline for all new driver implementations.
- **`@technical-change-tracker`**: Use `/tc` patterns to document state transitions and session handoffs.
- **`@codebase-audit-pre-push`**: Run this logic before any push to ensure production readiness.

## 🏗️ Architectural Guardrails
1. **Hybrid Driver System**: NEVER create a standalone driver if a device can be handled by `HybridDriverSystem.js`.
2. **Tuya DP Protocol**: Always prefer the `TuyaUnifiedParser.js` and DP-mapping logic for Tuya-specific devices.
3. **IR Engine**: Use `lib/ir/IRCodeLibrary.js` for all IR-related code generation. Follow the Zosung Base64 format.
4. **SDK3 Compliance**: Strictly follow Homey SDK3 standards. No deprecated `registerAttrReportListener`. Use cluster events.

## 🛠️ Maintenance Cycle
1. **Audit**: Check for junk files and secret leaks.
2. **Heal**: Run `scripts/maintenance/master-self-heal.js`.
3. **Validate**: Run `homey app validate`.
4. **Document**: Update `PROJECT_INDEX.md` and `SYSTEM_CHANGELOG.md` after every major implementation.

---
*This file serves as the primary behavioral directive for all AI agents interacting with the Tuya Unified Zigbee project.*
