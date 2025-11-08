# MEGA-PROMPT V2: Device Helpers & Advanced Tooling

**Date:** Nov 8, 2025 12:20am  
**Context:** User feedback on v4.9.307 (Log 7d3eaaf0)  
**Status:** ARCHIVED for future implementation

---

## PROBLEMS IDENTIFIED (v4.9.307):

- ❌ "Beaucoup d'info non remonté, manque batterie"
- ❌ "USB 2-socket reconnu comme 1-gang"
- ❌ "presence_sensor_radar Unknown → skip"
- ❌ Migration error: `Failed to add measure_battery: Not Found`

---

## SOLUTION STATUS:

### ✅ ALREADY IMPLEMENTED (v4.9.308):
- ✅ Tuya DP detection (TS0601 / _TZE*)
- ✅ Multi-gang detection for all switches
- ✅ Protected driver list
- ✅ Confidence threshold 95%+
- ✅ Safety checks (sensor→switch prevention)

### 📦 PROPOSED BUT NOT YET IMPLEMENTED:

Below is the complete code from the user's mega-prompt.  
**Reason for archiving:** Too many changes at once. Wait for v4.9.308 feedback first.

---

## CODE SNIPPETS (READY TO USE):

### 1. `lib/device_helpers.js`

```javascript
// lib/device_helpers.js
// Utilities used by drivers: detectMultiGang, safeAddCapability, mapPresenceFallback

const fs = require('fs').promises;

/**
 * Detect multi-gang outlets from a device interview (endpoints + clusters)
 * interview = { endpoints: [{id, clusters: []}, ...], model, manufacturer, powerSource }
 */
async function detectMultiGang(interview) {
  const endpoints = interview.endpoints || [];
  const onOffEndpoints = endpoints.filter(ep =>
    (ep.clusters || []).includes('onOff') || (ep.clusters || []).includes(6)
  );
  const candidate = {
    endpointsCount: endpoints.length,
    onOffEndpoints: onOffEndpoints.map(e => e.id),
    confidence: 0
  };
  // Heuristics:
  if (endpoints.length > 1 && onOffEndpoints.length > 1) candidate.confidence = 0.95;
  else if (onOffEndpoints.length === 2) candidate.confidence = 0.9;
  else if (onOffEndpoints.length === 1 && endpoints.length === 1 && interview.model && /2|dual|double|2gang/i.test(interview.model)) candidate.confidence = 0.8;
  return candidate;
}

/**
 * Safe add capability: wrap driver.addCapability with checks and error handling
 * driver: Homey Driver object
 */
async function safeAddCapability(driver, device, capability) {
  try {
    // Do not add battery capability to AC devices
    if ((device.powerSource || '').toLowerCase() === 'ac' &&
        capability.startsWith('measure_battery')) {
      driver.log(`[safeAddCapability] Skip ${capability} for AC device ${device.id}`);
      return { skipped: true, reason: 'powerSource=ac' };
    }
    // Attempt add
    await driver.addCapability(device, capability);
    return { ok: true };
  } catch (err) {
    // Log full context
    driver.error(`[safeAddCapability] Failed to add ${capability} to ${device.id}: ${err && err.message}`);
    // If device not found, return structured error so caller can create issue / artifact
    return { ok: false, error: err.message };
  }
}

/**
 * presence fallback: from interview, build best-effort mapping to Homey capabilities
 */
function mapPresenceFallback(interview) {
  // interview.clusters: array of cluster ids or names
  const clusters = (interview.clusters || []).map(c => String(c).toLowerCase());
  const result = { mapped: null, reason: null, suggestions: [] };

  if (clusters.includes('occupancy') || clusters.includes('0x0406') || clusters.includes('occupancy-sensor')) {
    result.mapped = 'alarm_motion';
    result.reason = 'occupancy cluster detected';
    return result;
  }
  if (clusters.includes('ias_zone') || clusters.includes('0x0500')) {
    result.mapped = 'alarm_contact'; // sometimes IAS is contact/motion; reviewer check advised
    result.reason = 'ias zone detected';
    return result;
  }
  // try PIR fallback via attribute names
  if ((interview.endpoints || []).some(ep => (ep.attributes || []).some(a => /pir|motion|presence/i.test(a)))) {
    result.mapped = 'alarm_motion';
    result.reason = 'attribute name PIR/Motion found';
    return result;
  }

  result.suggestions.push('schedule re-interview after 5s, collect raw frames');
  result.reason = 'no obvious mapping found';
  return result;
}

// Save raw dump for debugging
async function saveRawDump(deviceId, dump) {
  await fs.mkdir('.artifacts', { recursive: true });
  await fs.writeFile(`.artifacts/dump_${deviceId}_${Date.now()}.json`, JSON.stringify(dump, null, 2));
}

module.exports = {
  detectMultiGang,
  safeAddCapability,
  mapPresenceFallback,
  saveRawDump
};
```

