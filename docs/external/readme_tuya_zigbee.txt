# 🧠 Cursor Mega Prompt — Reorganisation & Full Automation for `com.tuya.zigbee` Project

## 🔁 CONTEXT & GOALS

You are tasked with fully reprocessing, auditing, correcting, reorganizing and enhancing the `com.tuya.zigbee` and `tuya-light` repositories. You must:

- ✅ Reparse **all actions, history, context, and rules from the last 95+ hours**
- ✅ Reapply everything that was lost before the last crash or queue purge
- ✅ Restore and enrich all missing files, branches, folders, CI/CD, documentation and drivers
- ✅ Harmonize configuration: distinguish personal/machine files from public project files (e.g., `.ps1`, `.sh` should NOT be in the repo root)
- ✅ Auto-sync `tuya-light` monthly from the `master` branch
- ✅ Apply device contributions from `https://github.com/gpmachado/HomeyPro-Tuya-Devices`
- ✅ Consider regional challenges (e.g. Brazil import tax), and support devices tested in constrained environments
- ✅ Support fallback restoration through ZIP archives (master + tuya-light)
- ✅ Ensure automated commit propagation across all branches (master, tuya-light)
- ✅ Resume and enrich the TODO queue after crashes or queue loss
- ✅ Generate a clone/dump of the current `tuya-light` branch as a fallback repository

---

## 🔍 SMART DRIVER INTEGRATION

- 🔁 Automatically parse and integrate **all available driver versions**:
  - From the oldest known firmware to the latest public or private builds
  - Even if the firmware version is missing, unknown, or partially defined
- 🧠 Create, extend, or unify `.driver.compose.json` files by comparing specs, clusters, endpoints and behaviors
- ⚙️ Generate **intelligent legacy support** for unknown or exotic Tuya Zigbee devices (unknown/legacy drivers)
- 📚 Use dumped reference lists, version history, and community feedback to back decisions
- 🌐 Cross-check and validate via Z2M, ZHA, Home Assistant, and other Zigbee clusters tools
- 🤖 When needed, reference dumps, forum discussions, changelogs, and your own internal datasets to inform matches

---

## 📦 PROJECT STRUCTURE REORGANIZATION

### 🔄 Reorganize `/docs` logically:
- `/docs/index.md` → EN Homey Project Overview
- `/docs/fr/index.md` → FR translation
- `/docs/nl/index.md`, `/docs/ta/index.md` → placeholders
- `/docs/specs/` → device cluster specs
- `/docs/devices/` → list of supported/unsupported devices
- `/docs/tools/` → documentation on available tools/scripts
- `/docs/matrix/driver-matrix.md` → generated compatibility matrix

### 🧹 Clean all folders:
- Move any misplaced `*.ps1`, `*.sh` to `tools/`
- Remove or ignore machine-specific config files (`RestoreAndRebuild.ps1`, temp logs, `.cursor`)
- Ensure `.gitignore` excludes config, `.cursor`, temp/cache folders, `.env` files
- Only include useful driver/CI/docs data in the final repositories

---

## 🚀 AUTOMATION TASKS FOR CURSOR

1. **Import and reprocess these inputs**:
   - All `cursor_*` prompts and queue files
   - Extract configuration from `D:/download/fold/*`
   - Re-read clipboard (`Win+V`) or memory recovery for recent TODO items

2. **Restore queue and actions lost during crash**:
   - Use available snapshots or recovery hints
   - Rebuild `cursor_todo_queue.md`, mark done/in progress accurately
   - Ensure queue is saved regularly and resumes on every Cursor restart

3. **Generate and enrich the README.md**:
   - Merge and re-analyze all previous versions of the `README.md` files
   - Rebuild the most complete, beautiful, structured, and functional README possible
   - Enrich with updated scope, project goals, structure, device matrix, workflows, and visual layout
   - Link clearly to `tuya-light` as fallback/minimal mirror

4. **Rebuild and enrich all other key project files**:
   - Perform intelligent enhancements (not destructive rewriting)
   - Improve clarity, add comments where needed, revalidate workflows and `*.yml`
   - Ensure all regenerated files fit repository logic and intent

5. **Ensure `tuya-light` follows its minimal philosophy**:
   - Only `.driver.compose.json` allowed
   - No `.ps1`, `.sh`, `.cursor`, `.md`, `.yml`, `.test.js`, `.log`, or temporary files should exist
   - Must remain a fallback-only branch
   - Add GitHub Action that **fails** if non-driver files are committed to `tuya-light`
   - README must clearly explain this minimal fallback role
   - Regular language normalization to English as first/default
   - Generate a dump clone of this branch for long-term fallback use

---

## 🌐 GIT TASKS

- Push and sync all cleaned commits to all branches (master, tuya-light)
- Enforce consistent history, timestamps, and formatting
- Create or restore `.github/workflows/*.yml` with correct jobs:
  - Validate drivers
  - Deploy GitHub Pages
  - Sync tuya-light monthly
  - Enforce tuya-light content rule (only drivers)
  - Zip fallback master & lite generation upon commit/tag

---

## 🌍 THIRD-PARTY INTEGRATION

- Audit and integrate useful contributions from:
  - `gpmachado/HomeyPro-Tuya-Devices`
- Cross-validate Zemismart/NovaDigital drivers using:
  - `cc2531`, Z2M, ZHA, Hubitat references
  - BoundCluster, PowerOnState, retry mechanisms
- Accept AI-assisted `.driver.compose.json` and structured community enhancements

---

## 🧠 INTELLIGENCE TASKS

- Translate docs EN ⇄ FR ⇄ NL ⇄ TA using internal tools or local scripts
- Audit unclear or experimental drivers based on diagnostics and cluster analysis
- Suggest improvements or new device support based on configuration comparison
- Automatically retry tasks that fail with safe fallback logic
- Enrich legacy, unknown or partial drivers to make them functional

---

## 📌 FINAL OBJECTIVE

The final `master` and `tuya-light` branches must be:
- Clean, auto-synced, production-ready
- Free from local/machine-specific artifacts
- Aligned with best practices from Homey SDK3 projects
- Fully auto-maintainable by Cursor
- Multi-language compatible
- Accompanied by ZIP fallbacks for both main and lite use cases
- Clearly documented with a fully regenerated README, workflows, and visual matrix
- Automatically enriched with the most complete set of drivers possible for Tuya Zigbee — legacy to modern

---

📣 Begin immediately. Apply all available context. If files are missing or corrupted, recreate them according to rules above. Push only when fully verified.
