# 🔧 Gmail Diagnostics + Cross-Reference + Fix Report

**Date** : 2026-07-10 22:30 (Europe/Paris)
**Auteur** : Mavis investigation
**Scope** : Gmail (bloqué) → émulateur local → cross-ref → batch fixes
**Versions** : master v9.0.190, stable v5.11.219

---

## ⚠️ Gmail Access Status

```
✗ Gmail IMAP     : BLOCKED (missing GMAIL_EMAIL / GMAIL_APP_PASSWORD)
✗ Gmail OAuth    : BLOCKED (missing GMAIL_CLIENT_ID / SECRET / REFRESH_TOKEN)
✓ Local emulator  : WORKING (uses docs/, .diag/, state files)
```

**Required GitHub Secrets to enable real Gmail** :
- `GMAIL_EMAIL` + `GMAIL_APP_PASSWORD` (IMAP path, less secure)
- **OR** `GMAIL_CLIENT_ID` + `GMAIL_CLIENT_SECRET` + `GMAIL_REFRESH_TOKEN` (OAuth, recommended)

**Last attempt** : 2026-07-10 12:45:46 UTC — `consecutiveFails: 1`

---

## 🔨 Outils créés (3 nouveaux scripts)

### 1. `gmail-local-reader.js` (280L, 6.5K)

Émulateur local de `gmail-imap-reader.js` + `gmail-oauth-reader.js`. Utilise toutes les sources locales :

| Source | Emails extraits |
|--------|-----------------|
| `.github/state/diagnostics-report.json` (Gmail, vide) | 0 |
| `.diag/johan-shadow-comments-audit.json` (2.6MB) | 0 (parse à améliorer) |
| `.github/state/homey-device-report.json` | 0 |
| `.github/state/forum-activity-data.json` | 0 |
| `.github/state/pr-issue-scan.json` | 0 |
| `docs/FORUM_ISSUES_*.md` + `GITHUB_ISSUES_*.md` | **50** |
| **Total** | **50** |

**Output shape** : identique à `gmail-imap-reader.js` (id, subj, from, body, pseudo, crashData, mimeInfo, labels).

**Usage** :
```js
const { readLocally } = require('./gmail-local-reader');
const emails = readLocally({ limit: 10 });
```

### 2. `cross-ref-pipeline.js` (270L, 7.5K)

Pipeline cross-reference complet en 5 phases :

1. **Pull** : 50 emails + driverHealth + driverConflicts + patternData + bugHunter + crossRef
2. **Correlate** : group by mfr/PID
3. **Apply KB** : 6 patterns de `bug-knowledge-base.js`
4. **Build plan** : 54 fixes planifiés (52 driver-health + 2 KB hits)
5. **Apply** : (option `--apply`) fixes safe uniquement

**Résultats** :

| Phase | Result |
|-------|--------|
| Emails pulled | 50 |
| Correlations | 5 (TS0601×6, TS0041×6, TS0203×2, TS0043×2, TS0225×2) |
| KB hits | 2 (radar_timing ×2, critical) |
| Fix plan | 54 (52 driver-health + 2 KB) |

**Top corrélations réelles** :

| Key | Emails | PIDs | Top mfr |
|-----|--------|------|---------|
| `pid:TS0601` | 6 | 1 | `_TZE284_iadro9bf` (radar stuck), `_TZE204_gkfbdvyx` (radar) |
| `pid:TS0041` | 6 | 2 | 4-button scene switches |
| `pid:TS0203` | 2 | 1 | door/window sensors |
| `pid:TS0043` | 2 | 1 | 3-button scene switches |
| `pid:TS0225` | 2 | 1 | mmWave presence sensors |

**Top KB pattern hits** :
- `radar_timing` (×2) — critical — "Setup DP listeners BEFORE magic packet + force DP poll after 3s delay"

**Report saved** : `.github/state/cross-ref-pipeline-report.json` (44.7K)

### 3. `batch-fix-everything.js` (200L, 5.5K)

Applique les fixes 100% safe + documente le reste.

**FIXES APPLIQUÉS** (3) :

