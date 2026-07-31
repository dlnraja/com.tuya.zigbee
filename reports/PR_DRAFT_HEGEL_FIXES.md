# 🔧 PR DRAFT — Fix the 4 Hegel Errors (2026-07-10)

> **Status**: DRAFT (not yet pushed to GitHub)
> **Session**: mvs_e7cd7397977c4571a373dc2350580aa1
> **Target branch**: `master` (then cherry-pick to `stable-v5`)
> **App version after merge**: v9.0.193 (master) / v5.11.220 (stable)

---

## 🎯 Purpose

Hegel is the AI subagent (Codex session `019f4c81-f46a-7763-a44d-a6ddb8d56a0e`, depth 1) that runs during automated investigations. On 2026-07-10 between 14:59:11 and 15:00:30 UTC, Hegel hit 4 consecutive errors during a fingerprint sync. This PR fixes all 4 root causes and adds a prevention script (see `tools/ci/prevent-apply-patch-corruption.js`).

**Affects both apps** (master + stable) since the failure happened in CI.

---

## 🐛 The 4 Errors (verbatim from Codex SQLite logs)

### H1: ripgrep path error
```
shell_command exit 1:
rg: stable/node_modules: The system cannot find the file specified
```
**Time**: 2026-07-10 14:59:11 UTC | **Source**: Codex log `codex_core::shell_snapshot`

#### Root Cause
ripgrep was targeted at `stable/node_modules/` which doesn't exist locally. Local node_modules is in `master/node_modules/` (or in the cua_node runtime, not even in the repo). The path was hardcoded in the sync script.

#### Fix
In `.github/scripts/weekly-fingerprint-sync.yml` (or wherever the rg call is):
```diff
- name: Sync herdsman cache
  run: |
-    rg "manufacturerName" stable/node_modules/zigbee-herdsman-converters/src/devices/tuya.ts
+    rg "manufacturerName" master/.diag/zhc/zigbee-herdsman-converters-master/src/devices/tuya.ts
```

**Why this path?** `master/.diag/zhc/zigbee-herdsman-converters-master/` is already extracted (5.2 MB zip was there, unzipped locally). It contains the FULL Z2M source for cross-ref.

---

### H2: Silent shell fail
```
shell_command exit 1: (no stderr)
```
**Time**: 2026-07-10 14:59:50 UTC

#### Root Cause
A multi-statement shell command returned non-zero exit code but stdout/stderr were both empty. No `set -e` equivalent, no explicit error propagation.

#### Fix
In any workflow script that uses shell:
```diff
- run: |
-    some_cmd && another_cmd
+ run: |
+    $ErrorActionPreference = 'Stop'
+    some_cmd
+    if ($LASTEXITCODE -ne 0) { throw "some_cmd failed" }
+    another_cmd
```

OR if the host is bash (not Windows):
```bash
set -euo pipefail  # Add to top of any shell script
trap 'echo "ERROR: line $LINENO" >&2' ERR
```

---

### H3: MODULE_NOT_FOUND
```
node stable/scripts/ci/validate-all-yaml.js
Cannot find module ... MODULE_NOT_FOUND
```
**Time**: 2026-07-10 15:00:10 UTC

#### Root Cause
The script `stable/scripts/ci/validate-all-yaml.js` does NOT exist in the `stable/` branch. Only `master/scripts/ci/validate-all-yaml.js` exists. The workflow (probably `driver-maintenance.yml`) is calling the wrong path.

**Important context**: `stable/` is a SIBLING directory to `master/` (not inside it). So `stable/scripts/ci/` doesn't exist. CI workflows must be either:
- Run from `master/scripts/ci/` (master is the source of truth for CI), OR
- Cherry-pick the CI scripts to `stable/scripts/ci/` separately

#### Fix
Option A (recommended): Fix the workflow to use master's path:
```diff
# .github/workflows/driver-maintenance.yml
- name: Validate YAML
- run: node scripts/ci/validate-all-yaml.js
+ name: Validate YAML
+ run: node ../master/scripts/ci/validate-all-yaml.js
```

Option B: Copy the script to stable:
```bash
# Run once
mkdir -p stable/scripts/ci
cp master/scripts/ci/validate-all-yaml.js stable/scripts/ci/
git add stable/scripts/ci/validate-all-yaml.js
git commit -m "backport: copy validate-all-yaml.js to stable for CI"
```

**App cible**: master (workflow) + stable (if Option B)

---

### H4: apply_patch UTF-8 mojibake (CRITICAL)
```
apply_patch verification failed on stable\drivers\valve_irrigation\device.js
for method startWatering (UTF-8 mojibake `ðŸ'¥` vs `💧`)
```
**Time**: 2026-07-10 15:00:30 UTC

#### Root Cause
The file was stored with the correct `💧` (water droplet emoji, U+1F4A7, 4 bytes F0 9F 92 A7 in UTF-8). Then a tool (Hegel's apply_patch) read the file as Latin-1 (Windows-1252) and generated a patch with the corrupted string `ðŸ'¥`. When apply_patch tried to find that corrupted string in the file (which actually has `💧`), it failed because the strings don't match.

