# P92 — Matching heuristique d'empreintes (manufacturerName / productId)

Date : 2026-07-28 · Auteur : agent Kimi · Périmètre : `lib/`, `test/`, `tmp/`, `reports/`
(aucune modification de `drivers/`, `scripts/`, `app.json`, aucun git commit/push)

---

## 1. Cartographie du chemin d'identification dynamique

Le matching **statique** (appairage) est fait par le core Homey sur
`app.json` / `driver.compose.json` (couples `manufacturerName` × `productId`,
**case-sensitive** — d'où la stratégie dual-case P82 dans les manifestes).

Quand un device est appairé en « Unknown / generic », la **deuxième couche**
vit dans l'app :

```
pairing générique
  └─ UnknownDeviceHandler.analyzeDevice()          lib/helpers/UnknownDeviceHandler.js
       └─ ProbabilisticDeviceDetector.detect(data) lib/helpers/ProbabilisticDeviceDetector.js
            ├─ compound_fingerprint_db → lib/DeviceFingerprintDB.lookup(mfr, pid)
            │     (clés "mfr|pid" curées, ~120 entrées + PRODUCT_ID_DEFAULTS)
            ├─ runtime_fingerprint_db  → lib/tuya/DeviceFingerprintDB.getFingerprint(mfr, pid)
            │     (data/fingerprints.json + lib/tuya/fingerprints.json + lib/data/fingerprints.json,
            │      lazy-load, index lowercase O(1), ~5 711 clés fusionnées)
            ├─ tuya_profiles           → lib/tuya/TuyaProfiles
            ├─ enriched_dp_mappings    → lib/tuya/EnrichedDPMappings
            ├─ driver_mapping_database → driver-mapping-database.json (mfr_index / pid_index)
            ├─ mfs_db                  → data/mfs_db.json (4 308 devices, clés mfr minuscules,
            │                            modelIds, driverHint, confidence)
            ├─ community_enriched      → data/community-sync/all-enriched.json
            ├─ manufacturer_quirks / cluster_behavior / dp_behavior / learning / capability_overlap
            └─ votes pondérés → suggestedDriver + confidence
```

`lib/tuya/DeviceFingerprintDB` est aussi consommé directement par
`lib/emergency/EmergencyDeviceFix.js` (`getFingerprint`) et expose
`getDriverId` / `getDPMapping` / `findByModelId` au reste de l'app.

## 2. Comparaisons mfr/pid : état avant P92

| Endroit | Comportement avant | Limite |
|---|---|---|
| `lib/DeviceFingerprintDB.lookup` | exact `mfr\|pid` puis `TU.normalize` sur la clé composée | pas de variante de préfixe, pas de fuzzy |
| `lib/tuya/DeviceFingerprintDB.getFingerprint` | index lowercase `TU.normalize` | casse OK, mais `_TZE204_` vs `_TZE200_` raté, espaces insécables/zero-width ratés |
| `ProbabilisticDeviceDetector._addMfsEvidence` | `_lookupCaseInsensitive` sur `mfs_db.devices` | **bug : lisait `entry.driverId/driver` alors que mfs_db expose `driverHint` → source quasiment toujours "miss"** |
| `lib/multichannel/ParallelDetector.js:140` | `===` strict mfr + pid | case-sensitive |
| `lib/helpers/CustomPairingHelper.js:187` | `modelId ===` strict | case-sensitive |
| `lib/utils/tuyaUtils.js:69` | `modelId !==` strict | case-sensitive |
| divers `modelId === 'TS0601'` / `'TS0041'…` | littéraux uppercase | conventionnel (les PID Tuya sont uppercase), inchangé |

Seuls les deux premiers points + mfs_db sont sur le chemin d'identification
dynamique principal : ce sont eux qui ont été modifiés (minimal, exact-match
d'abord, heuristique en fallback).

## 3. Nouveau module : `lib/utils/fingerprint-matcher.js` (v1.0.0)

API :

- `normalizeMfr(raw)` → `{ key, prefix, suffix }` — pipeline `TuyaNormalizer`
  (NFKD, diacritiques, emoji, contrôles, lowercase) **+** espaces insécables
  unicode, zero-width, BOM, unification des séparateurs (espaces/points/tirets
  → `_`, `_` répétés fusionnés). Split préfixe/suffixe (`_tze200` / `vvmbj46n`).
- `normalizePid(raw)` → même nettoyage + uppercase.
- `matchFingerprint(mfr, pid, db, opts)` → `{ key, entry, score, matchType, candidates } | null` :

  | matchType | score | condition |
  |---|---|---|
  | `exact` | 1.00 | clé brute identique |
  | `normalized` | 0.95 | clé normalisée identique (casse/parasites) |
  | `prefix_variant` | 0.90 | même suffixe, préfixe interchangeable (`_TZE200_`/`_TZE204_`/`_TZE284_`/`_TZE608_`/`_TYST11_`, `_TZ3000_`/`_TZ3002_`, `_TZ3210_`/`_TZ3212_`, `_TYZB01_`/`_TYZB02_`) |
  | `mfr_exact_pid_unknown` | 0.70 | mfr exact mais pid absent des `modelIds` de l'entrée |
  | `fuzzy_suffix` | 0.60 (0.55 cross-prefix) | distance d'édition ≤ 2 sur le suffixe, même famille de préfixe |

  Seuil configurable (`opts.threshold`, défaut 0.6), scores surchargeables
  (`opts.scores`). Préfiltre signatures char (Int16Array, zéro allocation)
  avant Levenshtein borné ; paliers 1-3 en O(1) via maps ; mémoïsation par db
  (WeakMap, bornée 2 000 entrées) → **~2,5 ms par requête inédite, ~0,1 ms en
  cache** sur mfs_db (4 308 clés).
- `bestCandidates(mfr, db, k)` → top-k sans seuil (fallback ultime).
- `suggestDriverFromPid(pid, mfsDbDevices)` → driverHint le plus fréquent
  parmi les entrées mfs_db portant ce pid (fallback « mfr absent, pid connu »).
- `invalidateIndex(db)` après mutation d'une db.

**Logging VERBOSE** (demande explicite) : activé via `opts.verbose`,
`opts.log`, ou env `TUYA_FP_VERBOSE=1`. Chaque tentative trace : entrée brute,
forme normalisée (préfixe/suffixe), candidats retenus avec score, décision
finale (ou meilleur candidat sous le seuil).

Kill-switch global : `TUYA_FP_HEURISTIC=0` → retour au comportement exact/CI
d'avant P92.

## 4. Points d'intégration modifiés

1. **`lib/DeviceFingerprintDB.js`** — `lookup()` : priorité 2.5
   `_heuristicLookup()` entre `exact_ci` et `PRODUCT_ID_DEFAULTS`. Restreint
   aux clés de même productId, renvoie `matchType: prefix_variant|fuzzy_suffix`
   + `matchScore`. L'existant (exact, exact_ci, pid_default) est inchangé et
   prioritaire.
2. **`lib/tuya/DeviceFingerprintDB.js`** — `getFingerprint()` : après l'index
   lowercase, fallback `matchFingerprint` sur la db fusionnée ; l'entrée est
   enrichie de `matchType`, `_matchScore`, `_matchedKey` (les matches exacts ne
   portent aucune métadonnée heuristique). `setFingerprint()` invalide le
   cache du matcher.
3. **`lib/helpers/ProbabilisticDeviceDetector.js`** — `_addMfsEvidence()` :
   - **fix bug** : accepte `entry.driverHint` (schéma réel de mfs_db) en plus
     de `driverId/driver` ;
   - fallback heuristique `matchFingerprint` sur `mfs_db.devices` quand la
     recherche exacte/CI rate (vote pondéré par le score de match × 0,8) ;
   - fallback pid-only `suggestDriverFromPid` quand le mfr est totalement
     inconnu (vote faible 14–20) ;
   - **dégradation gracieuse** : si `data/mfs_db.json` est absent (payload
     publié, voir §5), la source est marquée `unavailable`, un log unique est
     émis, et la détection continue sur les autres sources.

Le score du détecteur reste cohérent : les matches heuristiques compound
tombent dans la branche non-exacte (36 pts vs 92), les runtime heuristiques
dans la branche manufacturer-only (64/46 vs 88).

## 5. Données embarquées au runtime & payload publié

Le matching dynamique s'appuie sur des **fichiers de données chargés au
runtime** (pas sur le manifeste) :

- `lib/tuya/DeviceFingerprintDB` charge `fingerprints.json` par `fs` depuis 5
  chemins candidats (`lib/tuya/`, `lib/data/`, `data/`, CWD, `/app/data/`) avec
  fallback gracieux (`{}`) — c'est ce fichier qui est **inclus dans le payload
  publié** et qui porte l'essentiel de la couverture runtime.
- `ProbabilisticDeviceDetector` charge `data/mfs_db.json`,
  `driver-mapping-database.json`, `data/community-sync/all-enriched.json` via
  `readJson(path, fallback)` — déjà tolérant à l'absence.

⚠️ **`scripts/prepare-publish.js` supprime `data/mfs_db.json` du payload
publié sauf si `HOMEY_INCLUDE_MFS_DB=1`** (vérifié lignes 61-63, 196, 238).
Conséquences et mesures prises :

- Le matcher **ne dépend pas** de mfs_db : `fingerprints.json` (bundlé) reste
  la source principale ; mfs_db n'est qu'une source de vote additionnelle.
- En son absence, `_addMfsEvidence` court-circuite proprement
  (`status: 'unavailable'` + log unique, vérifié par simulation : `detect()`
  garde `soil_sensor` @ 88 % sur `_TZE284_0ints6wl`).
- Si on veut la couverture mfs_db (4 308 entrées, driverHint + confidence) en
  production, deux options : publier avec `HOMEY_INCLUDE_MFS_DB=1`, ou générer
  une version allégée dédiée (`data/fingerprint-index.json` : mfr → driverHint
  + modelIds seulement, ~quelques centaines de Ko) — **hors de mon périmètre**
  (`scripts/`, `data/`), à faire par l'agent propriétaire de
  `prepare-publish.js`.

## 6. Couverture DP — avant / après

Sources confrontées (script `tmp/analyze-dp-coverage.js`, sortie
`tmp/dp-coverage-report.json`) :

- `lib/tuya/TuyaDPDatabase` : 12 profils (TRV×3, curtain, climate, soil, PIR,
  siren, dimmer, CO, radar, plug) = 32 dpIds.
- `lib/tuya/TuyaDataPointsComplete.DATAPOINTS` : dictionnaire global, 55 dpIds.
- `data/scanners/tuya-local-results.json` : 500 devices chargés, 7 686 DP
  mappings (16 193 annoncés au scan complet).
- `scripts/sync/data/z2m.json` : 2 122 fingerprints — **ne contient pas de DP
  mappings** (mfr/pid/model/vendor seulement) ; utilisé pour la couverture mfr
  (§7), pas pour les DPs.

Résultats :

- **0 chevauchement** entre les manufacturers tuya-local (392 renseignés) et
  les 25 manufacturers des 12 profils `TUYA_DP_DATABASE` → aucune extension de
  profil existant possible sans risque.
- Les dpIds manquants sont propres à des familles non profilées (aspirateurs,
  pet feeders, vannes, alarmes). Les sémantiques dpId étant **spécifiques à
  chaque famille**, aucune `capability` n'a été inventée : ajout **mapping de
  référence uniquement** au dictionnaire global.
- **`TuyaDataPointsComplete.DATAPOINTS` : 55 → 199 entrées (+144)**. Entrées
  ajoutées : `{ id, type, name, devices: ['tuya-local:<catégorie>'],
  description: '…seen Nx; reference-only mapping', capability: null }`,
  uniquement pour des dpIds totalement absents (1–255) avec nom significatif.
  `getCapability()` renvoie `null` pour celles-ci (sûr : garde existante),
  `getDPsForDevice('tuya-local:diagnostic')` → 87 entrées.
- Les 89 lignes restantes du delta (233 − 144) : dpId 0 / hors plage et
  doublons inter-catégories fusionnés.

## 7. Couverture mfr Z2M — avant / après

Sur les 2 122 fingerprints de `scripts/sync/data/z2m.json`, jouées contre la
couche runtime (`fingerprints.json` + mfs_db) :

| | avant P92 (exact/CI) | après P92 |
|---|---|---|
| couverts exact/CI | 2 012 (94,8 %) | 2 012 |
| **couverts en plus par l'heuristique** | — | **+93 (4,4 %)** |
| non couverts | 110 | 17 (0,8 %) |

Exemples réels (extraits de `tmp/dp-coverage-report.json`) :

- `_TZE284_xdtnpp1a` (Avatto ME168) → `_TZE204_XDTNPP1A`, `prefix_variant` 0.9
- `_TZE204_aaeaifez` (TRV60) → `_TZE284_aaeaifez`, `prefix_variant` 0.9
- `_TZE284_sndkanfr` (SZLM04U) → `_TZE204_SNDKANFR`, `prefix_variant` 0.9
- `_TZE200_yp5tsi3y` (ERC2206-Z) → `_tze200_yp5tsi3y`, `normalized` 0.95
  (casse divergente mfs_db vs Z2M)
- `_TZ3210_qlmnxmac` (MG-AUZG01) → `_tz3210_qlmnxmac`, `normalized` 0.95

Exemples synthétiques (tests unitaires) :

- `_tze200_VVMBJ46N ` → `_TZE200_vvmbj46n` (casse + parasite) : normalized
- `_TZE204_vvmbj46n` → `_TZE200_vvmbj46n` : prefix_variant
- `_TYST11_sgabhwa6` → `_TZE284_sgabhwa6` : prefix_variant
- `_TZE200_jthf7vb7` (typo 1 char) → `_TZE200_jthf7vb6` water_leak_sensor : fuzzy_suffix
- `_TZE200_vvmbjooo` (typo 3 chars) → **null** (rejeté)

## 8. Vérifications

- `test/fingerprint-matcher.test.js` : **38 cas, tous verts** (casse mixte,
  espaces/parasites NBSP/zero-width/contrôles, séparateurs, variantes de
  préfixe, fuzzy 1-2 chars, rejet 3 chars, suffixe court, pid seul, pid
  inconnu, seuil custom, top-k, invalidation de cache, logging verbose,
  intégration compound + runtime).
- `npx mocha test/critical/*.test.js` : **75 passing, 0 failing** (baseline
  pré-P92 : 62 passing — la suite a grossi entre-temps via d'autres agents).
- `node --check` OK sur : `lib/utils/fingerprint-matcher.js`,
  `lib/DeviceFingerprintDB.js`, `lib/tuya/DeviceFingerprintDB.js`,
  `lib/helpers/ProbabilisticDeviceDetector.js`,
  `lib/tuya/TuyaDataPointsComplete.js`, `test/fingerprint-matcher.test.js`.
- Dégradation gracieuse mfs_db absent : simulée (existsSync patché) →
  `mfs_db: unavailable`, log unique, détection intacte.
- Perf : matcher ~2,5 ms/requête inédite (4 308 clés), ~0,1 ms en cache ;
  A/B `TUYA_FP_HEURISTIC=0/1` sur `forum-routing-regressions` : pas de
  différence systématique (variance machine dominée par le parsing répété
  d'`app.json` 3,4 Mo dans les tests eux-mêmes).

## 9. Fichiers touchés

| Fichier | Nature |
|---|---|
| `lib/utils/fingerprint-matcher.js` | **nouveau** — moteur de matching |
| `lib/DeviceFingerprintDB.js` | priorité 2.5 heuristique dans `lookup()` |
| `lib/tuya/DeviceFingerprintDB.js` | fallback heuristique dans `getFingerprint()` + invalidation cache |
| `lib/helpers/ProbabilisticDeviceDetector.js` | fix `driverHint`, fallbacks heuristique + pid-only, dégradation gracieuse mfs_db |
| `lib/tuya/TuyaDataPointsComplete.js` | +144 entrées DATAPOINTS (référence tuya-local) |
| `test/fingerprint-matcher.test.js` | **nouveau** — 38 tests |
| `tmp/analyze-dp-coverage.js`, `tmp/generate-dp-fragment.js`, `tmp/dp-coverage-report.json`, `tmp/datapoints-tuyalocal-fragment.js` | outillage d'analyse |

## 10. Suites possibles (hors périmètre)

- Version allégée `data/fingerprint-index.json` générée depuis mfs_db pour le
  payload publié (nécessite `scripts/` + `data/`).
- `lib/multichannel/ParallelDetector.js:140` et
  `lib/helpers/CustomPairingHelper.js:187` utilisent encore `===` strict —
  candidats pour le matcher si leur périmètre est ouvert.
- Les 17 fingerprints Z2M non couverts : à alimenter dans `data/mfs_db.json`
  (pipeline d'enrichissement existant).