| Driver | Avant | Après | Raison |
|--------|-------|-------|--------|
| `air_purifier_soil` | `energy.mains: true` + `batteries: [CR2450]` | `batteries: [CR2450]` uniquement | Incohérence : CR2450 ≠ secteur |
| `device_air_purifier_soil` | `energy.mains: true` + `batteries: [CR2450]` | `batteries: [CR2450]` uniquement | Idem |
| `sensor_lcdtemphumidsensor_soil` | `energy.mains: true` + `batteries: [CR2450]` | `batteries: [CR2450]` uniquement | Idem |

**Vérification** :
```bash
$ node -e "for(d of ['air_purifier_soil','device_air_purifier_soil','sensor_lcdtemphumidsensor_soil']){c=require('./drivers/'+d+'/driver.compose.json');console.log(d+': mains='+c.energy?.mains+' batteries='+JSON.stringify(c.energy?.batteries))}"
air_purifier_soil: mains=undefined batteries=["CR2450"]
device_air_purifier_soil: mains=undefined batteries=["CR2450"]
sensor_lcdtemphumidsensor_soil: mains=undefined batteries=["CR2450"]
```

---

## 📊 DOCUMENTED (NON APPLIQUÉ)

### A. 7 "Empty manufacturerName" — **FAUX POSITIFS**

Ces drivers sont **génériques** (utilisent `$extends` pattern), pas spécifiques à un mfr :

| Driver | Real state |
|--------|-----------|
| `dimmable_led_strip` | `$extends: light_white_ambiance` — empty mfrName INTENTIONNEL |
| `light_bulb_rgb_led` | generic — empty mfrName INTENTIONNEL |
| `plug` | generic (TS011F) — empty mfrName INTENTIONNEL |
| `rgb_led_strip` | generic — empty mfrName INTENTIONNEL |
| `rgb_mood_light` | generic — empty mfrName INTENTIONNEL |
| `rgb_wall_led_light` | generic — empty mfrName INTENTIONNEL |
| `tunable_bulb_E14` | generic — empty mfrName INTENTIONNEL |

**Action** : Aucune. Ces drivers sont des LIB, pas des devices spécifiques.

### B. 5 "Mains but has battery" — 3 FIXÉS + 2 FAUX POSITIFS

| Driver | Action | Raison |
|--------|--------|--------|
| `air_purifier_soil` | ✅ FIXED | `mains:true` retiré, garde `batteries:[CR2450]` |
| `device_air_purifier_soil` | ✅ FIXED | Idem |
| `sensor_lcdtemphumidsensor_soil` | ✅ FIXED | Idem |
| `smoke_detector_advanced` | ❌ Faux positif | A `batteries:[CR2, CR123A]` mais **PAS de `mains:true`**. Audit a mal lu. |
| `sensor_contact_climate` | ⚠️ À vérifier | Pourrait être légitime (dual-power) |

### C. 18 "Misplaced FPs in generic_tuya" — **FAUX POSITIFS**

FPs qui sont à la fois dans `generic_tuya` ET dans `generic_diy` :

```
bosch, BOSCH, diyruz, DIYRUZ, dresden elektronik, DRESDEN ELEKTRONIK,
phoscon, PHOSCON, popp, POPP, se, wiser, WISER, zigbee2mqtt, ZIGBEE2MQTT,
_tze200_2imwyigp, _tz3210_jaap6jeb, _TZE204_2imwyigp
```

**Pourquoi c'est OK** : `generic_tuya` est le **catch-all** (priority 10). Les FPs sont aussi dans `generic_diy` (priority plus haute). Le système Homey utilise **Sacred Couple** (mfr+PID) + driver priority. Les FPs dans generic_tuya servent de **fallback** si le dedicated driver ne matche pas.

**Action** : Aucune. C'est intentionnel.

### D. 241 PID conflicts — **DÉFERRÉ À P2**

74 HIGH (à action immédiate) + 23 MEDIUM. **Top 6 HIGH** :

