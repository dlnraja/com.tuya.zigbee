# .github/AI_RULES.md - Complete AI Agent Instructions

## Overview

This document provides comprehensive instructions for AI agents working on the Universal Tuya Zigbee project. It covers skills inventory, security rules, development workflow, and behavioral guidelines.

## Skills Inventory

### Core Skills (Antigravity Awesome Skills Fleet)

| Skill | Description | Use Cases |
|-------|-------------|-----------|
| **@logic-lens** | Code reviews with idempotency checks | Every async function review |
| **@performance-optimizer** | Energy-sensitive driver optimization | Energy monitoring drivers |
| **@squirrel** | 8-phase pipeline for new drivers | New device implementations |
| **@technical-change-tracker** | Document state transitions | Session handoffs, migrations |
| **@codebase-audit-pre-push** | Pre-push production readiness | All pushes to master |

### Custom Skills

| Skill | File | Purpose |
|-------|------|---------|
| **HOMEY_SDK3_EXPERT** | `skills/HOMEY_SDK3_EXPERT.md` | SDK3 patterns, anti-patterns |
| **TUYA_ARCHITECT_SOP** | `skills/TUYA_ARCHITECT_SOP.md` | 5 Levels of Interpretation |
| **TUYA_DP_MASTER** | `skills/TUYA_DP_MASTER.md` | DP mapping, protocol detection |
| **SYNC_PROTOCOL** | `skills/SYNC_PROTOCOL.md` | Upstream synchronization |

### Skill Usage Patterns

```bash
# Validate with skills
node scripts/automation/mega-audit.js

# Check against architectural rules
node scripts/PRE_COMMIT_CHECKS.js

# Security scan
node scripts/ci/security-scanner.js

# Pre-push validation
npm run precommit:full
```

## Security Rules

### 1. Credential Protection

**NEVER commit**:
- GitHub tokens (`gho_*`, `ghp_*`)
- Athom tokens (`HOMEY_PAT`, `HOMEY_PAT_API`)
- API keys (`GOOGLE_API_KEY`, `OPENAI_API_KEY`)
- Email credentials (`GMAIL_*`)
- Any `.env` files

**ALWAYS use**:
- GitHub Secrets for CI/CD
- `.env.example` as template
- `scripts/ci/security-scanner.js` before commits

### 2. Sensitive File Patterns

Block these files from being committed:
```javascript
const SENSITIVE_PATTERNS = [
  '*.key', '*.pem',
  'config.json', 'secrets.json',
  'credentials.json', 'token.json',
  'oauth2.keys.json', 'client_secret*.json',
  '.env*'
];
```

### 3. GitHub Token Management

**Token Types**:
- `GITHUB_TOKEN`: Auto-provided, current repo only
- `GH_PAT`: Cross-repo access (scopes: repo, read:org)
- `HOMEY_PAT`: Athom App Store publishing
- `HOMEY_PAT_API`: Homey Cloud API

**Rotation Schedule**:
- GitHub tokens: 90 days
- Athom tokens: On compromise
- Gmail App Passwords: Permanent

### 4. Workflow Security

**Required Guards**:
```bash
# Check for missing secrets
if [ -z "$SECRET" ]; then
  echo "SECRET not configured, skipping..."
  exit 0
fi
```

**Never**:
- Commit secrets to workflow files
- Use secrets in echo statements
- Log sensitive data
- Share secrets across repos

## Development Workflow

### 1. Pre-Commit Checklist

```bash
# 1. Syntax check
node --check lib/**/*.js drivers/**/*.js

# 2. Validation
npm run validate:recursive

# 3. Security scan
npm run security-scan

# 4. Size check
npm run check-build

# 5. Documentation update
npm run build-docs
```

### 2. Pre-Push Validation

```bash
# 1. Full validation
npm run precommit:full

# 2. Integration test
npm test

# 3. Linting
npm run lint

# 4. Documentation
npm run build-docs
```

### 3. Post-Push Monitoring

