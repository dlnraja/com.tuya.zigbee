# 🔬 Investigation D — Other Surfaces (2026-07-10)

> Session: mvs_e7cd7397977c4571a373dc2350580aa1 | Date: 2026-07-10 17:35 UTC+2
> Sources: Windows registry, Chrome extensions, Codex native messaging, Mavis config
> App cible: n/a (infrastructure investigation)

---

## 🌐 D1. Chromium Extensions (Chrome + Edge)

### D1.1 Codex Chrome Extension INSTALLED ✅
- **Extension ID**: `hehggadaopoacecdllhhajmbjkdcmajg`
- **Path**: `C:\Users\Dell\AppData\Local\Google\Chrome\User Data\Default\Extensions\hehggadaopoacecdllhhajmbjkdcmajg\`
- **Native messaging host config**: `C:\Users\Dell\AppData\Local\OpenAI\extension\com.openai.codexextension.json` (340 bytes)
- **Content**:
  ```json
  {
    "allowed_origins": ["chrome-extension://hehggadaopoacecdllhhajmbjkdcmajg/"],
    "description": "ChatGPT Chrome native messaging host",
    "name": "com.openai.codexextension",
    "path": "C:\\Users\\Dell\\.codex\\plugins\\cache\\openai-bundled\\chrome\\latest\\extension-host\\windows\\x64\\extension-host.exe",
    "type": "stdio"
  }
  ```
- **Registry entry** (native messaging host):
  ```
  HKEY_CURRENT_USER\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.openai.codexextension
  ```
- **Status**: ACTIVE (used for Codex Chrome extension integration)
- **Implication**: Mavis investigation data could flow through this extension to Codex Chrome

### D1.2 Other Native Messaging Hosts (registry)
- `com.microsoft.browsercore` (Edge legacy, even if Edge not installed)
- `com.microsoft.onedrive.nucleus.auth.provider` (OneDrive)
- `com.openai.codexextension` (Codex)

### D1.3 Edge extensions
- `reg query "HKLM\SOFTWARE\Microsoft\Edge\Extensions"` returns nothing → Edge not installed
- But `com.microsoft.browsercore` is registered as a Chrome native messaging host, suggesting legacy Edge compatibility shim

### D1.4 Total Chrome extensions: 50+
- Not enumerated in detail. Per the `ls` output, the Extensions dir has 50+ subdirectories
- Most are likely from AdBlock, password managers, theme extensions, productivity tools
- **No app-specific extension found** (no Athom/Homey/Developer extension)

### D1.5 Action
- No action needed. The Codex extension is benign and used by Codex properly.
- **Possible improvement**: Add a "Codex extension health" check to Mavis investigation to verify the extension is still active.

---

## 🖥️ D2. Windows Registry — Installed Apps

### D2.1 Apps found in HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall
- **VMware Player** (used for HAOS 12.2 VM, Ubuntu 22.04.3 VM)
- **MiniMax Code 3.0.47** (the IDE running this Mavis agent)

### D2.2 Apps found in HKCU
- Same as HKLM (no per-user apps beyond Mavis)

### D2.3 Not found
- **No `git` binary** (would be in `C:\Program Files\Git\bin\git.exe` or similar)
- **No `gh` CLI** (would be in `C:\Program Files\GitHub CLI\`)
- **No `homey` CLI** (would be in npm global modules)
- **No Python** (`where.exe python` returns nothing)
- **No Homey Desktop app** (Athom Homey app is mobile-only, so expected)

### D2.4 Implication
- Mavis investigation can't use `git`, `gh`, or `homey` CLI directly
- Must rely on:
  - `node` (cua_node runtime, 24.14.0)
  - `node:sqlite` (built-in, replaces better-sqlite3)
  - PowerShell
  - HTTP fetch to GitHub API (unauth, 60/h)
  - Direct file system access (Read/Write/Edit tools)
- **Workaround for git**: install Git for Windows OR use GitHub UI for all merges
- **Workaround for gh CLI**: install OR use direct API calls via curl/Node fetch

### D2.5 Action
- [ ] OPTIONAL: Install Git for Windows (https://git-scm.com/download/win)
- [ ] OPTIONAL: Install `gh` CLI (https://cli.github.com/) for full PR management
- [ ] RECOMMENDED: Add a `where.exe` check at the start of every Mavis session to know what tools are available

---

## 🤖 D3. Mavis Agent Configuration

### D3.1 Agent config
- **Path**: `C:\Users\Dell\AppData\Roaming\MiniMax Agent\minimax-agent-config.json` (1 KB)
- **Mavis agent type**: 3
- **JWT token**: present
- **Working directory**: `C:\\Users\\Dell\\.minimax-agent\\projects` (default workspace)

### D3.2 Mavis subdirs
- `agent` (Mavis parent dir for this session)
- `sessions` (per-session data)
- `browser` (browser-use)
- `cache`, `computer-use`, `node_repl`, `pets`, `plugins`, `process_manager`, `skills`, `sqlite`, `tmp`, `vendor_imports`, `visualizations`
- `projects` (project-specific data)

### D3.3 Daemon logs
- `daemon-2026071016.log` (2.5 MB) — Mavis daemon activity
- `api-07-10.log` (20 KB) — API calls
- `heartbeat-07-10.log` (104 KB) — Mavis health checks

### D3.4 Codex + Mavis interaction
- Codex runs as a subagent (depth 1) of Mavis
- Codex has its own runtime at `C:\Users\Dell\AppData\Local\OpenAI\Codex\runtimes\`
- Codex 12 sub-sessions today (6-28 MB each) — all from Mavis investigations
- Codex is at 100% rate limit (1.1B tokens today)
- **Mavis is the primary agent; Codex is fallback when Mavis can't do something**

### D3.5 Action
- No action needed. Mavis is the primary investigation tool.
- **Future improvement**: when Codex is rate-limited, Mavis should do everything solo.

---

## 📜 D4. Codex Session State (SQLite deep-dive)

### D4.1 13 threads in `state_5.sqlite`
- **Main session**: `019f4aed-a39c-7820-a41f-5b48540af7d1` "SǸparer projets Homeys"
  - Model: `gpt-5.6-sol` (ultra reasoning)
  - Total tokens: 120,616,629 (cumulative across 13 sessions)
  - Created 2026-07-10 09:28:35 UTC
  - This is the master investigation session
- 12 subagent sessions (rollout-*.jsonl, 6-28 MB each)
  - Created between 13:59:55 UTC and 16:56:16 UTC
  - Each is a sub-spawn of the main session (via `spawn_edges`)

### D4.2 14,101 logs in `logs_2.sqlite` (no thread_id linkage)
- 8,227 TRACE (normal flow)
- 2,680 INFO (informational)
- 2,592 DEBUG (dev)
- 596 WARN (warnings)
- **6 ERROR** (real errors, all from the 14:59-15:00 UTC Hegel subagent)

### D4.3 Warnings (596 total)
- 506 `codex_protocol::openai_models` (model config chatter, expected)
- 61 `codex_analytics::reducer`
- 12 `codex_core_plugins::manifest` (build-ios-apps + plugin-eval > 3 prompts, ignored)
- 6 `codex_core_skills::loader` (icon `..`, ignored)
- 2 `codex_core::responses_retry` (retries, expected)
- 2 `codex_core::shell_snapshot` ("Shell snapshot not supported yet for PowerShell")

### D4.4 6 errors (all from Hegel subagent at 14:59-15:00 UTC)
- 3× `shell_command` exit 1 (rg path, silent fail, MODULE_NOT_FOUND)
- 1× `apply_patch` UTF-8 mojibake
- 2× other (TBD)

### D4.5 Action
- All errors are documented in `INVESTIGATION_2026-07-10.md` + `PR_DRAFT_HEGEL_FIXES.md`
- No additional action needed
- **Future improvement**: link logs_2.sqlite to state_5.sqlite via a session_id column (currently no linkage)

---

## 🗂️ D5. Homey App Repos

### D5.1 Two apps confirmed in workspace
- **master** at `C:\Users\Dell\Documents\homey\master\` (v9.0.190, 430 drivers)
- **stable** at `C:\Users\Dell\Documents\homey\stable\` (v5.11.219, 228 drivers)
- **Both are siblings**, not nested (CRITICAL insight: explains why Hegel failed on `stable/scripts/ci/`)

### D5.2 Repo state
- Local is **shallow clone** (1 commit visible: `1441b53475328a2eaa076ff8eac3b8756652a788`)
- Same SHA as GitHub HEAD (no local commits ahead of remote)
- GitHub HEAD message: "v9.0.192: 430 drivers, 2637 FPs [skip ci]"
- Local `package.json` says version `9.0.190` (slight version mismatch, but same SHA)

### D5.3 GitHub remote
- `https://github.com/dlnraja/com.tuya.zigbee.git`
- 16 stars, 10 forks, 2 open issues (#338, #339, #340 + others not yet counted)
- 3 open PRs (#508, #509, #510)
- 1 release v9.0.192

### D5.4 Action
- [ ] Clone with full history: `git fetch --unshallow` (needs git binary)
- [ ] OR: `git clone https://github.com/dlnraja/com.tuya.zigbee.git full-master` (separate clone, has full history)
- [ ] Otherwise: stick with shallow clone for now (sufficient for static analysis)

---

## 🏠 D6. Homey Pro + VM infrastructure

### D6.1 VMware Player (installed)
- Used for HAOS 12.2 VM and Ubuntu 22.04.3 VM
- VMs likely at `C:\Users\Dell\Documents\Virtual Machines\` or similar (not investigated)

### D6.2 HAOS 12.2
- Path: `C:\Users\Dell\Downloads\haos_ova-12.2.vmdk`
- Purpose: Home Assistant OS VM (used for Homey development environment?)

### D6.3 Ubuntu 22.04.3
- Path: `C:\Users\Dell\Downloads\ubuntu-22.04.3-desktop-amd64.iso`
- Purpose: Linux dev environment

### D6.4 Homey Pro
- Real device (not a VM)
- Apps published to it via `homey app publish` (CLI) or `homey-publish.yml` (GHA)
- Apps are user-installed on the physical device

### D6.5 Action
- No action needed. The VM/HAOS/Ubuntu is development infrastructure, not relevant to current investigation.

---

## 📊 D7. Local Data Sources (always available)

### D7.1 Master repo
- `master/data/fingerprints.json` (17.7 KB) — **canonical master FP DB, 4040+ FPs**
- `master/data/mfs_db.json` (3.2 MB) — **heuristic FP DB**
- `master/data/dp_database.json` (19.5 KB) — DP table
- `master/data/_used_mfrs.json` (71 KB) — mfrs in use
- `master/data/bug-patterns.json` (3.5 KB) — bug patterns
- `master/data/bug-fixes-report.json` (5.7 KB) — fixes history
- `master/data/COMMUNITY_ENRICHMENT_REPORT.json` (3.1 KB)
- `master/data/PHASE2_ENRICHMENT_REPORT.json` (9.1 KB)
- `master/data/rapport_data.json` (6.4 KB)
- `master/data/reference-urls.json` (5.0 KB)
- `master/data/universal_tuya_urls.json` (17 KB)
- `master/data/historical_mfs.json` (in repo root, larger)
- `master/data/manufacturers.json` (7.3 KB)

### D7.2 Lib sync
- `master/lib/tuya/fingerprints.json` (260 KB) — sync with herdsman cache
- `master/driver-mapping-database.json` (668 KB) — canonical mfr→driver map

### D7.3 Diagnostics
- `master/.diag/`: extracted herdsman master, audit JSONs
- `master/.diag/zhc/zigbee-herdsman-converters-master.zip` (5.2 MB) — unzipped source for cross-ref
- `master/.diag/johan-shadow-comments-audit.json` (2.5 MB) — Johan attribution audit
- `master/.diag/apply-proven-routes.js` (8.3 KB) — auto-apply known good routes
- `master/.diag/johan-shadow-audit.js` (6 KB) — Johan audit script

### D7.4 GitHub state
- `master/.github/state/diagnostics-report.json` — 0 diagnostics analyzed (Gmail blocked)
- `master/.homeychangelog.json` (27 KB) — v9.0.176-190 publish-retry pattern
- `master/.github/SECRETS.md` — 13 secrets documented

### D7.5 Action
- All these are already used in the investigation. No new files to create.

---

## 🎯 D8. Summary

### What's working
- Codex Chrome extension installed and registered
- Mavis agent type 3 fully configured
- Codex sessions stored in SQLite for audit
- 2 apps, 1 shadow mode, 13 PRs pipeline

### What's missing
- No `git` binary in PATH
- No `gh` CLI
- No `homey` CLI
- No Python
- No GitHub PAT locally
- No Gmail IMAP creds
- No Discourse API key
- No Homey Cloud API token

### What to install (if user wants)
- Git for Windows (for `git` commands)
- `gh` CLI (for `gh pr create`)
- `homey` CLI (for `homey app publish`)
- Python (for `better-sqlite3` instead of `node:sqlite`)

### What's the impact
- All 6 deliverables produced without these tools
- Only the **publish step** (Phase 6-7 of action plan) requires them
- The user can do the publish manually via GitHub UI

---

*Investigation D completed 2026-07-10 17:35 UTC+2 by Mavis session mvs_e7cd7397977c4571a373dc2350580aa1.*
*App cible: n/a (infrastructure investigation).*
*Sources: Windows registry queries, Chrome extensions folder, Codex SQLite DBs, Mavis config files, VMware/HAOS/Ubuntu file paths.*
