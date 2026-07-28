# Missing Devices — Cross-ref & Apply — 2026-07-28

> Phase 2 après `sources-crawl.md` : croisement Sacred Couple (mfr+pid) de toutes les sources fraîches
> contre `data/mfs_db.json` + les 431 `drivers/*/driver.compose.json`, puis application validée.
> Aucun commit/push. Scripts : `tmp/crossref-all-sources.js`, `tmp/apply-missing-2026-07-28.js`.
> État intermédiaire : `.github/state/crossref-2026-07-28/{missing-pairs,apply-report}.json`.

## 1. Cross-ref par source (paires mfr+pid)

Base connue : 4 405 mfrs / 164 488 paires (mfs_db.devices + 431 drivers).

| Source | Paires | Déjà connues | Manquantes | Rejetées (raison) |
|--------|-------:|-------------:|-----------:|-------------------|
| blakadder | 635 | 427 | **70** | 138 (pid vide dans la source) |
| z2m | 2122 | 1085 | **254** | 783 (pid vide ou corrompu `\u0000`) |
| zha | 177 | 160 | **17** | 0 |
| deconz | 23 | 0 | 0 | 23 (pid absent — mfr seul, pas de Sacred Couple) |
| johan-dump | 28 | 28 | 0 | 0 |
| hubitat | 9931 (mfr×modelIds par fichier) | 1621 | 2739 uniques | 0 |
| domoticz | 167 | 96 | 71 | 0 |
| smartthings | 1415 | 134 | 417 | 864 (mfr non-Tuya) |
| tuya-local | — | — | 0 | total : aucun mfr Zigbee `_TZ*` (noms de marques uniquement) |

- **Total manquants uniques (inter-sources dédupliqués) : 3 462**
- **Confirmés par 2+ sources : 97**
- Note : hubitat/domoticz/smartthings ne fournissent pas de paires directes ; les paires sont des
  produits croisés mfr×modelIds par fichier → **spéculatives** sauf confirmation multi-source.

## 2. Tri et politique d'application

| Ensemble | Définition | Nb | Action |
|----------|-----------|---:|--------|
| **A** | ≥1 source fiable (blakadder/z2m/zha/johan) | 318 | mfs_db (+ driver si sûr) |
| **B** | scanner-only confirmé par 2+ sources | 62 | mfs_db uniquement (confiance 0.6) |
| **C** | scanner-only mono-source (croisement spéculatif) | 3 082 | **rejeté** (non confirmé) |

Catégories de l'ensemble A (déduites vendor/description/pid) : bulb 85, light 29, switch 26,
cover 23, remote 22, contact 16, climate 11, plug 21, hvac 9, water 9, dimmer 4, presence 4,
router 3, air_quality 3, gas 3, motion 2, siren/smoke/soil/fan 1 chacun, unknown 44.

## 3. Application réelle

- **`data/mfs_db.json`** : **+88 nouvelles entrées mfr** (4 220 → 4 308) et **+292 pids fusionnés**
  dans des entrées existantes (380 paires au total, ensembles A+B). `stats.totalEntries` et
  `_meta.lastUpdated` mis à jour.
- **Drivers : 0 ajout net.** Un premier apply (pattern `apply-blakadder-new.js`, ajout du mfr à
  `manufacturerName`) a produit **398 nouvelles collisions mfr×pid** : 100 % des mfrs blakadder/z2m
  manquants existent déjà (même casse) dans un autre driver, donc l'ajout croise toutes les listes
  de pids. **Revert complet effectué** (183 mfrs retirés de 25 drivers), puis ré-application avec
  règle stricte « mfr absent de TOUS les drivers » → 0 candidat restant :
  - 255 paires : mfr déjà claim ailleurs (ajouter = collision, contraire à la doctrine) ;
  - 47 paires : catégorie inconnue (mfs_db seul) ;
  - 16 paires : mfr nouveau mais pid absent du driver cible ET catégorie douteuse
    (ex. `_TZ3000_xr5m6kfg/TS0505B` keyword-classé contact alors que TS0505B = ampoule) → mfs_db seul.
- `data/fingerprints.json` (53 entrées curées) : non maintenu en parallèle pour les ajouts en masse
  (dernier touché par P11) → non modifié.
- Compteurs : pas de bump de version/changelog — c'est le rôle du bot auto-publish (cf. P19) ;
  seul `mfs_db.stats.totalEntries` a été mis à jour.

## 4. Validateurs

| Validateur | Avant | Après |
|-----------|-------|-------|
| `fp-collision-check.js --baseline` | exit 0 (44 courantes / 419 baseline / 0 new) | **exit 0** (44/419/**0 new**) |
| `scripts/_validate_all.js` | — | **3/3 checks passed** (431 drivers, 0 erreur CI, 34 warnings rebuild pré-existants) |
| `npx mocha test/critical/*.test.js` | — | **62 passing** (+ runner node : 12 pass, 0 fail) |

## 5. Rejets consolidés

- 3 082 paires scanner mono-source : croisement mfr×modelIds spéculatif, non confirmé.
- 1 025 entrées : pid vide/corrompu dans la source (blakadder 138, z2m 783, deconz 23, divers).
- 864 entrées smartthings : mfr non-Tuya (pas de préfixe `_TZ*`/`_TY*`).
- tuya-local : 0 mfr Zigbee exploitable (noms de marques + DP mappings uniquement).

## 6. Suites possibles (non faites)

- Les 16 paires « mfr nouveau, catégorie douteuse » méritent une vérification manuelle Z2M avant
  ajout driver + pid.
- Les 3 082 paires scanner mono-source pourraient être confirmées via un crawl Z2M/blakadder ciblé.
- deCONZ (23 mfrs sans pid) : récupérer les modelIDs depuis les DDF deCONZ.
