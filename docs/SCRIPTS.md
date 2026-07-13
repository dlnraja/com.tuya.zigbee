# Script Documentation

> Tuya Unified Zigbee for Homey Pro
> Version: 9.0.40 | Last Updated: 2026-06-18
> Total Scripts: 457

---

## Table of Contents

1. [CI Scripts](#ci-scripts)
2. [Validation Scripts](#validation-scripts)
3. [Scanner Scripts](#scanner-scripts)
4. [Automation Scripts](#automation-scripts)
5. [Analysis Scripts](#analysis-scripts)

---

## CI Scripts

Location: `scripts/ci/` (22 scripts)

### pre-commit-checks.js
- **Purpose**: Pre-commit validation checks
- **Usage**: `node scripts/ci/pre-commit-checks.js`
- **Checks**: Syntax, imports, safeSetCapabilityValue, console.log violations

### security-scanner.js
- **Purpose**: Security vulnerability scanning
- **Usage**: `node scripts/ci/security-scanner.js`
- **Checks**: Sensitive files, token leaks, blocked patterns

### check-flow-ids.js
- **Purpose**: Verify flow card ID uniqueness across all drivers
- **Usage**: `node scripts/ci/check-flow-ids.js`
- **Rule**: R15 (Flow Card ID Uniqueness)

### diagnostic-report.js
- **Purpose**: Generate comprehensive diagnostic report
- **Usage**: `node scripts/ci/diagnostic-report.js`
- **Output**: JSON report with driver stats, health metrics, issues

### bug-hunter.js
- **Purpose**: Automated bug detection in codebase
- **Usage**: `node scripts/ci/bug-hunter.js`
- **Detects**: Common crash patterns, missing guards, unsafe operations

### zero-defect-control.js
- **Purpose**: Zero-defect quality gate
- **Usage**: `node scripts/ci/zero-defect-control.js`
- **Exit**: Non-zero if any violations found

### titan-pre-commit.js
- **Purpose**: TITAN protocol pre-commit validation
- **Usage**: `node scripts/ci/titan-pre-commit.js`
- **Checks**: All TITAN protocol rules and patterns

### validate-all-yaml.js
- **Purpose**: Validate all YAML workflow files
- **Usage**: `node scripts/ci/validate-all-yaml.js`

### ai-fallback-repair.js
- **Purpose**: AI-powered fallback code repair
- **Usage**: `node scripts/ci/ai-fallback-repair.js`

### resolve-collisions.js
- **Purpose**: Resolve fingerprint collisions between drivers
- **Usage**: `node scripts/ci/resolve-collisions.js`

### predict-health.js
- **Purpose**: Predictive device health analysis
- **Usage**: `node scripts/ci/predictive-health.js`

### signature-audit.js
- **Purpose**: Audit device signatures and fingerprints
- **Usage**: `node scripts/ci/signature-audit.js`

---

## Validation Scripts

Location: `scripts/validation/` (19 scripts)

### check-fingerprint-health.js
- **Purpose**: Validate fingerprint integrity across all drivers
- **Usage**: `node scripts/validation/check-fingerprint-health.js`
- **Rule**: R14 (Fingerprint Matching Combined)
- **Run**: After any fingerprint operation

### check-destroyed-guard.js
- **Purpose**: Verify _destroyed guard in all async callbacks
- **Usage**: `node scripts/validation/check-destroyed-guard.js`
- **Rule**: R5 (_destroyed Guard)

### check-super-ondeleted.js
- **Purpose**: Verify super.onDeleted() in all WiFi drivers
- **Usage**: `node scripts/validation/check-super-ondeleted.js`
- **Rule**: R2 (super.onDeleted() WiFi)

### check-circuit-breaker.js
- **Purpose**: Verify CircuitBreaker integration in external API calls
- **Usage**: `node scripts/validation/check-circuit-breaker.js`
- **Rule**: R23 (Circuit Breaker for APIs)

### check-mixin-order.js
- **Purpose**: Verify correct mixin order in device classes
- **Usage**: `node scripts/validation/check-mixin-order.js`
- **Rule**: R3 (Mixin Order)

### check-wifi-lifecycle.js
- **Purpose**: Validate WiFi device lifecycle (onDeleted, onUninit)
- **Usage**: `node scripts/validation/check-wifi-lifecycle.js`

### check-driver-health.js
- **Purpose**: Health check for all drivers
- **Usage**: `node scripts/validation/check-driver-health.js`

### check-driver-collisions.js
- **Purpose**: Detect driver naming collisions
- **Usage**: `node scripts/validation/check-driver-collisions.js`

### check-pairing-collisions.js
- **Purpose**: Detect pairing conflicts between drivers
- **Usage**: `node scripts/validation/check-pairing-collisions.js`

### check-energy-divisor.js
- **Purpose**: Validate energy measurement divisors
- **Usage**: `node scripts/validation/check-energy-divisor.js`
- **Rule**: R18 (Smart Divisor Calibration)

### check-ts0601-catchall.js
- **Purpose**: Check for TS0601 catch-all drivers
- **Usage**: `node scripts/validation/check-ts0601-catchall.js`

### audit-anti-generic.js
- **Purpose**: Audit for generic/catch-all fingerprints
- **Usage**: `node scripts/validation/audit-anti-generic.js`
- **Rule**: R12 (Wildcard Fingerprints Forbidden)

### app-json-dual-layer-validator.js
- **Purpose**: Validate app.json structure
- **Usage**: `node scripts/validation/app-json-dual-layer-validator.js`

### comprehensive-recursive-validator.js
- **Purpose**: Recursive validation of all files
- **Usage**: `node scripts/validation/comprehensive-recursive-validator.js`

### verify_fingerprints_integrity.js
- **Purpose**: Verify fingerprint database integrity
- **Usage**: `node scripts/validation/verify_fingerprints_integrity.js`

### verify_flows_integrity.js
- **Purpose**: Verify flow card integrity
- **Usage**: `node scripts/validation/verify_flows_integrity.js`

---

## Scanner Scripts

Location: `scripts/scanners/` (9 scripts)

### tinytuya-scanner.js
- **Source**: jasonacox/tinytuya (GitHub)
- **Cache TTL**: 24 hours
- **Purpose**: Scan Tuya DP type definitions and device categories
- **Usage**: `node scripts/scanners/tinytuya-scanner.js`

### tuya-local-scanner.js
- **Source**: make-all/tuya-local (GitHub)
- **Cache TTL**: 24 hours
- **Purpose**: Scan YAML config DP mappings and entity types
- **Usage**: `node scripts/scanners/tuya-local-scanner.js`

### hubitat-scanner.js
- **Source**: GitHub Groovy search
- **Cache TTL**: 12 hours
- **Purpose**: Scan Hubitat Tuya Zigbee drivers
- **Usage**: `node scripts/scanners/hubitat-scanner.js`

### smartthings-scanner.js
- **Source**: GitHub YAML search
- **Cache TTL**: 12 hours
- **Purpose**: Scan SmartThings Edge fingerprint files
- **Usage**: `node scripts/scanners/smartthings-scanner.js`

### openhab-scanner.js
- **Source**: openhab-addons (GitHub)
- **Cache TTL**: 48 hours
- **Purpose**: Scan openHAB Zigbee XML thing definitions
- **Usage**: `node scripts/scanners/openhab-scanner.js`

### domoticz-scanner.js
- **Source**: Domoticz Zigbee plugins
- **Cache TTL**: 48 hours
- **Purpose**: Scan Domoticz Lua/Python Zigbee patterns
- **Usage**: `node scripts/scanners/domoticz-scanner.js`

### xiaomi-miot-scanner.js
- **Source**: miot-spec.org + GitHub
- **Cache TTL**: 24 hours
- **Purpose**: Scan Xiaomi MIoT specs and Lumi fingerprints
- **Usage**: `node scripts/scanners/xiaomi-miot-scanner.js`

### csa-iot-scanner.js
- **Source**: csa-iot.org + GitHub
- **Cache TTL**: 7 days
- **Purpose**: Scan CSA certified Zigbee products
- **Usage**: `node scripts/scanners/csa-iot-scanner.js`

### scanner-cache.js
- **Purpose**: Intelligent caching for all 8 scanners
- **Location**: `scripts/scanners/scanner-cache.js`
- **Cache**: `.cache/scanners/` with TTL per source volatility
- **Features**: TTL-based expiry, hash change detection, stats tracking

---

## Automation Scripts

Location: `scripts/automation/` (100+ scripts)

### Key Automation Scripts

#### mega-audit.js
- **Purpose**: Comprehensive codebase audit
- **Usage**: `node scripts/automation/mega-audit.js`
- **Output**: Detailed report of all issues and metrics

#### driver-health.js
- **Purpose**: Health check for all drivers
- **Usage**: `node scripts/automation/driver-health.js`

#### driver-generator.js
- **Purpose**: Generate new driver from template
- **Usage**: `node scripts/automation/driver-generator.js --type sensor --name my_sensor`

#### fingerprint-health-check.js
- **Purpose**: Comprehensive fingerprint health check
- **Usage**: `node scripts/automation/fingerprint-health-check.js`

#### flow-card-check.js
- **Purpose**: Validate flow cards across all drivers
- **Usage**: `node scripts/automation/flow-card-check.js`

#### fix-console-log.js
- **Purpose**: Fix console.log violations in drivers
- **Usage**: `node scripts/automation/fix-console-log.js`

#### fix-fingerprint-conflicts.js
- **Purpose**: Resolve fingerprint conflicts
- **Usage**: `node scripts/automation/fix-fingerprint-conflicts.js`

#### generate-changelog.js
- **Purpose**: Generate changelog from git history
- **Usage**: `node scripts/automation/generate-changelog.js`

#### code-quality-check.js
- **Purpose**: Comprehensive code quality check
- **Usage**: `node scripts/automation/code-quality-check.js`

#### auto-fix-patterns.js
- **Purpose**: Auto-fix common code patterns
- **Usage**: `node scripts/automation/auto-fix-patterns.js`

#### nightly-maintenance.js
- **Purpose**: Nightly maintenance tasks
- **Usage**: `node scripts/automation/nightly-maintenance.js`

#### monthly-scan.js
- **Purpose**: Monthly comprehensive scan
- **Usage**: `node scripts/automation/monthly-scan.js`

#### battery-health-report.js
- **Purpose**: Battery health analysis across all devices
- **Usage**: `node scripts/automation/battery-health-report.js`

#### network-topology-report.js
- **Purpose**: Network topology visualization
- **Usage**: `node scripts/automation/network-topology-report.js`

---

## Analysis Scripts

Location: `scripts/analysis/` (18 scripts)

### audit_all_flow_cards.js
- **Purpose**: Audit all flow cards across drivers
- **Usage**: `node scripts/analysis/audit_all_flow_cards.js`

### audit_drivers.js
- **Purpose**: Comprehensive driver audit
- **Usage**: `node scripts/analysis/audit_drivers.js`

### audit_manufacturer_ids.js
- **Purpose**: Audit manufacturer ID assignments
- **Usage**: `node scripts/analysis/audit_manufacturer_ids.js`

### flow_analysis_patterns.js
- **Purpose**: Analyze flow card patterns
- **Usage**: `node scripts/analysis/flow_analysis_patterns.js`

### forum_analysis_complete.js
- **Purpose**: Analyze forum posts for device requests
- **Usage**: `node scripts/analysis/forum_analysis_complete.js`

### smart_categorize.js
- **Purpose**: Smart device categorization
- **Usage**: `node scripts/analysis/smart_categorize.js`

---

## Common Script Patterns

### Running Scripts
```bash
# Run from project root
node scripts/ci/pre-commit-checks.js
node scripts/validation/check-fingerprint-health.js
node scripts/automation/mega-audit.js

# With npm scripts
npm run validate:recursive
npm run check:all
npm run security-scan
npm run maintenance
npm run fix:auto
```

### NPM Scripts
```json
{
  "validate:recursive": "node scripts/validation/comprehensive-recursive-validator.js",
  "check:all": "node scripts/ci/pre-commit-checks.js",
  "security-scan": "node scripts/ci/security-scanner.js",
  "maintenance": "node scripts/automation/nightly-maintenance.js",
  "fix:auto": "node scripts/automation/auto-fix-patterns.js",
  "check:health": "node scripts/automation/driver-health.js",
  "check:wifi": "node scripts/validation/check-wifi-lifecycle.js",
  "check:mixin": "node scripts/validation/check-mixin-order.js"
}
```

### Exit Codes
- **0**: Success, no issues found
- **1**: Errors found, must fix before commit
- **2**: Warnings found, review recommended

---

## Script Development Guidelines

### Creating New Scripts
1. Place in appropriate directory (`scripts/ci/`, `scripts/validation/`, `scripts/automation/`, `scripts/analysis/`)
2. Use `require()` for project modules
3. Add shebang line: `#!/usr/bin/env node`
4. Handle errors gracefully
5. Return meaningful exit codes
6. Add to package.json scripts if frequently used

### Script Template
```javascript
#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');

// Configuration
const ROOT = path.resolve(__dirname, '../..');

// Main function
async function main() {
  try {
    // Script logic
    console.log('Script completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Script failed:', err.message);
    process.exit(1);
  }
}

main();
```

### Error Handling
- Use try/catch for async operations
- Log errors with context
- Return non-zero exit code on failure
- Never silently swallow errors

### Performance
- Use Buffer-based JSON loading (R4)
- Cache results when possible
- Use streaming for large files
- Respect rate limits for external APIs
