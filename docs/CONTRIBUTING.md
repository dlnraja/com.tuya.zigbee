# CONTRIBUTING.md - Tuya Unified Zigbee

| Metric | Value |
|--------|-------|
| Version | v8.1.71 |
| Drivers | 365 |
| Fingerprints | 29,418 |
| Last Updated | 2026-06-02 |
## 🎯 Principes Directeurs

1. **Shadow Implementation** : Aucune publication publique
2. **Zero Defect** : Chaque module validé syntaxiquement + testé
3. **Permissivité Native** : Drivers adaptatifs sans suffixe 
4. **Rules IA** : Conformité Rules 21, 24, 25

## 🔒 Anti-Patterns à Éviter

### Syntaxe JavaScript
// ❌ WRONG - Unmatched parentheses
return Math.round(safeDivide(uptime*10))), 10);

// ✅ CORRECT
return Math.round(safeDivide(uptime*10), 10);

// ❌ WRONG - if/ternary
if (device.zclNode?.modelId) return device.zclNode.modelId : null;

// ✅ CORRECT
return device.zclNode?.modelId ?? null;

### Manufacturer Names
// ❌ WRONG - Case-sensitive comparison
if (manufacturer === "Tuya") { }

// ✅ CORRECT - Use ManufacturerResolver
const normalized = ManufacturerResolver.normalize(manufacturer);

### Settings Keys
// ❌ WRONG - camelCase
this.settings.get('zb_modelId')

// ✅ CORRECT - snake_case
this.settings.get('zb_model_id')

## 📋 Checklist Avant Commit
- [ ] Syntaxe validée (node -c)
- [ ] ESLint sans erreur critique
- [ ] lint-collisions.js: 0 collisions
- [ ] Version synchronisée (package.json + .homeychangelog.json)
- [ ] Pas de  dans les noms de drivers

## 🔧 Scripts Utilitaires
```bash
# Validation complète
node scripts/automation/lint-collisions.js

# Context ingestion
node scripts/automation/context-ingestion.js

# Community sync
node scripts/community-sync/sync-all.js

# Duplicate fingerprints fix
node scripts/automation/fix-duplicate-fingerprints.js
```

---
Last Updated: 2026-05-20T12:01:26.915Z
# Contributing to the Tuya Zigbee App for Homey

Thank you for taking the time to contribute! We appreciate your support in improving the Tuya Zigbee app and making it more powerful and reliable.

Below are some guidelines to help you make the most effective contributions. These are not hard rules but suggestions to keep things running smoothly. If you have any questions, feel free to reach out.

Make sure you’ve joined the [Homey community](https://community.homey.app/t/app-pro-tuya-zigbee-app/26439) or checked the Apps Github discussions (https://github.com/JohanBendz/com.tuya.zigbee) for more informal interactions and updates.

## Before Submitting a Bug or Feature Request

- **Read the error message** thoroughly and ensure you understand it.
- Search for similar issues in the repository before opening a new one.
- Ensure Homey, your apps, and development tools are up to date.
- Make sure the issue lies with the **Tuya Zigbee app** and not another app or Homey itself.
- Investigate the issue yourself where possible. I highly encourage capable developers to submit pull requests rather than issues!

For regular support, feel free to contact me via Github (https://github.com/JohanBendz/com.tuya.zigbee/issues).

## Creating a Great Bug Report

- **Context**: What were you trying to achieve when the issue occurred?
- Provide detailed steps to **reproduce the issue**. If possible, isolate the smallest amount of code necessary to recreate the problem.
- Include any relevant log files, IDs, or screenshots.
- Detail any troubleshooting steps you have taken, and if possible, suggest a **theory** or **potential fix**.

## Submitting a Feature Request

- **Current situation**: What’s the existing behavior?
- Why is the current behavior problematic?
- Include a detailed proposal, or even better, a **pull request** that demonstrates the solution.
- Explain the **use case**: Who needs this feature and why?
- List any potential issues or caveats with the feature.

## Submitting a Pull Request (PR)

- Keep the changes **focused on one issue** or feature to avoid unnecessary complexity.
- When adding support for a device, please stick to one device per PR.
- Ensure your changes are contained within a **single commit**.
- **Rebase** from the latest master branch to avoid conflicts.
- Stick to the existing **code formatting** and structure to maintain consistency.
- Ensure any changes are covered by **tests**, and that they pass before submitting the PR.
- Add **documentation** for any new functionality or significant changes.

## Speeding Up the Review Process

Merging pull requests can take time. Here’s how you can help:

- Ask fellow developers to **review** and test your changes.
- Keep your PR as **small** and focused as possible.
- Make sure your changes are well-documented and explain **why** they’re necessary.
## Project Stats

| Metric | Value |
|--------|-------|
| Version | v8.1.177 |
| Drivers | 320 |
| Fingerprints | 21,117 |
| Last Updated | 2026-06-08 |


## How to Add a Device

1. Get your device fingerprint from Homey Developer Tools
2. Find the matching driver in `drivers/` directory
3. Add the fingerprint to `driver.compose.json`
4. Test with `homey app run`
5. Submit a PR or open an issue


## Bug Reports

- Include your device fingerprint (`_TZxxxx_xxxxx`)
- Include Homey developer tools diagnostic report
- Issues are auto-triaged and responses generated daily


## Device Finder

Check [Device Finder](https://dlnraja.github.io/com.tuya.zigbee/) to see if your device is already supported.
Each device card includes a bug report button that creates a pre-filled issue.