### 2. Driver Init Patch (Example)

```javascript
// drivers/driver.js (extrait)
const { detectMultiGang, safeAddCapability, mapPresenceFallback, saveRawDump } = require('../lib/device_helpers');

module.exports = {
  async onDeviceInit(device) {
    try {
      // get interview (pseudo)
      const interview = await this._getDeviceInterview(device); // adapte selon ton code
      
      // 1) Detect multi-gang
      const mg = await detectMultiGang(interview);
      if (mg.confidence > 0.85) {
        this.log(`[onDeviceInit] Multi-gang detected endpoints=${mg.onOffEndpoints.join(',')}`);
        // register per-endpoint capabilities if not present
      }

      // 2) Presence fallback
      const presence = mapPresenceFallback(interview);
      if (presence.mapped) {
        this.log(`[onDeviceInit] presence mapped => ${presence.mapped} (${presence.reason})`);
        await safeAddCapability(this, device, presence.mapped);
      } else {
        await saveRawDump(device.id, interview);
      }

      // 3) Smart-adapt protection rules
      if (this.protectedDrivers && this.protectedDrivers.includes(this.id)) {
        this.log('[onDeviceInit] Driver is protected - skipping automatic destructive adapt');
      }
      
    } catch (err) {
      this.error(`[onDeviceInit] unexpected error: ${err && err.message}`, err);
      try { await saveRawDump(device.id, { error: err.message }); } catch (e) {}
    }
  }
};
```

### 3. Migration Error Handling

```javascript
// Example: when safeAddCapability returns error
const res = await safeAddCapability(this, device, 'measure_battery');
if (!res.ok) {
  this.error(`[migration] safeAddCapability failed: ${res.error}`);
  await saveRawDump(device.id, { error: res.error, device });
  // (Optional) call scripts/create_issue.sh with args to open issue
}
```

---

## SCRIPTS:

### 1. `scripts/generate_capability_map.js`

```javascript
#!/usr/bin/env node
// scripts/generate_capability_map.js
const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', 'drivers');
const artifacts = path.join(__dirname, '..', '.artifacts');
if (!fs.existsSync(artifacts)) fs.mkdirSync(artifacts, { recursive: true });

const files = fs.existsSync(driversDir) ? fs.readdirSync(driversDir).filter(f => f.endsWith('.js')) : [];
const map = {};
files.forEach(f => {
  const content = fs.readFileSync(path.join(driversDir, f), 'utf8');
  const caps = Array.from(new Set([...content.matchAll(/(?:capabilities|capability|addCapability)\(['"`]([a-z0-9_\.]+)['"`]\)/gi)].map(m => m[1])));
  map[f] = caps;
});
fs.writeFileSync(path.join(artifacts, 'capability_map.json'), JSON.stringify(map, null, 2));
console.log('capability_map.json generated in .artifacts/');
```

### 2. `scripts/generate_timeline_report.js`

```javascript
#!/usr/bin/env node
// scripts/generate_timeline_report.js
const fs = require('fs');
const commits = fs.existsSync('.artifacts/git_commits.log') ? fs.readFileSync('.artifacts/git_commits.log','utf8') : '';
const hits = fs.existsSync('.artifacts/git_keyword_hits.log') ? fs.readFileSync('.artifacts/git_keyword_hits.log','utf8') : '';
const out = [
  '# Timeline report',
  '',
  '## Commits matching keywords',
  '',
  hits || 'No hits found. Run scripts/scan_history.sh first.'
].join('\n');
fs.writeFileSync('docs/timeline.md', out);
console.log('docs/timeline.md generated');
```

### 3. `scripts/create_issue.sh`

```bash
#!/usr/bin/env bash
# scripts/create_issue.sh
# usage: ./create_issue.sh "Title" "Body" "labels"
GH_TOKEN="${GH_TOKEN:-$HOMEY_PUBLISH_GH_TOKEN}"
REPO="dlnraja/com.tuya.zigbee"
TITLE="$1"
BODY="$2"
LABELS="${3:-bug,diagnostics}"
curl -s -X POST -H "Authorization: token $GH_TOKEN" \
  -d "$(jq -n --arg t "$TITLE" --arg b "$BODY" --argjson l "$(jq -R -s -c 'split(",")' <<<"$LABELS")" '{title:$t, body:$b, labels:$l}')" \
  "https://api.github.com/repos/$REPO/issues"
```

---

## GITHUB ACTIONS WORKFLOW:

### `.github/workflows/ci_publish.yml`

```yaml
name: CI Build & Publish