1. Monitor CI pipeline
2. Check draft publication
3. Verify test channel
4. Update documentation
5. Review GitHub Actions logs

### 4. Emergency Procedures

**App Crash on Boot**:
1. Check Safe Require: Wrap all `require()` in try/catch
2. Validate app.json: `node scripts/validate/homey-mandatory-check.js`
3. Check bundle size: < 7MB
4. Review recent commits

**Device Not Responding**:
1. Check fingerprint matching
2. Verify DP mappings
3. Check throttle limits
4. Review health monitor logs

**Memory Leak**:
1. Check `_destroyed` guard
2. Verify `_destroyDevice()` cleanup
3. Review timer/interval cleanup
4. Check for unclosed sockets

## Behavioral Guidelines

### 1. Context First

**Mandatory Steps**:
1. Read `AI_CONTEXT_MANDATE.md`
2. Read `GLOBAL_INVESTIGATION_PLAN.md`
3. Read `ARCHITECTURE_AI.md`
4. Read relevant skill files

### 2. Structured Thinking

```
1. Read context files
2. Analyze current state
3. Identify dependencies
4. Plan changes
5. Execute incrementally
6. Verify each step
7. Document decisions
```

### 3. Tool Usage

**Best Practices**:
- Use `Read` for specific file sections
- Use `Grep` for pattern searching
- Use `Glob` for file discovery
- Use `Edit` for precise modifications
- Use `Bash` for validation commands only

**Avoid**:
- Reading entire large files
- Unnecessary file operations
- Blind code edits without context
- Skipping validation steps

### 4. Incremental Verification

**Rule**: Do not attempt to fix 10 things at once.

**Process**:
1. Plan one logical change
2. Execute the change
3. Verify the change
4. Reflect on outcome
5. Proceed to next change

### 5. Anti-Hallucination Rules

**Verify Before Using**:
- All SDK3 methods exist
- File paths against actual structure
- Code patterns against working examples
- Official Homey SDK documentation

**Never Assume**:
- Method signatures
- File locations
- Configuration values
- Dependency versions

## Architecture Reference

### Device Class Hierarchy
```
Homey.Device (SDK3)
  ZigBeeDevice (homey-zigbeedriver)
    TuyaZigbeeDevice (lib/tuya/TuyaZigbeeDevice.js)
      TuyaHybridDevice (lib/devices/TuyaHybridDevice.js)
        BaseHybridDevice (lib/devices/BaseHybridDevice.js)
          HybridSwitchBase (lib/devices/HybridSwitchBase.js)
            + PhysicalButtonMixin + VirtualButtonMixin
          HybridSensorBase (lib/devices/HybridSensorBase.js)
          HybridCoverBase (lib/devices/HybridCoverBase.js)
          HybridLightBase (lib/devices/HybridLightBase.js)
          HybridPlugBase (lib/devices/HybridPlugBase.js)
          HybridThermostatBase (lib/devices/HybridThermostatBase.js)
          ButtonDevice (lib/devices/ButtonDevice.js)
```

### 11-Layer Zigbee Pipeline
| Layer | Component | Purpose |
|-------|-----------|---------|
| L0 | TuyaZigbeeDevice.js | Raw frame interception |
| L1 | UniversalThrottleManager.js | Flow control |
| L2 | IntelligentProtocolRouter.js | Route ZCL vs Tuya DP |
| L3 | TuyaBoundCluster.js | Binding & command capture |
| L4 | TuyaEF00Manager.js | DP decoding |
| L5 | GlobalTimeSyncEngine.js | Time sync |
| L6 | PhysicalButtonMixin.js | Button deduplication |
| L7 | BaseHybridDevice.js | Capability mapping |
| L8 | DynamicCapabilityManager.js | Auto-discovery |
| L9 | SessionManager | Fragmented IR packets |
| L10 | HealthMonitor | Heartbeat tracking |
| L11 | SanityFilter.js | Noise filtering |

## Critical Rules

