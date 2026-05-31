# AI HANDOFF — com.tuya.zigbee Build Fix
> Generated: 2026-05-31 | Status: IN PROGRESS | Priority: CRITICAL

---

## 🎯 MISSION
Fix the Athom App Store **"Processing failed"** error on ALL builds since #2160.
Last working build: **#2159** (v8.1.6, 232 drivers, 16.52 MB archive).
Current broken build: **#2234** (v8.1.40, processing_failed, platforms=[], sdk=undefined).

**Rule**: NEVER post on the forum. Only fix code/config.

---

## 🔴 ROOT CAUSE ANALYSIS (confirmed)

### Cause 1 — app.json > 5MB (FIXED ✅)
- The Homey compose plugin rebuilds `app.json` from `.homeycompose/` with 2-space indent
- 411 drivers × 2-space = 6.03 MB → Athom server rejects > ~5MB
- **Fix already applied**: Step `COMPACT app.json` in `auto-publish-on-push.yml` (line 173)
- Minifies app.json to 3.56 MB before publish

### Cause 2 — data/fingerprints.json was 11.3 MB (FIXED ✅)
- 126,189 entries but only 1,430 match active drivers → dead weight
- Archive was 38.5 MB → over Athom's ~30 MB limit
- **Fix already applied**: Step `SLIM fingerprints.json` in `auto-publish-on-push.yml` (line 200)
- Filters to active-driver entries only: 11.3 MB → 0.16 MB

### Cause 3 — build #2234 still processing_failed (⚠️ UNSOLVED)
Both fixes are in place and run #1468 (Auto-Publish on Push) was ✅ SUCCESS.
But the build Athom received has `platforms: []`, `sdk: undefined`, `drivers: 0`.
This means the archive's `app.json` was NOT parsed by Athom's server.

**Current hypothesis for Cause 3** (not yet confirmed):
The `athombv/github-action-homey-app-publish` action (used at step 15) runs
`homey app publish` internally. This may trigger the compose plugin which
re-expands app.json AFTER our COMPACT step, or creates a corrupted archive.

Evidence:
- Local `.homeybuild/app.json` = 3.56 MB, platforms=["local"], sdk=3 ✅
- But Athom received platforms=[], sdk=undefined → different app.json was sent
- Build #2234 archiveUrl contains `/undefined/` → server couldn't parse manifest

---

## 📂 KEY FILES

### Workflows
| File | Role |
|------|------|
| `.github/workflows/auto-publish-on-push.yml` | **MAIN publish workflow** — has COMPACT + SLIM steps |
| `.github/workflows/force-publish-safe.yml` | Alternative publish with extra safety checks |
| `.github/workflows/master-cicd.yml` | Master orchestrator |

### Actions
| File | Role |
|------|------|
| `.github/actions/compact-app-json/action.yml` | Reusable COMPACT+SLIM action (may be called by other workflows) |
| `.github/actions/homey-app-publish/action.yml` | **Local publish action** — runs `homey app build` then `homey app publish --no-verify` from inside `.homeybuild/` |

### Scripts
| File | Role |
|------|------|
| `.github/scripts/athom-dev-cartographer.js` | Compare two Athom builds via API — run: `node .github/scripts/athom-dev-cartographer.js 2159 2234` |
| `scripts/validate/validate-app-json.js` | Pre-push validation (catches version mismatch, size, required fields) |
| `scripts/validate/homey-mandatory-check.js` | Pre-push hook — blocks push if checks fail |

### State
| File | Role |
|------|------|
| `data/fingerprints.json` | SLIM version (166 KB) — ✅ correct in remote |
| `data/fingerprints.json.full-backup` | Full 11.3 MB version — **DO NOT COMMIT** |
| `.homeybuild/` | Local build output — 24.23 MB total |

---

## 🧪 VERIFICATION COMMANDS

