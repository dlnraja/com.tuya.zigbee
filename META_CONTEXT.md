# 🧠 UNIVERSAL TUYA — AI System Context & Map

## 🌌 Project Vision
Creating a **Zero-Defect, high-performance Zigbee Engine** for Tuya devices on Homey Pro (SDK 3).
Proprietary branding (Nexus/Proxima) has been generalized to **Unified Engine**.

## 📍 Key Architectural Landmarks

### 1. Core Device Inheritance
- **BaseUnifiedDevice.js**: The foundation for ALL devices. Handles hybrid routing (ZCL + Tuya DP).
- **UnifiedSensorBase.js**: Base for battery-powered sensors. Implements efficient reporting and sleep management.
- **TuyaEF00Manager.js**: The brain of the DP protocol. Centralizes DP parsing, encoding, and time sync (DP 0x24).

### 2. Autonomous Pipeline
- **Daily Orchestrator**: `.github/workflows/daily-everything.yml`. Performs full fleet triage, fingerprint research, and self-healing.
- **Master CI/CD**: `.github/workflows/master-cicd.yml`. Handles versioning, App Store publishing, and forum updates.

### 3. Intelligence Reference
- **driver-mapping-database.json**: 30,000+ lines of cross-platform fingerprints and DP mappings.
- **reports/INTELLECTUAL-ENRICHMENT.md**: Deep reasoning for architectural decisions and complex device fixes.

## 🛠️ Critical Rules for IAs
- **Flattened Flow Cards**: Never use objects for card names. Use `homey:manager:flow-card:id`.
- **Lowercase Manufacturer**: Always use lowercase manufacturer names in `driver.compose.json` for case-insensitive matching.
- **TimeSync Standard**: Use `GlobalTimeSyncEngine`. Primary cluster 0xEF00 DP 0x24 (36).
- **Zero Placeholder Icons**: All icons must be 500x500 (large) or 75x75 (small) actual device images.

## 📜 Recent Intelligence (v7.4.4)
- **Insoma Dual Valve**: Fixed battery DP 59 and control logic. Supported `_TZE284_eaet5qt5`.
- **LCD Sensors**: Fixed humidity divisor 10 error for `_TZE284_vvmbj46n` variants.
- **Image Audit**: Audited 300+ drivers. Ensured 500x500 compliance.
- **Branding**: All references to legacy engines (Proxima/Nexus) pruned.

**Last Updated**: 2026-04-14 by Antigravity (Google DeepMind)
