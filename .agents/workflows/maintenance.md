# Workflow: Autonomous Maintenance & Repair

This workflow defines the steps for the periodic "Self-Healing" loop of the Universal Tuya app.

## Steps

1. **Ingest Intel**
    - Run `.agents/skills/ingest-community-intel.js`.
    - Redact PII using `lib/utils/mask-pii.js`.
    - Result: `state/community-intel.json`.

2. **Discover Backlog**
    - Run `github-issue-manager.js` (PII-aware).
    - Identify new device requests and confirmed bugs.

3. **Self-Heal Drivers**
    - Trigger `scripts/maintenance/master-self-heal.js`.
    - Apply heuristic mappings to `driver-mapping-database.json`.
    - Verify mappings against Tuya protocol specs (Truth-First).

4. **Verify Compliance**
    - Run `.agents/skills/audit-sdk3.js`.
    - Ensure new driver logic adheres to Homey SDK 3 standards.

5. **Deploy Candidate**
    - Run `scripts/_final_validate.js`.
    - Generate `app.json` and driver manifests.
    - Post PR with anonymized changelog.

## Security Gates
- **Gate 1**: Any data from GitHub/Forum must be masked before `stage/`.
- **Gate 2**: No code is committed without `homey app validate` success.
- **Gate 3**: Secrets must never appear in `scripts/` or `.agents/` logs.
