# Contributing to Universal Tuya Zigbee

Thank you for contributing to the Universal Tuya Zigbee project! To maintain the **Zero-Defect Architectural Maturity** of this project, all contributions must adhere to the following rules.

## Architectural Rules (The "Zero-Defect" Guard)

### Rule 21: Capability-Based Flow Filtering
All flow cards MUST be filtered by capability to ensure interoperability. 
- Avoid generic flow cards that trigger for every device.
- Ensure `trigger.compose.json` correctly uses the `capabilities` filter.

### Rule 24: Case-Insensitive Identity Resolution
Manufacturer names and Model IDs in Tuya Zigbee are notoriously inconsistent (mixed case). 
- **NEVER** use manual string comparisons (e.g., `if (mfr === '_TZE200_abc')`).
- **ALWAYS** use the `CaseInsensitiveMatcher` (`CI`) helper.
- Standard pattern: `if (CI.equalsCI(mfr, '_TZE200_ABC')) { ... }`

### Rule 25: TS0601 Standard Time Sync
Devices based on the TS0601 cluster (EF00) often require time synchronization to prevent frequent reboots or reporting failures.
- Ensure your driver implements the standard time sync protocol if it handles TS0601 data points.

## Code Quality Standards

### Syntax Purity
The project maintains a **Strict Syntax Guard**. Every commit is automatically checked with `node --check`.
- Do not commit code with unmatched parentheses, malformed ternaries, or invalid regex.
- Use `npm run lint` or `node scripts/maintenance/STRICT_SYNTAX_GUARD.js` locally before pushing.

### Arithmetic Integrity
To prevent `NaN` or `Infinity` crashes (which are difficult to debug in Homey diagnostics):
- Use `safeDivide(a, b)` and `safeMultiply(a, b)` from `lib/utils/tuyaUtils.js`.
- Always provide a fallback value for divisions.

### Fingerprints
- No wildcards (`*`) in `manufacturerName` (SDK3 requirement).
- Use exact strings as reported in diagnostic logs.

## Submission Process
1. **Fork** the repository.
2. Create a **Feature Branch** (e.g., `fix/identity-resolution` or `feat/new-sensor`).
3. Ensure the **CI Pipeline** passes (Syntax, JSON, Architectural rules).
4. Provide a **Diagnostic Log ID** if adding a new device fingerprint.

---
*Failure to follow these rules will result in an automatic CI/CD rejection.*
