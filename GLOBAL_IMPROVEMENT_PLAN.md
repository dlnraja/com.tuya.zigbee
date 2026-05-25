# 🌍 GLOBAL IMPROVEMENT PLAN — Phoenix Sovereign Unified Engine v9.0.0+
> **Branch**: `master` (Experimental/Beta) + `stable-v5` (Production/Stable)  
> **App ID**: `com.dlnraja.tuya.zigbee` (Stable app: `com.dlnraja.tuya.zigbee.stable`)  
> **Status**: ACTIVE & SECURED | **Zero-Defect Publish Quality Gate**: 100% Passed  

---

## 🚨 MANDATORY ENTRY & EXECUTION SAFEGUARD (LAYER 12 COMPLIANCE)

> [!IMPORTANT]
> **EVERY SINGLE TIME** an AI Agent, local Claude Code instance, or IDE runtime begins execution or processes a task, it **MUST** recursively ingest the following references, rules, and specifications in strict order BEFORE proposing any change:
> 1. **Read [AI_CONTEXT_MANDATE.md](AI_CONTEXT_MANDATE.md)** — Core architecture, branch mapping, and 11-layer pipeline rules.
> 2. **Read [PROJECT_INDEX.md](PROJECT_INDEX.md)** — Master reference index, driver directory list, and 9-layer quality gates.
> 3. **Read [docs/rules/CRITICAL_MISTAKES.md](docs/rules/CRITICAL_MISTAKES.md)** — Static pitfalls (backlight string rules, camelCase keys, mixin hierarchy).
> 4. **Read [docs/GLOBAL_INVESTIGATION_PLAN.md](docs/GLOBAL_INVESTIGATION_PLAN.md)** — Authority framework for multi-source intelligence gathering.
> 5. **Understand the Local Arsenal** — Consult `.agents/skills/` and `.ai/SKILL_REGISTRY.md` to leverage advanced tools.
> 6. **Continuously Enrich Workflows** — Keep YML configurations, documentation files, and automations aligned with active code.

### 🧠 THE HOLISTIC CONTINUOUS IMPROVEMENT PROTOCOL (THINKING MAX)

> [!CAUTION]
> **Mandatory AI Execution Protocol for Both Branches (`master` & `stable-v5`)**:
> - **Cross-Referencing Data**: Systematically invoke JS intelligence scripts (e.g., `gather-intelligence.js`, `scan-forum.js`, `scan-prs-issues.js`) to cross-reference logs, diagnostics, GitHub issues, PRs, and community forum messages.
> - **Deep Thinking & Investigation**: Analyze correlations between new fingerprints, reported bugs, and architecture. Do not just fix symptoms; investigate root causes dynamically across all 227+ drivers.
> - **Holistic Coverage**: Every execution MUST aim to improve and cover the maximum number of new devices, drivers, and variants, dynamically adapting scripts and YAMLs.
> - **Exhaustive Context Ingestion**: Read ALL related architecture files, cartography maps, rule definitions, and specifications BEFORE making changes. Use every available `.js` script to your advantage.

---

## 🌌 HOLISTIC & DYNAMIC RUNTIME ADAPTATION ENGINE

To eliminate pairing mismatches and phantom capabilities, the engine employs a completely dynamic, runtime-adaptive architecture across all 227+ drivers:

```mermaid
graph TD
    A[Zigbee/WiFi Pairing Initiated] --> B[Permissive Matching Engine]
    B -->|Pairing Successful| C[onNodeInit / Constructor]
    C --> D[CapabilityFallbackManager Injection]
    C --> E[UniversalVariantManager Init]
    C --> F[DynamicCapabilityManager Scheduler]
    F -->|5 Minutes Post-Pairing| G[Audit Physical ZCL Clusters]
    G -->|Missing Cluster Detected| H[Dynamic Pruning: removeCapability]
    E -->|Multi-gang / Sub-capabilities| I[Auto-Inject onoff.2, onoff.3]
    D -->|Sanitization Filter| J[Mute Out-of-bounds Temp / Battery Spikes]
```

### 1. Dynamic Power & Battery Pruning Block
*   **The Problem**: USB/AC-powered sensors or wall plugs occasionally advertise `measure_battery` or `alarm_battery` in their manifests, causing phantom UI elements and mobile app crashes.
*   **The Heuristics**: All drivers support runtime power source classification:
    ```javascript
    get mainsPowered() { return true; } // For sockets, lights, and AC-powered devices
    
    // In onNodeInit()
    if (this.mainsPowered && this.hasCapability('measure_battery')) {
        this.log('Mains powered device detected. Pruning battery capability...');
        await this.removeCapability('measure_battery').catch(() => {});
    }
    ```
*   **Linear Battery formulas are strictly BANNED**: All battery reporting utilizes `UnifiedBatteryHandler` with 15+ multipoint non-linear discharge profiles (CR2032, CR2450, AAA, AA) to prevent 0% drops.