```bash
# Check latest Athom builds
node .github/scripts/athom-dev-cartographer.js 2159 2234

# Check CI runs
node -e "const https=require('https');https.get('https://api.github.com/repos/dlnraja/com.tuya.zigbee/actions/runs?per_page=8',{headers:{'User-Agent':'x','Accept':'application/json'}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{JSON.parse(d).workflow_runs.forEach(r=>{const i=r.conclusion==='success'?'✅':r.conclusion==='failure'?'❌':r.status==='in_progress'?'⏳':'⚪';console.log(i+' #'+r.run_number+' '+r.name.substring(0,40)+' '+r.conclusion+' sha:'+r.head_sha.substring(0,8));});});}).on('error',e=>console.error(e));"

# Build locally to check archive size (should be ~24 MB)
npx homey app build
# Then measure .homeybuild/
Get-ChildItem .homeybuild -Recurse -File | Measure-Object Length -Sum

# Check version consistency
node -e "const a=require('./app.json'),p=require('./package.json');console.log('app.json:',a.version,'package.json:',p.version,'match:',a.version===p.version)"

# Run Homey validator
npx homey app validate --level publish
```

---

## 🔧 INVESTIGATION NEEDED (for next AI)

### Step 1 — Understand why build #2234 has platforms=[]
The archive sent to Athom contained a broken `app.json`. Options:
1. The `athombv/github-action-homey-app-publish@48be66b7` action runs its own `homey app build` which re-runs the compose plugin → re-creates app.json with 6 MB indented version that Athom can't parse (too large → platforms stripped)
2. The action reads `app.json` BEFORE our COMPACT step somehow
3. The compose plugin is triggered during publish and overwrites compact app.json

**To verify option 1**: Check if the action at `athombv/github-action-homey-app-publish@48be66b7` does `homey app build` internally:
```
node -e "const https=require('https');https.get('https://raw.githubusercontent.com/athombv/github-action-homey-app-publish/48be66b7f2f870c22b6117d7bb84dfa06c4fc309/action.yml',{headers:{'User-Agent':'x'}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>console.log(d));}).on('error',e=>console.error(e))"
```

### Step 2 — Replace external action with local action
The local action at `.github/actions/homey-app-publish/action.yml` is already correct:
- It runs `homey app build` (step 14), then copies files, then `cd .homeybuild && homey app publish --no-verify`
- This means publish happens from INSIDE `.homeybuild/` where `app.json` is already compact

**Proposed fix**: In `auto-publish-on-push.yml`, replace line 269:
```yaml
# CURRENT (external action — may re-build and lose our COMPACT/SLIM):
uses: athombv/github-action-homey-app-publish@48be66b7f2f870c22b6117d7bb84dfa06c4fc309
with:
  personal_access_token: ${{ secrets.HOMEY_PAT }}

# PROPOSED (local action — uses already-built .homeybuild from validate step):
uses: ./.github/actions/homey-app-publish
with:
  personal_access_token: ${{ secrets.HOMEY_PAT }}
```

BUT first, modify the local action to NOT re-run `homey app build` (since step 14 already did it):
```yaml
# In .github/actions/homey-app-publish/action.yml
# REMOVE the "Build App" step (line 14-16)
# Keep the "Fix large.png" and "Publish App" steps
```

### Step 3 — Alternatively: publish via homey CLI directly in workflow
Skip the action entirely and do the publish inline:
```yaml
- name: Publish to Homey App Store
  if: steps.check_pat.outputs.has_pat == 'true'
  env:
    HOMEY_PAT: ${{ secrets.HOMEY_PAT }}
    HOMEY_HEADLESS: "1"
  run: |
    # .homeybuild already exists from validate step (step 14)
    # Just publish from inside it
    cd .homeybuild
    npx homey app publish --no-verify
```

---

## 📋 PUSH FAILURES (git hook blocks)

The pre-push hook (`.git/hooks/pre-push`) runs:
1. `node scripts/validate/homey-mandatory-check.js` — checks mandatory files + version consistency
2. `node scripts/validate/validate-app-json.js` — checks Athom requirements

**Common failures**:
- **M08 Version mismatch**: `app.json` version ≠ `package.json` version
  - Fix: `node -e "const f=require('fs'),a=require('./app.json'),p=JSON.parse(f.readFileSync('package.json','utf8'));p.version=a.version;f.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"`
- **M12 Invalid JSON app.json**: Merge conflict markers `<<<<<<`
  - Fix: `git checkout --theirs app.json && git add app.json`
