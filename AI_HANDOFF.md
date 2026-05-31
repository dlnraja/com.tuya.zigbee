# AI HANDOFF — com.tuya.zigbee Build Fix
> Updated: 2026-05-31 02:55 | Status: FIX DEPLOYED — awaiting CI result | Run #1469

---

## 🎯 MISSION
Fix Athom App Store **"Processing failed"** on ALL builds since #2160.
- Last good: **#2159** (v8.1.6, 232 drivers, 16.52 MB, state=test)
- Latest broken: **#2234** (v8.1.40, processing_failed, platforms=[], sdk=undefined)

**CRITICAL RULE**: NEVER post/reply on forum. Fix code only.

---

## 🔴 ROOT CAUSES (all identified)

### ✅ FIXED — Cause 1: app.json > 5MB
Compose plugin rebuilt app.json with 2-space indent = 6MB+ → Athom rejects >~5MB.
Fix: `COMPACT app.json` step in `auto-publish-on-push.yml` (line 173) → 3.56MB.

### ✅ FIXED — Cause 2: fingerprints.json 11.3MB → archive > 30MB
126K dead entries in `data/fingerprints.json` → archive was 38.5MB.
Fix: `SLIM fingerprints.json` step (line 200) → 0.16MB → archive ~24MB.

### ⚠️ FIX DEPLOYED (awaiting result) — Cause 3: external publish action re-builds
`athombv/github-action-homey-app-publish@48be66b` runs `homey app build` internally
→ re-executes compose plugin → recreates `app.json` with 6MB+ (before our COMPACT step)
→ Athom server can't parse oversized manifest → `processing_failed`, `sdk=undefined`, `platforms=[]`

**Fix applied** (commit `120f5f65`, run #1469):
Replaced external action with inline publish from `.homeybuild/` (already built by validator):
```yaml
- name: Publish to Homey App Store
  id: pub
  env:
    HOMEY_PAT: ${{ secrets.HOMEY_PAT }}
    HOMEY_HEADLESS: "1"
  run: |
    cd .homeybuild
    HOMEY_PAT="${HOMEY_PAT}" npx homey app publish --no-verify
```

---

## 📊 BUILD STATUS

| Build | Version | State | Archive | Drivers | Cause |
|-------|---------|-------|---------|---------|-------|
| #2159 | 8.1.6 | ✅ test | 16.52 MB | 232 | LAST GOOD |
| #2160–2233 | 8.1.7–8.1.39 | ❌ failed | ~38MB | 0 | Causes 1+2 |
| #2234 | 8.1.40 | ❌ failed | undefined | 0 | Cause 3 (external action) |
| **#2235** | **8.1.41?** | **⏳ pending** | **~24MB** | **411** | **Fix #1469 in progress** |

---

## 🔧 IF FIX #1469 STILL FAILS

### Hypothesis B: `homey app publish --no-verify` not accepted
The `--no-verify` flag may not exist in newer CLI versions.
Try: `HOMEY_PAT="${HOMEY_PAT}" npx homey app publish`

### Hypothesis C: `.homeybuild/` is deleted by validator step
The `npx homey app validate --level publish` may clean `.homeybuild/` before our publish.
Fix: Add explicit `homey app build` step between validator and publish, OR
add the safety compact inside the publish step (already added as fallback).

### Hypothesis D: `homey app publish` needs to run from workspace root (not .homeybuild/)
Some CLI versions expect to be run from root and build themselves.
Fix: Run `HOMEY_PAT=... npx homey app publish --no-interactive` from root.

### Hypothesis E: HOMEY_PAT is expired/wrong
The token in `scripts/.athom-tokens.env` has `ATHOM_ACCESS_TOKEN` not `HOMEY_PAT`.
The PAT is a GitHub Actions secret — if expired, all publishes silently succeed but Athom rejects.

---

## 🔍 VERIFICATION COMMANDS

```bash
# Check latest builds (replace 2235 with actual new build number)
node .github/scripts/athom-dev-cartographer.js 2159 2235

# Check current CI runs
node -e "const https=require('https');https.get('https://api.github.com/repos/dlnraja/com.tuya.zigbee/actions/runs?per_page=8',{headers:{'User-Agent':'x','Accept':'application/json'}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{JSON.parse(d).workflow_runs.forEach(r=>{const i=r.conclusion==='success'?'✅':r.conclusion==='failure'?'❌':r.status==='in_progress'?'⏳':'⚪';console.log(i+' #'+r.run_number+' '+r.name.substring(0,38)+' '+(r.conclusion||r.status)+' sha:'+r.head_sha.substring(0,8));});});}).on('error',e=>console.error(e));"

# Check version consistency
node -e "const a=require('./app.json'),p=require('./package.json');console.log('app:',a.version,'pkg:',p.version,'ok:',a.version===p.version)"

# Build locally and measure
npx homey app build
Get-ChildItem .homeybuild -Recurse -File | Measure-Object Length -Sum | ForEach-Object { Write-Host "Total: $([math]::Round($_.Sum/1024/1024,2))MB" }
```

---

## 📂 KEY FILES

| File | Role |
|------|------|
| `.github/workflows/auto-publish-on-push.yml` | **MAIN publish workflow** — has COMPACT + SLIM + inline publish |
| `.github/actions/homey-app-publish/action.yml` | Local publish action (alternative, not currently used) |
| `.github/scripts/athom-dev-cartographer.js` | Compare Athom builds: `node ... 2159 <NEW_ID>` |
| `scripts/validate/validate-app-json.js` | Pre-push Athom requirement checks |
| `data/fingerprints.json` | Must stay 166KB (slim). Full backup = `data/fingerprints.json.full-backup` |

---

## 🚫 CONSTRAINTS
1. **NEVER** post on forum (https://community.homey.app/t/140352)
2. `data/fingerprints.json.full-backup` must NOT be committed
3. `README.txt` must NOT be in `.homeyignore`
4. `app.json` must NOT have `icon` field
5. `app.json category` must be string, not array
6. No `*.json` wildcard in `.homeyignore`

---

## ⚡ PUSH TROUBLESHOOTING

**Version mismatch (M08)**:
```bash
node -e "const f=require('fs'),a=require('./app.json'),p=JSON.parse(f.readFileSync('package.json','utf8'));p.version=a.version;f.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
git add package.json && git commit -m "fix: sync version [skip ci]"
```

**Remote ahead — rejected push**:
```bash
git pull --rebase origin master
git push origin master
```

**Merge conflict in app.json**:
```bash
git checkout --theirs app.json
git add app.json
# continue rebase or commit
```
