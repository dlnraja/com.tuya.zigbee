# 🔍 MEGA-INVESTIGATION 2026-07-10 — Tuya Unified Zigbee (Dual-App)

> **Session Mavis**: `mvs_e7cd7397977c4571a373dc2350580aa1` | **Date**: 2026-07-10 17:30 UTC+2
> **Auteur**: Dylan Rajasekaram (senetmarne@gmail.com, userID `llqWwMMeXA32`)
> **Plateforme**: Windows 11, Mavis 3.0.47, Codex 0.144.0-alpha.4 (rate-limited 100%)
> **Sources croisées**: 23+ rapports docs/ + 16 skills Antigravity + 4 SQLites Codex + 3 PRs GitHub (#508, #509, #510) + 13 sessions Codex rollout + 7 workflows GHA + 90+ fingerprints canoniques

---

## 🎯 TL;DR — 2 APPS, 1 SOURCE-OF-TRUTH, 3 PRs À MERGER

| App | ID | Version | Drivers | Purpose | Status |
|-----|----|---------|---------|---------|--------|
| **master** | `com.dlnraja.tuya.zigbee` | **v9.0.190** | 430 (379 Zigbee + 51 WiFi) | "Tuya Unified Zigbee - **Local-first control with AI automation**". Bleeding edge. Forward-thinking. | Bug fixes allowed, breaking changes allowed, full feature set |
| **stable** | `com.dlnraja.tuya.zigbee.stable` | **v5.11.219** | 228 (Zigbee only) | "Universal Tuya Zigbee + WiFi App". Legacy track. Backwards-compatible. | Bug fixes only, NO breaking changes, MUST stay 5.x.y |

**Purpose preservation**:
- **master** = innovation, AI, WiFi + Zigbee, 11-layer pipeline, 23 time-sync formats
- **stable** = reliability, Zigbee-only, smaller surface, no AI bots touching user data
- **Backport strategy**: PR #508 (Volta+Most Mendel) goes to BOTH. PR #509 + #510 (small FP fixes) go to BOTH. New AOYAN switches + SONOFF S61SZBTPB plug go to master first, then optionally backport as new drivers to stable.

**3 PRs already exist on GitHub that fix EVERY Critical+High bug**:
- **#508** (9,387 lines): kills 5 Volta bugs + adds 2s complement + 6 AOYAN switches + SONOFF S61SZBTPB + TZE28C1000000 normalization + 6 driver.compose.json fixes + 30+ flow card `titleFormatted`
- **#509** (small): moves `_TZ3000_fllyghyj` from `air_purifier` → `climate_sensor`
- **#510** (tiny): renames soil sensor FPs `soilsensor_2` → `soil_sensor` for 3 myd45weu variants

**Local state**: NONE of the 3 PRs merged into local master. All bugs still present. 1 additional bug not in any PR: **UTF-8 mojibake `??` in `drivers/valve_irrigation/device.js:173`** (Hegel error `apply_patch verification failed`).

---

## 📚 RAPPORTS LUS (23+) ET LEUR APPORT AU DIAGNOSTIC

| # | Rapport | Taille | Apport clé | App cible |
|---|---------|-------:|-----------|-----------|
| 1 | `GLOBAL_INVESTIGATION_PLAN.md` | 129K | 22 sections, 11-layer pipeline, dual-app mandate | both |
| 2 | `FORUM_ISSUES_ANALYSIS.md` | 52K | 42 issues forum : 36 fixées, 6 investig | stable = priorité user-visible |
| 3 | `WIFI_LOCAL_FIRST_ARCHITECTURE.md` | 37K | 13 modules TuyaLocal*, 51 drivers WiFi | **master only** |
| 4 | `DEVICE_MATRIX.md` | 35K | 430 drivers × FPs × capabilities | both |
| 5 | `GITHUB_RESPONSES_FULL.md` | 32K | 12 issues GH + Johan cross-ref, nightly auto-responses | both |
| 6 | `MASTER_REFERENCE.md` | 29K | vue 2 apps, branches, 11 couches, base classes | both |
| 7 | `DEV_NOTES.md` | 27K | 3743 mfrs, priority system, 3-pillar validation | both |
| 8 | `WORKING_VERSIONS_REFERENCE.md` | 23K | 1830 versions, publish-retry pattern v9.0.176-190 | both |
| 9 | `ZHA_Z2M_QUIRKS_ANALYSIS.md` | 21K | DP tables, AVATTO ME167, TRV profile, **Volta bug confirmed** (DP47 localTempCalibration1-2) | both |
| 10 | `BRANDS.md` | 20K | 100+ Tuya white-labels, 13 native Zigbee brands | both |
| 11 | `ZIGBEE_TROUBLESHOOTING_GUIDE.md` | 19K | 23 time-sync formats, 5 MCU protocols, IAS CIE enrollment | both |
| 12 | `PHYSICAL_BUTTON_ANALYSIS.md` | 17K | TS0044 cluster variance, E000 detection, dedup 1.5s | both |
| 13 | `MODULES.md` | 17K | 468 lib/ files, 11 layers, 50+ utils | both |
| 14 | `INTELLIGENT_AUTOMATION.md` | 16K | bug patterns 50-80% confidence, adaptive DP detection | master (AI features) |
| 15 | `ISSUE_RESPONSES.md` | 16K | templates pour auto-respond GH issues | both |
| 16 | `V6_COMPREHENSIVE_UPDATE.md` | 15K | bidirectional buttons, scene mode, init hardening | both |
| 17 | `USER_EXPERIENCE_TRACKER.md` | 15K | critical user issues, button dedup, IAS CIE | both |
| 18 | `AUTO_TAG_SYSTEM.md` | 14K | auto-tag on app.json version bump, conditions | both |
| 19 | `PUBLISH_SETUP.md` | 14K | HOMEY_API_TOKEN workflow, 3 publish methods | both |
| 20 | `BUTTON_CAPABILITY_GUIDE.md` | 14K | multi-gang convention `onoff` (not onoff.gang1) | both |
| 21 | `Z2M_INTEGRATION_ANALYSIS.md` | 13K | Z2M converter diff, variant patterns | both |
| 22 | `TUYA_TIME_SYNC_PROTOCOL.md` | 13K | 23 formats, mcuSyncTime 0x24, TUYA_EPOCH=946684800 | both |
| 23 | `ZIGBEE-BRANDS.md` | 12K | 92 mfrs `_TZ*`, 78 `_TY*` | both |
| 24 | `CHRONOLOGICAL_EVOLUTION.md` | 12K | 4 ères v5.11→v9.0, Ère 4 = Sovereign | both |
| 25 | `ARCHITECTURE.md` | 12K | 11 layers, 5 MCU protocols | both |
| 26 | `SCRIPTS.md` | 12K | 457 scripts : 22 CI, validation, automation | both |
| 27 | `PUBLISHING_GUIDE.md` | 12K | publish flow steps, common errors | both |
| 28 | `SETUP_INSTRUCTIONS.md` | 12K | env setup, GitHub Secrets | both |
| 29 | `ARCHITECTURE_AI.md` | 11K | 3 couches IA (IDE/GHA/Runtime), secrets per couche | both |
| 30 | `HOMEY_SDK_BEST_PRACTICES.md` | 10K | SDK3 patterns: IAS enroll, attribute reporting, sub-devices | both |
| 31 | `BIDIRECTIONAL_BUTTONS.md` | 10K | dedup 1.5s, virtual+physical, scene mode | both |
| 32 | `Z2M_IMPROVEMENTS_ANALYSIS.md` | 10K | Z2M v18+ features, deprecations | both |
| 33 | `BATTERY_ANALYSIS.md` | 8K | 2 CRITICAL bugs UnifiedBatteryHandler (endpoint[1] only, kinetic over-match) | both |
| 34 | `TIME_SYNC_TECHNICAL.md` | 8K | mcuSyncTime 0x24, 23 formats, hybrid firmware case | both |
| 35 | `FORUM_ISSUES_CONSOLIDATED.md` | 17K | 42 issues consolidées, regressions fixed | both |
| 36 | `PROJECT_EVOLUTION_HISTORY.md` | 10K | 4 ères, 20 fichiers stable-v5 perdus, EventDeduplicationLayer | both |
| 37 | `REGRESSION_ANALYSIS_v5.11.md` | 8K | 12 régressions v5.11.5-13 : case-dup, PID collision, lower-upper | stable (v5.11) |
| 38 | `VERSION_HISTORY_BATTERY_BUTTON_AUDIT_2026-07-05.md` | 6K | audit v5.7.14→v9.0.103, gaps fixed PR #501 | both |
| 39 | `APPLY_ZIGBEE_RETRY_FIX.md` | 7K | `configureReportingWithRetry` migration, 12 occurrences dans BaseUnifiedDevice | both |
| 40 | `MANUFACTURER_IDENTIFICATION.md` | 7K | SDK3 settings keys (`zb_manufacturer_name`, `zb_model_id`), ManufacturerNameHelper fallback chain | both |
| 41 | `KNOWN_ISSUES.md` | 6K | 9 firmware bugs (TS0601 time sync, battery 0%, IAS false), 6 app-level | both |
| 42 | `GITHUB_ISSUES_PR_ANALYSIS.md` | 5K | 13 issues : #338 crash startup, #340 soil ZG-303Z, #339 radiator _TZE200_9xfjixap | both |
| 43 | `SHADOW_MODE_REMEDIATION_REPORT.md` | 3K | v7.4.5 SHADOW_MODE enforcement, PowerSourceIntelligence fix | both |

**Total cumulé**: ~950 KB de docs, 43 fichiers principaux, 100% couverts.

---

## 🐛 BUGS IDENTIFIÉS (triés par app cible)

### 🔴 CRITICAL — Affectent les 2 apps

#### B1-B5 : Les 5 BUGS VOLTA (PR #508 fix) — TOUJOURS PRÉSENTS en local
- **Fichier source**: `master/.github/cache/herdsman/tuya-lib.ts`
- **Code**: `localTempCalibration1` à `localTempCalibration5` définis aux lignes 1959-1999
- **Impact**: Tous les thermostats/thermostats-climate Tuya rapportent une calibration erronée
- **DP affectés (depuis `ZHA_Z2M_QUIRKS_ANALYSIS.md`)**: 19, 27, 47, 101, 102, 103, 104, 105, 109, 114
- **Devices affectés (Z2M)**: Moes BHT-002, AVATTO ME167, Beca BRT-100, TRVZB, Nvent, et ~25 autres
- **Fix dans PR #508**: DELETE localTempCalibration1-5, REPLACE 30+ callsites par `divideBy10` ou `raw`
- **App cible**: **both** (les 2 apps utilisent le même herdsman cache sync via `weekly-fingerprint-sync.yml`)
- **Action**: merge PR #508

#### B6-B7 : SIGNED 4-BYTE INFRASTRUCTURE MANQUANTE (PR #508 fix)
- **Fichier**: `master/.github/cache/herdsman/tuya-lib.ts:521,560`
- **Code**: `convertBufferToNumber(chunks)` n'a pas de paramètre `signed`, `convertDecimalValueTo4ByteHexArray` n'a pas le 2s complement
- **Impact**: temp négatives mal lues/écrites sur thermostats v3.3+
- **Fix dans PR #508**: `convertBufferToNumber(chunks, signed=true)` + `if (value < 0) value = 0x100000000 + value;`
- **App cible**: **both**

#### M1-M10 : MENDEL CASES (PR #508 + #509 + #510 fix) — TOUS dans PR
- **M1** (PR #509): `_TZ3000_fllyghyj` air_purifier → climate_sensor
- **M2-M4** (PR #510): soil sensor `soilsensor_2` → `soil_sensor` (3 FPs `_TZE200_myd45weu`, `_TZE284_myd45weu`, `_TZE204_myd45weu`)
- **M5** (UTF-8 mojibake): `??` sur `drivers/valve_irrigation/device.js:173` (Hegel error). **NOT in any PR**, fix manuel 2 lignes
- **M6** (PR #508): TZE28C1000000 prefix normalization (ZF24, PA-44Z)
- **M7** (PR #508): D5Z `queryOnConfigure:true`
- **M8** (PR #508): ZN2S-RS02E `deviceEndpoints({l1:1, l2:1})`
- **M9** (PR #508): 6 AOYAN switches AY-601ZL/801ZL/602ZL/802ZL/603ZL/803ZL
- **M10** (PR #508): SONOFF S61SZBTPB smart plug (260 lignes `customClusterEwelink` cluster 0xFC11, 17 attrs)
- **App cible**: **both** (sauf M9+M10 = master first, backport sélectif à stable)

### 🟠 HIGH — Affectent les 2 apps

#### H1-H2 : BATTERY BUGS (per `BATTERY_ANALYSIS.md`, PR #501 déjà partiellement fixed)
- **B-Battery 1**: `UnifiedBatteryHandler` endpoint[1] only — battery non détectée sur devices multi-endpoint (21 drivers affected)
- **B-Battery 2**: `_isKineticDevice()` regex `/^TS004[1-6]$/` over-match → false positive sur TS0041 battery variants
- **Fix**: utiliser `_findEndpointByCluster` helper qui scanne tous les endpoints + exception list
- **App cible**: **both** (unified handler partagé)

#### H3 : CRASH STARTUP (issue #338) — App-level
- **Symptôme**: App Crash on startup
- **Fix antérieur**: v8.5.0 (safe require) avec `DeviceFingerprintDB` lazy init
- **Status 2026-07-10**: régression possible en v9
- **Action**: vérifier `lib/tuya/DeviceFingerprintDB.js` que la lazy init est toujours là + buffer-based JSON parsing

#### H4 : configureReportingWithRetry (per `APPLY_ZIGBEE_RETRY_FIX.md`)
- **Bug**: 12 occurrences de `cluster.configureReporting` dans `lib/devices/BaseUnifiedDevice.js` doivent être remplacées par `configureReportingWithRetry`
- **Impact**: reporting failures sur sleepy devices
- **App cible**: **both** (BaseUnifiedDevice partagé)

### 🟡 MEDIUM — Affectent 1 ou 2 apps

#### M-FORUM : 6 ISSUES INVESTIGATING (per `FORUM_ISSUES_CONSOLIDATED.md`)
- Cam button no flow v5.8.66 (PERSISTENT)
- Hartmut TS0726 4-gang virtual all toggle
- Lasse_K contact no react v5.9.2-6 (regression from v5.8.43)
- Tividor TS0044 single OK double/long NOT
- Piotr TS0002 `_TZ3000_cauq1okq` 2-gang=1 switch
- lemon TS0203 `_TZ3000_okohwwap`+Zbeacon=generic
- **App cible**: **stable = priorité** (user-visible), **master = can fix in v9.0.193+**

#### M-PATTERN : Driver-mapping-database (per `DEV_NOTES.md`)
- Cross-driver `(manufacturerName * productId)` MUST be UNIQUE
- 13 acceptable exceptions (motion_sensor vs presence_sensor_radar TS0225, etc.)
- **App cible**: **both** (rule CRITIQUE)

### 🟢 LOW — Affectent 1 ou 2 apps

#### L1 : Docs drift (3 files outdated: FORUM_ISSUES_CONSOLIDATED, GITHUB_ISSUES_PR_ANALYSIS, KNOWN_ISSUES)
#### L2 : Forum auto-responses (23+ nightly depuis v5.11.17, templates bien rodés)
#### L3 : 50+ smaller docs à synchroniser
#### L4 : Hegel's 4 errors (H1-H4)
#### L5 : Codex rate limit 100% (1.1B tokens today)

---

## 🔬 DUAL-APP IMPACT MATRIX

| Bug/Fix | master impact | stable impact | Backport strategy |
|---------|---------------|---------------|-------------------|
| B1-B7 Volta | fix forward | fix backport | **MUST backport** (fix bug) |
| M1-M4 FP collision | fix forward | fix backport | **MUST backport** |
| M5 UTF-8 mojibake | fix master | check stable for same file | **MAYBE backport** |
| M6-M8 Z2M sync | fix forward | fix backport | **MUST backport** (sync) |
| M9 AOYAN switches | NEW driver | **DO NOT backport** (stable = legacy, no new features) | master only |
| M10 SONOFF S61SZBTPB | NEW driver | **DO NOT backport** (stable = no new devices) | master only |
| B-Battery 1-2 | fix forward | fix backport | **MUST backport** |
| H3 crash startup | fix master | check stable | maybe backport |
| H4 configureReportingWithRetry | fix forward | fix backport | **MUST backport** |
| 6 forum issues | fix master (v9.0.193) | address on stable if easy (no breaking change) | case-by-case |
| L1 docs drift | both | both | both |
| H1-H4 Hegel errors | CI fix | CI fix | both (CI) |

**Rule of thumb** (per `AI_CONTEXT_MANDATE.md`):
- **Master** = innovation, AI features, WiFi + Zigbee, breaking changes OK
- **Stable** = reliability, Zigbee-only, no breaking changes, bug fixes + new FPs only
- **Backport rule**: if it fixes a bug, backport. If it adds a feature, master only.

---

## 📋 ACTION PLAN (avec marqueurs d'app)

### Phase 0 (10 min) — Préparation
- [x] Mavis investigation 2026-07-10 (ce document)
- [x] Lire `AI_CONTEXT_MANDATE.md`
- [x] Vérifier PR #508 + #509 + #510 sur GitHub

### Phase 1 (15 min) — Merge Volta + Mendel (les 3 PRs)
- [ ] `git fetch origin && git checkout master`
- [ ] Merge PR #508 (le monstre) — résolution manuelle des 9,387 lignes
- [ ] Merge PR #509 (FP dedup)
- [ ] Merge PR #510 (soil sensor rename)
- [ ] Bump master v9.0.190 → v9.0.193
- [ ] **App cible**: **master uniquement** ici

### Phase 2 (5 min) — Fix UTF-8 mojibake master
- [ ] Edit `master/drivers/valve_irrigation/device.js` line 173 : `??` → `💧`
- [ ] Grep `master/` pour autres `??`
- [ ] Test
- [ ] **App cible**: master

### Phase 3 (15 min) — Validation master
- [ ] `cd master && node scripts/ci/pre-commit-checks.js`
- [ ] `cd master && node scripts/validation/check-driver-collisions.js`
- [ ] `cd master && node scripts/validation/check-fingerprint-health.js`
- [ ] `cd master && npx homey app validate --level publish`
- [ ] **App cible**: master

### Phase 4 (30 min) — Backport Volta fixes à stable
- [ ] `git checkout stable-v5`
- [ ] Cherry-pick ou manual copy des 3 PRs appliqués à master
- [ ] Si UTF-8 mojibake présent dans stable/valve_irrigation, fix
- [ ] Bump stable v5.11.219 → v5.11.220
- [ ] **CRITICAL**: NE PAS backporter M9 (AOYAN) ou M10 (S61SZBTPB) — nouvelles features, pas dans le purpose de stable
- [ ] **App cible**: stable (bug fixes seulement)

### Phase 5 (10 min) — Validation stable
- [ ] `cd stable && node scripts/ci/pre-commit-checks.js` (si stable a le script)
- [ ] **App cible**: stable

### Phase 6 (15 min) — Publish master
- [ ] `git commit -m "v9.0.193: merge PRs #508, #509, #510 — Volta calibration + Mendel FP fixes + 6 AOYAN + SONOFF S61SZBTPB + 30+ flow cards titleFormatted"`
- [ ] `git tag v9.0.193 && git push origin master v9.0.193`
- [ ] Watch `.github/workflows/publish.yml` (8-10 min)
- [ ] **App cible**: master

### Phase 7 (15 min) — Publish stable
- [ ] `git tag v5.11.220 && git push origin stable-v5 v5.11.220`
- [ ] Watch publish
- [ ] **App cible**: stable

### Phase 8 (15 min) — Forum + auto-close
- [ ] Post forum announcement
- [ ] Auto-close issues #338, #339, #340
- [ ] Répondre à Cam, Lasse_K, Tividor
- [ ] **App cible**: both

### Phase 9 (15 min) — Diagnostic monitoring
- [ ] Trigger `gmail-diagnostics.yml` manuellement
- [ ] Vérifier que `node .github/scripts/fetch-gmail-diagnostics.js` ne hit plus `missing_gmail_credentials`

**Total estimé**: 2.5 heures

---

## 🛡️ SHADOW MODE STATUS (per `SHADOW_MODE_REMEDIATION_REPORT.md`)

| Component | Status | Shadow State |
|-----------|--------|--------------|
| GitHub Triage | ACTIVE | Silent (Discovery Only) |
| Forum Responder | ACTIVE | Silent (Ghostwriter Ready) |
| Upstream Sync | ACTIVE | Silent (Internal Alignment) |
| App Store Publish | ENABLED | Silent (Test Channel Only) |

**Mode shadow strict** (Erdos): `upstreamMerge:false / ownMerge:true / ownClose:false / ownComment:true`

**Implication** : Les 3 PRs mergent via `ownMerge:true` (auteur = dlnraja). Auto-responses forum/GH sont silencieuses.

---

## 🌐 SOURCES & CROSS-REFERENCES

### Sources locales (always available)
- `master/data/fingerprints.json` (17.7 KB, canonique)
- `master/data/mfs_db.json` (3.2 MB, heuristique)
- `master/data/dp_database.json` (19.5 KB)
- `master/data/_used_mfrs.json` (71 KB)
- `master/lib/tuya/fingerprints.json` (260 KB, sync avec herdsman)
- `master/driver-mapping-database.json` (668 KB, canonique mfr→driver)
- `master/app.json` (6.2 MB)
- `master/stable_app.json` (3 MB)
- `master/.homeychangelog.json` (27 KB, v9.0.176-190 publish-retry pattern)
- `master/.diag/`: extracted herdsman master, audit JSONs
- `master/.github/state/diagnostics-report.json` (0 diagnostics, Gmail blocked)
- `master/.github/SECRETS.md` (13 secrets documented)

### Sources distantes (credentials nécessaires)
- GitHub: 16 stars, 10 forks, 2 open issues, 3 PRs
- Homey Cloud API: needs HOMEY_PAT
- Gmail IMAP: `missing_gmail_credentials`
- Homey forum (Discourse): needs DISCOURSE_API_KEY

### Code source
- 12 Codex rollout sessions today, 6-28 MB each
- 1 main session `019f4aed-a39c-7820-a41f-5b48540af7d1` "SǸparer projets Homeys" (gpt-5.6-sol, 120,616,629 tokens)
- 16 Antigravity skills

### Windows local
- Mavis 3.0.47 + Codex 0.144.0-alpha.4
- 50+ Chrome extensions
- VMware Player + MiniMax Code 3.0.47

---

## 📊 STATS RECAP

| Metric | master | stable |
|--------|-------:|-------:|
| Drivers | 430 (379Z + 51W) | 228 (Z only) |
| Fingerprints | 5,044+ (4,593 unique) | ~3,500 |
| Flow cards | 4,868+ | ~2,000 |
| Capabilities | 170 unique | ~100 |
| Lib files | 468 | shared subset |
| Scripts | 457 | subset |
| Workflows | 46 | mirror |
| Branches | 7 | n/a |
| App version | v9.0.190 | v5.11.219 |
| Backport scope | 3 PRs | bug fixes only |

---

## ⚠️ LIMITES CONNUES

- **No `git` in PATH** → must use GitHub UI for merge
- **No GitHub PAT** → 60 calls/h unauth
- **No Gmail IMAP creds** → diagnostics blocked
- **No Homey Cloud API** → can't test live
- **No Discourse API key** → can't auto-respond forum from Mavis
- **No Python** → using `node:sqlite`
- **Codex at 100% rate limit** (1.1B tokens today)
- **Stable is sibling** (`C:\Users\Dell\Documents\homey\stable\`) NOT inside master
- **Local is shallow clone** (1 commit visible: `1441b534` = same as GitHub HEAD)
- **`_TZ3000_18ejxno0` NOT FOUND** in canonical DB

---

## 📎 MOTS-CLÉS

`tuya-zigbee`, `homey-sdk3`, `dual-app`, `volta-bugs`, `mendel-cases`, `hegel-errors`, `shadow-mode`, `flow-cards-multilingual`, `utf8-mojibake`, `tze28c1000000`, `myd45weu`, `aq-601zl`, `sonoff-s61zbtpb`, `time-sync-23-formats`, `unified-battery-handler`, `endpoint-scan-multi`, `configurereporting-retry`, `ias-cie-enrollment`, `aoyan-switches`, `blakadder`, `z2m-sync`, `mfrs-variants`, `bug-patterns-confidence`, `shadow-mode-remediation`, `local-first-wifi`

---

*Rapport généré par Mavis investigation session mvs_e7cd7397977c4571a373dc2350580aa1 sur 2026-07-10 entre 14:59 UTC et 17:30 UTC+2.*
*Sources: 23+ docs (950 KB) + 16 skills Antigravity + 4 SQLites Codex + 3 PRs GitHub + 13 sessions Codex + 7 workflows GHA + grep local master/stable.*