### 2. Smart Divisor Auto-Detection (`SmartDivisorManager`)
*   Eliminates manual decimal division bugs (e.g. 0.2°C temperature readings).
*   Auto-detects values using standard `KNOWN_DIVISORS` and `VALID_RANGES`.
*   Auto-caches mappings locally by `(manufacturerName + dpId + capability)`.

### 3. Progressive Capability Enrichment (`PermissiveMatchingEngine`)
*   **Pairing is permissive**: Devices are admitted into the app first and analyzed in detail afterwards.
*   **Post-pairing scheduler**: A 5-minute watchdog scans the physical clusters. If a capability (e.g. `measure_power`) is defined in the driver manifest but its matching cluster (`0b04`) is not physically present, it is dynamically pruned to keep the user interface clean.

---

## 🧠 THE SINGLE-MFR MULTI-VARIANT PARADOX

> [!WARNING]
> A single manufacturer identifier string (e.g. `_TZ3000_abc123`) does **NOT** represent a single physical product variant. It can map to dozens of different configurations, models, and endpoints.

*   **Multi-Variant Logic**: Always check the `productId` (model ID) combined with `manufacturerName` to determine driver routing.
*   **Permissive Fallbacks**: If a device matches a permissive `productId` (like `TS0601` or `TS0001`) but does not have a mapped `manufacturerName` inside `driver.compose.json`, the app routes it into the `universal_fallback` driver where custom DP learning and dynamic capabilities are injected automatically at runtime.
*   **BSEED 3-Gang ZCL Routing**: Devices like `_TZ3000_v4l4b0lp` are routed over standard ZCL OnOff clusters rather than Tuya DP custom mode, bound directly via the `ZCL_ONLY_MANUFACTURERS_3G` database.

---

## 🌐 MULTI-SOURCE INTEGRATION & REFERENCE REGISTRY

The codebase is continuously updated and verified against a massive database of **711 unique reference URLs** categorised across our research scrapers:

| Category | Reference URLs Scope | Primary Scrapers & JS Tools |
|----------|----------------------|-----------------------------|
| **Primary Repos** | `github.com/dlnraja/com.tuya.zigbee`, `github.com/JohanBendz/com.tuya.zigbee` | `github-scanner.js`, `scan-prs-issues.js` |
| **Zigbee Mappings** | `zigbee2mqtt.io/devices/`, `github.com/Koenkk/zigbee-herdsman-converters` | `cross-ref-intelligence.js`, `sync-z2m-mappings.js` |
| **Community Intel** | `community.homey.app/t/140352`, `community.homey.app/t/26439` | `scan-forum.js`, `forum-activity-scraper.js` |
| **Database Queries** | `zigbee.blakadder.com/all.html`, `github.com/blakadder/zigbee` | `internet-research-tool.js`, `sync-external-sources.js` |
| **Proprietary Clusters** | Legrand (`0xFC40`), Xiaomi (`0xFCC0`), Hue (`0xFC03`), Sonoff (`0x0B04`) | `variant-scanner.js`, `pattern-detector.js` |

*   **Shadow Mode Verification**: Scrapers run read-only in GHA CI/CD pipelines to collect community reports silently without posting spam replies or automated messages.
*   **Dual-App Sync**: Every update applied on `master` (`com.dlnraja.tuya.zigbee`) is recursively mirrored into the stable track `stable-v5` (`com.dlnraja.tuya.zigbee.stable`) using `scratch/sync_apps.ps1`.

---

## 🛡️ QUALITY GATEWAY & VERIFICATION PROTOCOL

Every pull request and manual update must be validated locally or in GitHub Actions through the **9-Layer Quality Gateway**:

```
[Layer 1: PR #120 Conformity] ──► No redundant titleFormatted or [[device]] template cards
[Layer 2: Class Inheritance]  ──► Wall switch classes must inherit SwitchBase
[Layer 3-5: Manufacturer]     ──► Strict mapping checks for ysdv91bk, blhvsaqf, walltouch
[Layer 6: Suffix Cleanup]     ──► Absolutely no folder/key suffixing with _hybrid or _hybride
[Layer 7: Case Normalization] ──► Exclusive use of CaseInsensitiveMatcher (no manual toLowerCase)
[Layer 8: Memory Leaks]       ──► Explicit onUninit socket/timer releases in WiFi classes
[Layer 9: Connection Bypass]  ──► Zero direct requires of raw tuyapi (except wifi_camera)
[Layer 10: Mains Mismatch]    ──► Strict error if mainsPowered has battery capability without pruning
[Layer 11: Backlight String]  ──► Backlight values must be string representation ("off"/"normal")
```

### Execution Verification Commands:
```bash
# 1. Enforce all Windsurf / Cursor architectural checks
node .github/scripts/enforce-rules.js

# 2. Local driver structure and flow card integrity
node .github/scripts/validate-drivers.js

# 3. Comprehensive SDK3 Athom publish checks
npx homey app validate --level publish
```

---
**phoenix sovereign unified engine** — engineered for flawless local-first execution.