### Fingerprint Matching
- **Rule**: `manufacturerName` + `productId` (COMBINED) must match
- Same mfr in multiple drivers is NORMAL if productId differs
- Use `CaseInsensitiveMatcher.js` - manual `.toLowerCase()` forbidden
- **NO WILDCARDS** in manufacturerName

### Settings Keys
- Use `zb_model_id` (NOT `zb_modelId`)
- Use `zb_manufacturer_name` (NOT `zb_manufacturerName`)

### Flow Cards
- ID pattern: `{driver}_physical_gang{N}_{on|off}`
- NO `titleFormatted` with `[[device]]` (causes bugs)
- Virtual buttons MUST use `this.setCapabilityValue()` through L14 hardening

### Import Paths
```javascript
// CORRECT:
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');

// WRONG:
const TuyaZigbeeDevice = require('../../lib/TuyaZigbeeDevice');
```

### Switch Mixin Order
```javascript
class Device extends PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase))
```

### Backlight Values
- Strings only: `"off"`, `"normal"`, `"inverted"`
- NEVER numeric comparisons (=== 0, === 1, '0', '1')
- Map with ternary: `const lightMode = backlightMode === 'normal' ? 1 : 2;`

## Anti-Patterns (BANNED)

### Linear Battery Formulas
```javascript
// STRICTLY BANNED:
const percent = (voltage - 2.5) / 0.5;

// CORRECT:
const percent = UnifiedBatteryHandler.calculateFromVoltage(voltage, '3V_2100');
```

### Direct console.log
```javascript
// BANNED:
console.log('Device initialized');

// CORRECT:
this.log('Device initialized');
this.error('Failed:', err);
```

### Raw setCapabilityValue
```javascript
// BANNED (unsafe after destroy):
this.setCapabilityValue('onoff', true);

// CORRECT (hardened):
this.safesetCapability('onoff', true);
```

## Memory Management

### Buffer-Based JSON Loading (Critical)
```javascript
// BANNED (creates UTF-16 string, causes OOM):
const data = JSON.parse(fs.readFileSync(fpath, 'utf8'));

// CORRECT (uses Buffer directly):
const data = JSON.parse(fs.readFileSync(fpath));
```

### Device Lifecycle
```javascript
async onDeleted() {
  this._destroyed = true;
  await this._destroyDevice();
}

async onUninit() {
  this._destroyed = true;
  await this._destroyDevice();
}
```

## Performance Optimization

### Throttling
- RX: 120 messages/min per device
- TX: 30 commands/min per device
- Energy updates: Batch to save CPU

### Memory Limits
- Homey Pro: 64MB heap limit
- Bundle: < 7MB compressed
- Use Buffer-based JSON loading

### Deduplication
- 200ms debounce for button presses
- 1.5s deduplication window
- 5min/2% battery deduplication

## Troubleshooting

### Common Issues

#### OOM Crash
- Cause: Large JSON loading as UTF-16 string
- Fix: Use Buffer-based loading

#### Phantom Capabilities
- Cause: Fallback to feature-bloated configs
- Fix: Use robust profiles

#### Double-Division Bug
- Cause: AdaptiveDataParser + dpMappings both dividing
- Fix: Use `smartDivisorDetect()`

#### Ghost Button Presses
- Cause: Missing markAppCommand()
- Fix: Always call `this.markAppCommand()` before sending commands

## Key Files Reference

| File | Purpose |
|------|---------|
| `app.js` | App entry point |
| `lib/tuya/TuyaZigbeeDevice.js` | Base device class |
| `lib/devices/BaseHybridDevice.js` | Master base |
| `lib/tuya/TuyaEF00Manager.js` | DP report handler |
| `lib/tuya/DeviceFingerprintDB.js` | Fingerprint database |
| `lib/utils/CaseInsensitiveMatcher.js` | Case-insensitive matching |
| `lib/managers/SmartDivisorManager.js` | Smart divisor detection |
| `lib/battery/UnifiedBatteryHandler.js` | Non-linear battery calculation |

---

*Generated by Claude Code - 14 June 2026*
*Complete AI Agent Instructions*