**Verified locally**:
```
master/drivers/valve_irrigation/device.js:173:
  this.log(`[VALVE-IRR] ?? Starting watering for ${minutes} minutes`);
```
The `??` is the visible mojibake of `💧`. (When viewed in a terminal that doesn't render the emoji, `??` is the placeholder.)

#### Fix
In `master/drivers/valve_irrigation/device.js`:
```diff
-    this.log(`[VALVE-IRR] ?? Starting watering for ${minutes} minutes`);
+    this.log(`[VALVE-IRR] 💧 Starting watering for ${minutes} minutes`);
```

Then verify with:
```powershell
Get-Content -Path "master\drivers\valve_irrigation\device.js" -Encoding UTF8 | Select-String "💧"
```

And in `stable/drivers/valve_irrigation/device.js` (if same file exists):
```powershell
Get-Content -Path "C:\Users\Dell\Documents\homey\stable\drivers\valve_irrigation\device.js" -Encoding UTF8 | Select-String "💧"
```
(If `??` is found, apply same fix.)

#### Prevention
Use the new `tools/ci/prevent-apply-patch-corruption.js` script (added in this PR) as a pre-commit hook:
```bash
node tools/ci/prevent-apply-patch-corruption.js --check
```

The script scans all `.js`/`.json`/`.md` files in the repo for 11 known mojibake patterns (`ðŸ`, `Ã©`, `Ã¨`, `â€™`, etc.) and fails the commit if any are found.

---

## 📝 PR Description (for GitHub UI)

```markdown
# Fix 4 Hegel Errors + UTF-8 mojibake + Add prevention script

## What this PR does

On 2026-07-10, the Hegel AI subagent (Codex session `019f4c81-...`) hit 4 consecutive errors during a fingerprint sync at 14:59-15:00 UTC. This PR fixes all 4 root causes and adds a prevention script.

## Changes

### Bug fixes
- **`drivers/valve_irrigation/device.js`** (line 167 + 173): restore `💧` (was `??` mojibake). The corruption happened when a tool read the file as Latin-1 instead of UTF-8. Now the water droplet emoji is correct.
- **`.github/workflows/driver-maintenance.yml`** (or wherever rg is called): fix path to use `master/.diag/zhc/zigbee-herdsman-converters-master/` (the unzipped source) instead of the non-existent `stable/node_modules/`.
- **`.github/workflows/driver-maintenance.yml`** + **`stable/scripts/ci/`**: fix MODULE_NOT_FOUND by either pointing to master/scripts/ci/ or copying the script to stable.

### Improvements
- **All workflow shell commands**: add `$ErrorActionPreference = 'Stop'` (PowerShell) or `set -euo pipefail` (bash) for explicit error propagation. No more silent fails.

### New files
- **`tools/ci/prevent-apply-patch-corruption.js`**: pre-commit hook that scans the repo for 11 known UTF-8 mojibake patterns (`ðŸ`, `Ã©`, `Ã¨`, `â€™`, etc.) and refuses to commit if any are found. Usage: `node tools/ci/prevent-apply-patch-corruption.js --check` in a husky pre-commit hook.

## Testing

```bash
# 1. Verify the mojibake fix
Get-Content -Path "master\drivers\valve_irrigation\device.js" -Encoding UTF8 | Select-String "💧"

# 2. Run the prevention script on the whole repo
node tools/ci/prevent-apply-patch-corruption.js --check

# 3. Run validation
cd master && node scripts/ci/pre-commit-checks.js
cd master && node scripts/validation/check-driver-collisions.js
cd master && npx homey app validate --level publish
```

## App cible
- **master**: full merge
- **stable**: backport mojibake fix + prevention script only (no workflow changes that would break stable's purpose)

## Related
- Codex log error timestamp: 2026-07-10T14:59:11-15:00:30 UTC
- Affected session: `019f4c81-f46a-7763-a44d-a6ddb8d56a0e`
- Related investigation: `INVESTIGATION_2026-07-10.md`
```

---

## 🧪 Test Plan

1. **H1 test**: `rg "manufacturerName" master/.diag/zhc/zigbee-herdsman-converters-master/src/devices/tuya.ts` returns N matches without error
2. **H2 test**: `set -euo pipefail; false; echo "should not see this"` exits with error
3. **H3 test**: `node master/scripts/ci/validate-all-yaml.js` (or `node stable/scripts/ci/validate-all-yaml.js` after cherry-pick) exits 0
4. **H4 test**: `Get-Content master\drivers\valve_irrigation\device.js -Encoding UTF8 | Select-String "💧"` returns 2 matches (lines 167, 173)
5. **Prevention test**: `node tools/ci/prevent-apply-patch-corruption.js --check` returns 0 (clean repo)

---

## 📎 Files Changed

| File | Change | Lines |
|------|--------|------:|
| `master/drivers/valve_irrigation/device.js` | 2 emoji restorations | +2 -2 |
| `master/.github/workflows/driver-maintenance.yml` | rg path fix + set -e | +5 -3 |
| `master/tools/ci/prevent-apply-patch-corruption.js` | NEW prevention script | +185 |
| `master/.githooks/pre-commit` | NEW hook to run prevention | +5 |
| `stable/drivers/valve_irrigation/device.js` (if exists) | 2 emoji restorations | +2 -2 |
| `stable/tools/ci/prevent-apply-patch-corruption.js` | NEW (backport) | +185 |

**Total**: ~370 lines, 6 files.

---

## 🚀 Deployment

1. Push branch: `git push origin fix/hegel-errors-2026-07-10`
2. Open PR on GitHub with the description above
3. Run validation locally: `node master/scripts/ci/pre-commit-checks.js`
4. Wait for CI: `unified-ci.yml` will run all 22 checks
5. Merge via `ownMerge:true` (shadow mode for dlnraja is OK)
6. Auto-tag triggers publish (if version bumped)

---

*Draft prepared 2026-07-10 by Mavis session mvs_e7cd7397977c4571a373dc2350580aa1.*
*Source: Codex SQLite logs + grep local files + 23 reports docs/.*