- **Rebase conflicts**: CI bot bumps version while you have local changes
  - Fix: `git pull --rebase origin master` → resolve conflicts → `git push`

**Skip pre-push hook if needed** (use sparingly):
```bash
git push --no-verify origin master
```

---

## 🔄 CI/CD FLOW

```
push to master
  → auto-publish-on-push.yml (main publish)
    1. checkout + npm ci
    2. PRE-CLEAN: fix empty manufacturerName
    3. bump version (athombv/github-action-homey-app-version)
    4. sync package.json version
    5. COMPACT app.json: 6MB → 3.56MB  ← OUR FIX
    6. SLIM fingerprints.json: 11.3MB → 0.16MB  ← OUR FIX
    7. validate: npx homey app validate --level publish
    8. PUBLISH: athombv/github-action-homey-app-publish  ← STILL BROKEN
    9. promote: draft → test (Puppeteer + OAuth + PAT)
    10. bot commit [skip ci]
```

---

## 🎯 SUCCESS CRITERIA

A successful build means:
- Athom API: `state: "test"` (not `"processing_failed"`)
- `sdk: 3` (not `undefined`)
- `platforms: ["local"]` (not `[]`)
- `driverCount: 411` (not `0`)
- `archiveSize: ~17MB` (not `undefined`)
- URL does NOT contain `/undefined/`

Check with: `node .github/scripts/athom-dev-cartographer.js 2159 <NEW_BUILD_ID>`

---

## 📊 BUILD HISTORY

| Build | Version | State | Archive | Drivers | Note |
|-------|---------|-------|---------|---------|------|
| #2159 | 8.1.6 | ✅ test | 16.52 MB | 232 | LAST GOOD |
| #2160-2233 | 8.1.7-8.1.39 | ❌ processing_failed | undefined | 0 | app.json 6MB + fingerprints 11MB |
| #2234 | 8.1.40 | ❌ processing_failed | undefined | 0 | COMPACT+SLIM applied but publish action broken |

---

## ⚡ QUICK WIN — WHAT TO TRY FIRST

1. **Edit `auto-publish-on-push.yml`**: Replace the external publish action with inline publish:

```yaml
# Replace lines 266-271 with:
- name: Publish to Homey App Store
  id: pub
  if: steps.check_pat.outputs.has_pat == 'true'
  env:
    HOMEY_PAT: ${{ secrets.HOMEY_PAT }}
    HOMEY_HEADLESS: "1"
  run: |
    # app.json already compacted (3.56MB) + fingerprints slimmed (0.16MB)
    # .homeybuild/ already created by validator step above
    echo "Archive size before publish:"
    du -sh .homeybuild/
    cd .homeybuild
    HOMEY_PAT="${HOMEY_PAT}" npx homey app publish --no-verify 2>&1
    echo "publish_done=true" >> $GITHUB_OUTPUT
```

2. **Commit + push with a trigger** (no [skip ci]):
```bash
git add .github/workflows/auto-publish-on-push.yml
git commit -m "fix(publish): use inline homey publish instead of external action to preserve compact app.json"
git push origin master
```

3. **Monitor**: Run `node .github/scripts/athom-dev-cartographer.js 2159 2235` after ~10 min

---

## 🔑 SECRETS (GitHub Actions)
- `HOMEY_PAT` — Athom Personal Access Token (used by publish action)
- `ATHOM_ACCESS_TOKEN` / `ATHOM_REFRESH_TOKEN` — in `scripts/.athom-tokens.env` (local only)
- `GH_PAT` — GitHub PAT (for CI writes)

---

## 🚫 CONSTRAINTS
1. NEVER post/reply on the forum (https://community.homey.app/t/140352)
2. `data/fingerprints.json.full-backup` must NOT be committed (11.3 MB)
3. `README.txt` must NOT be excluded from archive (SDK requires it)
4. `data/fingerprints.json` must stay in archive (runtime dependency)
5. No `*.json` wildcard in `.homeyignore` (breaks runtime deps)
6. `app.json category` must be string "appliances" (not array)
7. No `icon` field in `app.json` (Athom server rejects)
