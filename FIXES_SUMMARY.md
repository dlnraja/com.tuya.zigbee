# Fixes Summary — 2026-06-23

Audit agrégé de tous les scripts de fix existants (`FIX_STRAY_NULLS*`, `root-cleanup`, `prepare-publish`, `direct-api-publish`, `check-build`, `inspect-pack`, `auto-publish`) + docs de build/deploy, et patch unifié appliqué aux deux projets (`tuya_repair` + `tuya-repair-nexus`).

---

## 1. Root cause du `processing_failed` Athom (diagnostic)

**Le `processing_failed` a DEUX couches de causes** :

### Couche 1 — locale (CORRIGÉE)
- **Fichier `NUL`** (nom réservé Windows, 91 KB) à la racine + dans `.homeybuild/`. Ce fichier contenait du code source orphelin (ButtonDevice v5.5.805). Il faisait **hang tar-stream** pendant le packaging → archive 0-byte/corrompue → `processing_failed`.
- **Bug `inspect-pack.cjs`** : `require('tar-stream')` au lieu de `tar-fs`. L'outil de validation ne packait **rien** depuis sa création — aucun test n'était réellement exécuté.
- **Bug `direct-api-publish.js`** : `createBuild({body: {version, ...}})` au lieu de params flat → Athom recevait "Invalid Version: undefined" → aucun build ne pouvait être créé.
- **`sdkVersion: 3`** au lieu de **`sdk: 3`** dans le manifest (non conforme à la [doc SDK3](https://apps.developer.homey.app/the-basics/app/manifest)).
- **25/44 drivers avec `manufacturerName: []` vide** (tuya_repair/nexus) → `AggregateError` pendant l'init Zigbee sur le serveur Athom. Le build **réinjecte** ces arrays à chaque exécution.

### Couche 2 — EXTERNE (NON RÉSOLUE, hors code)
**Test A/B décisif** : l'archive du build #2469 (connue fonctionnelle, en `test` sur le dashboard) a été re-téléchargée, bumpée en v9.0.75, et re-uploadée → **elle aussi échoue en `processing_failed` en 6 s**. Tous les builds #2472-#2486 échouent quel que soit le contenu.

→ La cause restante est **externe au code** (compte Athom, quota, changement d'API serveur, ou incident Athom post-13 juin). **L'API n'expose pas la cause précise** — seul le **dashboard Athom** (UI) l'affiche. Action requise : ouvrir https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee → build failed → lire l'erreur, ou lancer `athom-build-error-diag.js` (Puppeteer, nécessite `HOMEY_EMAIL`/`HOMEY_PASSWORD`).

---

## 2. Corrections appliquées (les 2 projets sauf indication)

| # | Fichier | Correction |
|---|---------|------------|
| 1 | `.archive/NUL-recovered-ButtonDevice_v5.5.805.js` | **Créé** : archive du code orphelin contenu dans le `NUL` (91 KB) avant suppression |
| 2 | `NUL` (root + `.homeybuild` + `.archive/old`) | **Supprimé** (3 fichiers tuya_repair) via préfixe UNC `\\?\` |
| 3 | `scripts/maintenance/kill-stray-nulls.cjs` | **Créé** : sanitize noms réservés Windows (NUL/CON/PRN/AUX/COM*/LPT*) via `\\?\`. API programmatique + CLI `--force`/`--dry-run`/`--dir` |
| 4 | `scripts/maintenance/sanitize-manifest.cjs` | **Créé** : post-build sanitize (strip `manufacturerName: []` vides, normalise `sdkVersion`→`sdk`, drop `_comment`) |
| 5 | `scripts/remediation/FIX_STRAY_NULLS.js` | **Rempli** (était stub `'use strict';`). Délègue à `kill-stray-nulls.cjs` |
| 6 | `scripts/remediation/FIX_STRAY_NULLS_V2..V6.js` | **Transformés en shims** delegate vers V1 (rétro-compat) |
| 7 | `scripts/prepare-publish.js` | **Patché** : sanitization NUL pré-copy, `filter` anti-reservname sur copySync, vérif `app.json`+`package.json`, exit codes stricts, sanitize `manufacturerName: []` |
| 8 | `scripts/inspect-pack.cjs` | **Réécrit** : `tar-stream`→`tar-fs` (réplique exacte de `_getPackStream` du CLI Homey). Guard anti-NUL + checks app.json + budget taille |
| 9 | `scripts/direct-api-publish.js` | **Patché** : (a) `createBuild` params FLAT (b) changelog lu de `.homeychangelog.json` (c) `uploadArchive` retry/backoff 3× (d) `pollBuildState` traite `processing_failed`/`error` comme terminal (e) pre-check archive 0-byte |
| 10 | `scripts/auto-publish.js` | **Remplacé** par stub de déprécation hard-fail (était la cause documentée de la boucle `processing_failed` via stdin piping cassé) |
| 11 | `.homeyignore` | **Renforcé** : bloc `NUL/CON/PRN/AUX/COM*/LPT*` (dernier rempart si un NUL réapparaît) |
| 12 | `.homeycompose/app.json` + `app.json` racine | **Corrigé** : `sdkVersion: 3` → `sdk: 3` (tuya_repair ; nexus était déjà OK) |
| 13 | `package.json` | **Patché** : `prebuild: kill-stray-nulls --force` + `postbuild` étendu avec `sanitize-manifest.cjs` |

---

## 3. Workflow build → publish corrigé (tuya_repair)

```bash
# 1) Build (avec hooks auto : prebuild sanitize NUL + postbuild sanitize manifest)
npm run build

# 2) Vérifier l'archive (inspection tar-fs, comme le CLI Homey)
node scripts/inspect-pack.cjs
# Attendu : "OK: archive is well-formed" + taille < 20 MB + 0 NUL + app.json présent

# 3) Préparer la publish dir (sanitize + guards)
npm run prepare-publish

# 4) Lister l'état des builds Athom
node scripts/direct-api-publish.js --list

# 5) Upload + poll + promote (UNE FOIS le blocage externe résolu)
node scripts/direct-api-publish.js --channel test

# ❌ NE PLUS UTILISER : npm run auto-publish (deprecated, hard-fail)
```

## 4. Maintenance préventive

- Si un `NUL` réapparaît (PowerShell junk) : `node scripts/maintenance/kill-stray-nulls.cjs --force --dir .homeybuild`
- Si des `manufacturerName: []` reviennent : `node scripts/maintenance/sanitize-manifest.cjs` (automatique via `postbuild`)
- Les hooks `prebuild`/`postbuild` sont désormais automatiques via `npm run build`

---

## 5. État final

| Projet | NUL | sdk | empty-mfr | scripts patchés | package.json hooks |
|--------|-----|-----|-----------|-----------------|--------------------|
| `tuya_repair` | 0 ✅ | `3` ✅ | 0 ✅ | 8 ✅ | prebuild+postbuild ✅ |
| `tuya-repair-nexus` | 0 ✅ | `3` ✅ | 0 ✅ | 4 ✅ (pas de pipeline publish dédié) | prebuild+postbuild ✅ |

**Restant** : déblocage externe Athom (dashboard ou ticket support) pour que les builds passent de `processing_failed` → `ready`.

---

## 6. Round 2 — Traitement des bugs/logs/issues/forum (2026-06-23)

Inventaire agrégé des sources de données (crash logs `.github/state/diagnostics-report.json`, forum intel cache, GitHub issues, pattern reports, audits statiques) puis triage et traitement. **Découvertes clé** : nexus est frozen depuis avril (plus de nouvelles données), `tuya_repair` est le workspace actif. Plusieurs "bugs signalés" dataient d'avril et **étaient déjà résolus**.

### 6.1 Bugs DÉJÀ RÉSOLUS (vérifiés, annotés pour éviter re-travail)

| ID | Bug signalé | Source | Vérification | Statut |
|----|-------------|--------|--------------|--------|
| P1 | `Unexpected token ')' lib/analytics/AdvancedAnalytics.js:215` (8× avril) | diagnostics-report.json | `node -c` compile OK | ✅ Résolu |
| P2 | Access-before-init flow cards (`smokeDetectedCondition` + 11) | diagnostics-report.json | Guards `if(!card)` présents dans drivers | ✅ Résolu |
| P3 | Double-division `TuyaEF00Manager.js:1912` (wrong sensor values) | pattern-report.md | Fix v5.11.17 ligne 2590-2600 (skip auto-convert si dpMappings) | ✅ Résolu v5.11.17 |
| — | `_tz3000_unknown` fingerprint conflict (18 drivers) | fingerprint-conflicts.json | Compte aujourd'hui = **0** | ✅ Déjà nettoyé |

### 6.2 Bugs traités ce round

| ID | Bug | Action | Fichiers |
|----|-----|--------|----------|
| **P5** | Faux battery alerts (35 reports) — devices sur secteur vus comme battery | Ajout `get mainsPowered() { return true; }` sur **35 drivers purement secteur** (classes `light`/`thermostat`/`heater`/`fan`/`curtain` sans cap battery). UnifiedBatteryHandler ligne 471/585-591 retire alors `measure_battery`. | `drivers/{35 noms}/device.js` — 35/35 syntax OK |
| **P7** | `data/community-intel.json` corrupt (truncated GitHub comment strings, unparseable) | Archivé vers `.archive/community-intel-corrupt-202604.json.bak` (préservé). Remplacé par envelope JSON valide `{_note, issues:[], fingerprints:[]}`. Source autoritaire mise à jour = `data/community-sync/report.json` (juin 2026, 6722 fingerprints). | `data/community-intel.json`, `.archive/community-intel-corrupt-202604.json.bak` |
| — | Utilitaire de repair JSON créé (réutilisable) | `scripts/maintenance/fix-json-control-chars.cjs` (escape control chars + détection strings tronquées) | nouveau fichier |

### 6.3 Bugs DOCUMENTÉS (non traités ce round — nécessitent travail dédié)

| ID | Bug | Pourquoi reporté | Action recommandée |
|----|-----|------------------|--------------------|
| **P4** | 16 drivers multigang (`dimmer_*`/`wall_remote_*`/`wall_switch_*`/`wifi_switch_*`) n'ont pas `_setGangOnOff` → flow actions multigang (`switch_multi_gang_turn_on/off`) loggent "Error: _setGangOnOff not found" | Refactor substantiel : ces `device.js` étendent `TuyaSpecificClusterDevice` au lieu de `UnifiedSwitchBase`. Les passer à `UnifiedSwitchBase` peut casser d'autres choses. | Plan dédié + tests : pour chaque driver, faire étendre `UnifiedSwitchBase` (comme `dimmer_2_gang/device.js` qui marche), vérifier les overrides |
| **P6** | `_tze200_placeholder_generic` fingerprint (9 drivers dans app.json généré, 1 source `wall_switch_5_gang_tuya`) | C'est un **catch-all** intentionnel pour switches 5-gang `_TZE200_*` non identifiés. Le retirer **casserait** le pairing de ces devices (le driver n'a QUE ce fingerprint). | Récupérer la liste des **vrais** manufacturerNames Tuya pour ce switch (zigbee2mqtt / rapports users), remplacer le placeholder par les fingerprints spécifiques |

### 6.4 Bugs STALE (données sources gelées)

- **diagnostics-report.json** (email crashes) : dernière entrée 2026-05-17. Cause probable : l'app ne peut plus être publiée (blocage Athom `processing_failed`), donc aucun nouvel utilisateur ne génère de crash. **Résoudre le blocage Athom rouvrira le flux de crash data.**
- **Tous les caches forum/issues de `tuya-repair-nexus`** : frozen 2026-04-11. Le pipeline live a migré vers `tuya_repair`. Décision à prendre : soit pointer les workflows nexus vers les sources live, soit retirer formellement nexus comme hôte d'intel.

### 6.5 Patterns utilisateurs les plus fréquents (informationnel)

D'après `pattern-report.md` (2026-06-21) :
1. **False Battery Alert** — 35 reports → **traité P5** ✅
2. **Pairing Failure** — 18 reports → partiellement lié à P6 (fingerprints)
3. **Device Not Responding** — 8 reports → problème mesh Zigbee (côté utilisateur, pas code)
4. **Device Shows Unknown** — 7 reports → lié à P4/P6
5. **Ring/Alarm Wrong** — 5 reports → DP map à corriger par-device

### 6.6 Vérification finale round 2

- ✅ 35/35 drivers P5 compilent (`node -c`)
- ✅ `data/community-intel.json` parse OK (envelope valide)
- ✅ `community-intel.json` original archivé (rien perdu)
- ✅ `scripts/maintenance/fix-json-control-chars.cjs` syntax OK

---

## 7. Récap commandes utiles

```bash
# Pipeline build (auto: sanitize NUL + sanitize manifest)
npm run build

# Traiter un fichier JSON corrompu
node scripts/maintenance/fix-json-control-chars.cjs path/to/file.json

# Sanitize manuel après build
node scripts/maintenance/sanitize-manifest.cjs
node scripts/maintenance/kill-stray-nulls.cjs --force --dir .homeybuild

# Vérifier l'archive
node scripts/inspect-pack.cjs
```

---

## 8. Round 3 — Relecture des règles des 2 apps + améliorations (2026-06-23)

Relecture exhaustive des règles des 2 branches (`tuya_repair` master + `tuya-repair-nexus` master) via `docs/rules/*.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`. Checklist structurée extraite (manifest / driver / code / publish / forbidden / conventions). Objectif : **améliorer les apps en respectant leurs règles**.

### 8.1 Alignement des fixes précédents avec les règles

| Règle | Contrôle | Verdict |
|-------|----------|---------|
| **mainsPowered** (B4/§7) | Aucun des 35 drivers patchés n'a `measure_battery` dans son compose → le getter `mainsPowered: true` est suffisant ( UnifiedBatteryHandler ne l'injectera pas). Le retrait runtime n'est pas nécessaire. | ✅ Conforme |
| **O13** icon.svg racine | Présent sur les 2 apps | ✅ Conforme |
| **O17** pas de champ `icon` dans app.json | Absent des 2 apps | ✅ Conforme |
| **O19** category string (pas array) | `"appliances"` (string) sur les 2 apps | ✅ Conforme |
| **O20** pas de champ `api` / permissions vides | Absent, `permissions: []` sur les 2 apps | ✅ Conforme |
| **O18** pas de wildcard `*.json` dans `.homeyignore` | Aucun wildcard ; `data/fingerprints.json`, `lib/tuya/fingerprints.json`, `locales/*.json` présents (non exclus) | ✅ Conforme |
| **sdk: 3** | Propagé sur `.homeycompose/app.json` + racine + `.homeybuild` | ✅ Conforme |

### 8.2 Améliorations appliquées ce round

| Amélioration | App | Détail |
|--------------|-----|--------|
| **Règle A9** (pas de `console.log` en production) | **nexus** | 19 fichiers drivers, **283** `console.log/error` remplacés par logger injectable `_moduleLog`/`_moduleErr` (silencieux sauf `NEXUS_DEBUG=1`). 19/19 syntax OK. Script `scripts/maintenance/replace-console-log.cjs` créé. |
| **Règle A9** | **tuya_repair** | Déjà conforme (0 `console.log` réel, juste un commentaire) — rien à faire |
| **Audit M3** (flow IDs multigang) | **2 apps** | `scripts/maintenance/audit-multigang-flows.cjs` créé (read-only). Résultat : **30 violations tuya_repair**, **13 nexus** (10 déjà compliant). |

### 8.3 Refactors documentés comme priorité (non faits à l'aveugle)

| Refactor | Règles | Portée | Pourquoi reporté |
|----------|--------|--------|------------------|
| **Multigang complet (M3 + P4)** | M1-M5, I2, H4 + flow IDs `${driver}_physical_gang{N}_{on\|off}` | 43 drivers (30 tuya_repair + 13 nexus) | Pour chaque driver : (1) déclarer flow triggers dans `driver.flow.compose.json`, (2) les enregistrer via `this.homey.flow.getTriggerCard(id)` dans `device.js`, (3) faire étendre `UnifiedSwitchBase` (pas `TuyaSpecificClusterDevice`), (4) tester. Risque de régression sur flow cards existants → nécessite plan dédié + tests par driver. |
| **P6 `_tze200_placeholder_generic`** | manufacturerName non vide (KNOWLEDGE_BASE §3) | 1 driver source (`wall_switch_5_gang_tuya`) | C'est un catch-all intentionnel pour switches 5-gang non identifiés. Retirer casserait le pairing. Nécessite la liste des vrais manufacturerNames Tuya. |

### 8.4 Divergences nexus à respecter (ne pas appliquer tuya_repair à l'aveugle)

1. **Versioning** : nexus = `7.x.x` (v7.2.5 "Nexus Awakening"), **pas** `5.11.x` / `9.0.x`. Les `docs/rules` portent encore les anciens numéros — faire confiance à `.homeycompose/app.json`.
2. **Modules load-bearing nexus** (à NE PAS supprimer même s'ils paraissent inutilisés) : Virtual Energy Engine, Radio-Based Presence, EventDeduplicationLayer, Collision Resolver, BatteryManager V2/V3/V4, ManufacturerBDD, ProtocolAutoOptimizer.
3. **Bloc NUL/CON/... dans `.homeyignore`** : critique sur nexus, à préserver absolument (28 lignes).
4. **Architecture "Shadow-Pulsar"** : cloud mirror GLOBALLY désactivé par défaut, deadband filter, leaky-bucket throttle 1req/2s, Cloud Echo Shield 2.5s.
5. **Brand color** `#00E6A0` (teal nexus), pas défaut tuya_repair.
6. **Multigang jusqu'à 8-gang** sur nexus (vs 4-gang tuya_repair) : `switch_wall_5/6/7/8gang`, `wifi_switch_*gang`.

### 8.5 Vérifications finales round 3

- ✅ 19/19 drivers nexus A9 compilent (`node -c`)
- ✅ tuya_repair : 0 `console.log` réel
- ✅ Manifest rules O13/O17/O19/O20 conformes sur les 2 apps
- ✅ `.homeyignore` O18 conforme sur les 2 apps
- ✅ `audit-multigang-flows.cjs` déployé sur les 2 apps
- ✅ `replace-console-log.cjs` déployé sur nexus

### 8.6 Commandes ajoutées

```bash
# Audit M3 (règle multigang flow IDs)
node scripts/maintenance/audit-multigang-flows.cjs              # .homeybuild/app.json
node scripts/maintenance/audit-multigang-flows.cjs app.json     # manifest spécifique

# Fix A9 (console.log → logger injectable) — nexus
node scripts/maintenance/replace-console-log.cjs                # dry-run
node scripts/maintenance/replace-console-log.cjs --apply        # applique
```
