# Post-Promotion Documentation & Registry Synchronization (MANDATORY)

On every app promotion (draft-to-test / production / branch synchronization), it is mandatory to recursively audit, normalize, and update all markdown documentation files (`.md`), technical registries/reference databases (like `app.json`, `package.json`, fingerprint matrices, and cross-references), dotfiles (`.eslintignore`, `.homeyignore`, etc.), rules configuration files (such as `.clinerule`, `.cursorrules`, etc.), architectural maps, and cartography/index files (like `PROJECT_INDEX.md`, `FINGERPRINT-CROSSREF.md`) to maintain perfect structural alignment with active codebase updates and prevent documentation rot.

## Technical Safeguards
- **Comment robustness in CI/CD pipeline checks**: When grep'ing for banned words, comment lines (`//` or `*`) must be ignored (using `grep -v '^[[:space:]]*//' | grep -v '^[[:space:]]*\*'`) to prevent false-positive failures during code-quality validations.
- **Draft script isolation in STRICT_SYNTAX_GUARD**: The temporary draft or development scripts directory (`temp`) must be explicitly ignored by the syntax checker so only active production, lib, drivers, and standard CI/CD files are validated, keeping the repository's build green.
- **Hybrid-Compatible Base Class Exports**: Base classes exported from `lib/devices/` (like `SensorBase` / `UnifiedSensorBase.js`) must use direct exports together with self-referential class properties (`SensorBase.SensorBase = SensorBase; module.exports = SensorBase;`) to ensure absolute compatibility with both direct destructured requires (used by driver implementations) and index-based requires.

## Universal Evolution & Continuous Enrichment Loop
On *every* single prompt execution or task processed, the developer agent MUST execute a comprehensive, full-scope repository sweep. This loop comprises: 
1. **Community Intake**: Scanning and triaging latest community PRs/issues/images (`scan-prs-issues.js`).
2. **Fingerprint Learning**: Auto-learning newly found fingerprints (`auto-learn-fingerprints.js`).
3. **Automated Repair**: Running self-heals and automated code-fixes (`auto-fix-common-issues.js`).
4. **Verification**: Verifying drivers and collectively enriching ALL yml files, javascript source codes, base classes, rules configs (`.clinerule`, `.cursorrules`, `.windsurfrules`), automations, cartographies, indexes, and reference databases. 

No element of the ecosystem must be left stagnant.

## Awesome-Skills Toolkit & Playbooks
Always load, consult, and execute the playbooks and custom toolkits located under `.agents/skills/` (such as `@bug-hunter`, `@logic-lens`, `@codebase-audit-pre-push`, etc.) and draw inspiration from the antigravity-awesome-skills repository (https://github.com/sickn33/antigravity-awesome-skills) to execute high-fidelity audits, systematic troubleshooting, and implement robust self-healing patterns for all coding tasks.