on:
  push:
    branches: [ master ]
  workflow_dispatch:

jobs:
  build_and_test:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'

    - name: Cache node modules
      uses: actions/cache@v4
      with:
        path: ~/.npm
        key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

    - name: Install dependencies
      run: npm ci

    - name: Lint
      run: npm run lint

    - name: Unit tests
      run: npm test

    - name: Generate capability map
      run: node scripts/generate_capability_map.js

    - name: Run scan history
      run: bash scripts/scan_history.sh

    - name: Build app
      run: npm run build

    - name: Package app (zip)
      run: |
        if [ -f release.zip ]; then rm release.zip; fi
        zip -r release.zip . -x node_modules/**\* .git/**\* .artifacts/**\* || true

    - name: Upload release artifact
      uses: actions/upload-artifact@v4
      with:
        name: release-zip
        path: release.zip

  publish:
    needs: build_and_test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/master' && contains(github.event.head_commit.message, '[publish]') || github.event_name == 'workflow_dispatch'
    steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Download built artifact
      uses: actions/download-artifact@v4
      with:
        name: release-zip
        path: .

    - name: Publish to Homey App Store
      uses: athombv/github-action-homey-app-publish@v1
      with:
        personal_access_token: ${{ secrets.HOMEY_PERSONAL_TOKEN }}
        app_package: release.zip
```

---

## IMPLEMENTATION CHECKLIST:

```
⏳ 1. Add lib/device_helpers.js
⏳ 2. Patch drivers/driver.js with new init logic
⏳ 3. Add error handling for migration
⏳ 4. Create capability map script
⏳ 5. Create timeline report script
⏳ 6. Create auto-issue script
⏳ 7. Update GitHub Actions workflow
⏳ 8. Add test fixtures for USB 2-socket, TS0601, presence
⏳ 9. Test on real devices
⏳ 10. Document in README
```

---

## DECISION TREE:

```
v4.9.308 PUBLIÉ (Nov 8, 12:30am)
    ↓
ATTENDRE 24-48h FEEDBACK
    ↓
┌───────────────────┴───────────────────┐
│                                       │
SI FEEDBACK POSITIF                 SI NOUVEAUX PROBLÈMES
    ↓                                   ↓
Implémenter helpers simples        Analyser avec scripts
- generate_capability_map          - scan_history.sh
- timeline report                  - analyze_diagnostics.js
- Enhanced CI/CD                   - version_summary.js
    ↓                                   ↓
Phase 3 complet                    Fix ciblé v4.9.309
- device_helpers.js                    ↓
- safeAddCapability                Réévaluer helpers
- mapPresenceFallback
- auto-issue creation
```

---

## NOTES IMPORTANTES:

### **WHY NOT IMPLEMENT NOW?**

1. **Too many changes in 2 days**
   - v4.9.305 → v4.9.306 → v4.9.307 → v4.9.308
   - Need to validate each step
   - Risk of introducing new bugs

2. **Core problems already solved**
   - ✅ Tuya DP detection
   - ✅ Multi-gang detection
   - ✅ Safety checks
   - ✅ Protected drivers

3. **Proposed helpers are nice-to-have**
   - Not urgent for current issues
   - Can wait for feedback validation
   - Incremental approach is safer

### **WHAT TO IMPLEMENT FIRST (IF NEEDED):**

```
Priority 1: Simple scripts
✅ generate_capability_map.js
✅ scan_history.sh (already done)
✅ version_summary.js (already done)

Priority 2: Error handling improvements
⏳ safeAddCapability() wrapper
⏳ Migration error handling
⏳ Raw dump on failure

Priority 3: Advanced features
⏳ mapPresenceFallback()
⏳ Auto-issue creation
⏳ Integration test fixtures
```

### **RECOMMENDED APPROACH:**

```
1. Wait for v4.9.308 feedback (24-48h)
2. If positive: Implement Priority 1 scripts
3. If issues remain: Targeted fix first
4. Then gradually add helpers
5. Test thoroughly between each addition
```

---

## TIMELINE:

- **Nov 8, 12:30am:** v4.9.308 published
- **Nov 9-10:** Collect user feedback
- **Nov 10:** Decision point
  - ✅ If OK: Implement Priority 1 scripts
  - ⚠️ If issues: Targeted fix v4.9.309
- **Nov 11+:** Phase 3 enhancements (if validated)

---

## REFERENCES:

- User message: Nov 8, 2025 12:22am
- Log ID: 7d3eaaf0-d947-4a72-a202-945647fd7ad7
- Problems: Tuya DP, multi-gang, battery KPI, presence fallback
- Solutions: v4.9.308 addresses core issues
- Future: Helpers archived for Phase 3

---

**END OF MEGA-PROMPT V2 ARCHIVE**