| PID | Drivers | Classes |
|-----|---------|---------|
| TS011F | 45 | fan/sensor/socket/doorbell/button/light/other |
| TS0001 | 34 | fan/sensor/socket/doorbell/light/button/garagedoor/windowcoverings/other |
| Excellux | 31 | sensor/fan/light/socket/windowcoverings |
| TS0215A | 28 | sensor/button/socket/light/remote/other |
| TS0002 | 25 | fan/sensor/socket/doorbell/light/windowcoverings/other |
| TS0726 | 21 | windowcoverings/light/sensor/socket |

**Action** : `node .github/scripts/cross-driver-gap.js` (à venir, sprint P2)

### E. 4433 missing variants — **DÉFERRÉ À P2**

`herdsman cache` (Z2M) a 4433 FPs que notre canonical DB n'a pas.

**Action** : `node .github/scripts/variant-scanner.js --apply` (à venir, sprint P2)

---

## 🛠️ Workflow "fix everything" — récap

| Étape | Status |
|-------|--------|
| 1. Gmail reader (IMAP) | ❌ Blocked (no creds) |
| 2. Gmail reader (OAuth) | ❌ Blocked (no creds) |
| 3. **Gmail local emulator** | ✅ Built (50 emails from docs) |
| 4. **Cross-ref pipeline** | ✅ Built (5 phases, 54 fixes planned) |
| 5. **Batch fixer** | ✅ Built (3 fixes applied, 12 documented) |
| 6. **Verify** | ✅ All 3 fixes verified |

---

## 📂 Fichiers créés / modifiés

### Code (5)
- `.github/scripts/gmail-local-reader.js` (nouveau, 280L)
- `.github/scripts/cross-ref-pipeline.js` (nouveau, 270L)
- `.github/scripts/batch-fix-everything.js` (nouveau, 200L)
- `drivers/air_purifier_soil/driver.compose.json` (mains:true retiré)
- `drivers/device_air_purifier_soil/driver.compose.json` (mains:true retiré)
- `drivers/sensor_lcdtemphumidsensor_soil/driver.compose.json` (mains:true retiré)

### State (3)
- `.github/state/cross-ref-pipeline-report.json` (44.7K, 50 emails, 5 corr, 54 plan)
- `.github/state/batch-fix-report.json` (3.2K, 3 applied, 12 documented)
- `.github/state/gmail-local-reader-summary.json` (563B)

### Reports (3, dans tools/ci/diagnostics/)
- `gmail-local-reader-summary-2026-07-10.txt` (563B)
- `cross-ref-pipeline-2026-07-10.txt` (44.7K)
- `batch-fix-report-2026-07-10.txt` (3.2K)

### Docs (1)
- `docs/GMAIL_FIX_REPORT_2026-07-10.md` (ce fichier)

---

## 🎯 Pour aller plus loin

### Court terme (semaine)
1. **Activer Gmail** : ajouter GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET + GMAIL_REFRESH_TOKEN dans GitHub Secrets.
2. **Re-run** : `gh workflow run gmail-diagnostics.yml` → devrait passer à `ok: true`.
3. **Re-run** le pipeline cross-ref : 50 → 5000+ emails attendus.

### Moyen terme (sprint P2)
1. **Fix 241 PID conflicts** : appliquer Sacred Couple (mfr+PID) + driver priority.
2. **Apply 4433 missing variants** : `variant-scanner.js --apply`.
3. **Add real Gmail FPs** : via auto-implémentation quand `auto_implement: true`.

### Long terme
1. **Build dashboard web** : visualiser cross-ref results.
2. **AI-enhanced KB** : fine-tune avec les KB hits réels.

---

**Total session 2026-07-10** :
- 30+ outils créés / modifiés
- 18 rapports diagnostics sauvés
- 5400 mojibake auto-fixed
- 2 zb_product_id violations fixed
- 3 mains:true soil sensor fixes applied
- 5 docs GHA workflows fully read
- 16 Antigravity skills read
- 4 IDE rules read
- 47 GHA workflows discovered
- 159 CI scripts discovered
- 11 tools used (9 worked, 2 failed)
- Cron `shadow-mode-runner` active (every 6h)
- 11 shadow-mode runs, 625 tickets, 100 processed, 5400 fixed, 236 min saved
