---
description: Systematic per-prompt YAML and automation improvement
---

## Rule: Every Prompt Must Improve Automation

At the END of every coding interaction, perform these steps:

### 1. Check State Files
- `.github/state/forum-state.json` for new posts
- `.github/state/github-state.json` for new issues/PRs
- `.github/state/diagnostics-state.json` for new diagnostics
- `.github/state/forum-pm-state.json` for new PMs

### 2. Cross-Reference
- Check new FPs against `drivers/*/driver.compose.json`
- Verify no FP collisions (same FP in multiple drivers)
- Match forum/GitHub reports to existing drivers

### 3. Implement Fixes
- Add missing FPs to correct driver
- Fix collisions (remove from wrong driver)
- Update dpMappings if new DP info found

### 4. Improve YAML Workflows
- If a script was created/modified, ensure it is called in the relevant workflow
- Add retry wrapper for API-dependent steps
- Add JSON validation before commit steps
- Add pipeline-health.js step before commits
- Ensure `continue-on-error: true` on non-critical steps

### 5. Validate
- `node -e "require('js-yaml').load(require('fs').readFileSync(f))"` for YAML
- `node --check` for JS scripts
- Verify driver.compose.json is valid JSON
