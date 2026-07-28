# Scanner Fixes — 2026-07-28

> Correctifs appliqués suite au crawl des 15 sources (`sources-crawl.md`).
> Périmètre : `scripts/scanners/`, `scripts/sync/crawl-z2m.js`. Aucun commit/push.

## Résumé

| # | Problème | Cause | Fix | Preuve de collecte |
|---|----------|-------|-----|--------------------|
| 1 | Auth GitHub absente → scanners à 0 | Les scanners lisaient `GH_PAT \|\| GITHUB_TOKEN`, l'env n'expose que `GH_TOKEN` | Chaîne étendue : `process.env.GH_PAT \|\| process.env.GITHUB_TOKEN \|\| process.env.GH_TOKEN` dans 9 fichiers | `GH_TOKEN: set` détecté ; hubitat/domoticz/smartthings/tinytuya collectent (voir ci-dessous) |
| 2 | SmartThings : 0 entrée | Repo « connu » `w35l3y/SmartThingsEdgeDrivers` = 404 (supprimé) ; de plus les fichiers upstream s'appellent `fingerprints.yml` (pluriel) que le filtre `endsWith('fingerprint.yml')` ratait, et crash latent `d.localMatches.length` sur les entrées du chemin « known repo » (sans champ `localMatches`) | Repo remplacé par `SmartThingsCommunity/SmartThingsEdgeDrivers` (vérifié via `gh api`, default branch `main`, 60 fichiers fingerprints) ; filtre → `/fingerprints?\.ya?ml$/` ; `d.localMatches?.length \|\| 0` | **33 fichiers parsés, 169 nouveaux fingerprints**, cache 12h sauvegardé |
| 3 | TinyTuya : 0 entrée | Parseur désynchronisé : il cherchait `dpid=… datatype=…` (format disparu) uniquement dans `tinytuya/` et `examples/` racine ; les définitions DP upstream vivent désormais dans `tinytuya/Contrib/` et `examples/Contrib/` sous 2 formats : constantes `DPS_POWER = "1"` et dicts `'108': { 'name': 'upper_temp', … }` ; `TINYTUYA_RAW` pointait sur `/main/` alors que la branche par défaut est `master` | `SCAN_PATHS` += `tinytuya/Contrib`, `examples/Contrib` ; 2 nouveaux extracteurs (constantes `DPS_*` et dicts `dps_data`) avec dédup par dpId ; RAW → `/master/` | **125 DP mappings** (16 fichiers Contrib, ex. ThermostatDevice: 32, WiFiDualMeterDevice: 28), cache 24h sauvegardé |
| 4 | CSA-IoT : endpoint vide | `api.csa-iot.org` : DNS ne résout plus (sous-domaine mort) ; `csa-iot.org/csa-iot/connected-things/` = 404 ; la page produits est WordPress/admin-ajax (non exploitable) ; miroir GitHub `csa-iot/connected-things-data` = 404 | Remplacé par le **Matter DCL mainnet** (`https://on.dcl.csa-iot.org`) : `/dcl/model/models` paginé (4914 modèles certifiés) + noms vendors via `/dcl/vendorinfo/vendors/{vid}` ; miroir 404 retiré de `csaRepos` | **4914 produits, 2321 validés, 286 nouveaux manufacturers**, cache 7j sauvegardé |
| 5 | Cache poisoning | Un run non authentifié écrivait un cache vide avec TTL 12h–7j, masquant le problème | Garde dans `ScannerCache.save(data, hash, { hadErrors })` : écriture **refusée** si 0 résultat ET erreurs auth/réseau ; chaque scanner trace les erreurs (`RUN_ERRORS` : HTTP ≥ 400 et erreurs réseau dans `githubGet`/`httpGet`) et passe `hadErrors` | `tmp/test-cache-guard.js` : 4/4 cas PASS (skip si 0+erreurs ; save si 0 légitime ; save si résultats partiels ; signature legacy compatible) |

## Fichiers modifiés

- `scripts/scanners/scanner-cache.js` — garde anti-poisoning dans `save()` (skip + log + compteur d'erreurs stats)
- `scripts/scanners/smartthings-scanner.js` — auth, repo, filtre fingerprints, fix `localMatches`, `RUN_ERRORS`, `save(..., { hadErrors })`
- `scripts/scanners/tinytuya-scanner.js` — auth, `SCAN_PATHS` Contrib, parseur 2 formats, RAW `/master/`, `RUN_ERRORS`, save gardé
- `scripts/scanners/csa-iot-scanner.js` — auth, endpoint DCL + vendorinfo, miroir 404 retiré, `httpGet` instrumenté, save gardé
- `scripts/scanners/{hubitat,domoticz,openhab,tuya-local,xiaomi-miot}-scanner.js` — auth + `RUN_ERRORS` + save gardé
- `scripts/sync/crawl-z2m.js` — auth uniquement
- `tmp/test-cache-guard.js` — test de la garde (4 cas)

## Vérifications

- `node --check` : OK sur les 10 fichiers modifiés.
- Scanners relancés individuellement (pas de mega-crawler) : tinytuya ✅, smartthings ✅, csa-iot ✅ (détails ci-dessous).

## Détails des relances

### TinyTuya
```
Scanning path: tinytuya/Contrib → 16 Python files
  ThermostatDevice.py: 32 items, WiFiDualMeterDevice.py: 28 items, …
DP mappings: 125, Categories: 0, Manufacturers: 1
Cache SAVED (TTL: 24h)
```

### SmartThings
```
Searching: "TS0601 zigbee fingerprint language:YAML" → Found 4 files
Scanning known repo: SmartThingsCommunity/SmartThingsEdgeDrivers
  Found 60 fingerprint files
Files: 33, New fingerprints: 169
Cache SAVED (TTL: 12h)
```

### CSA-IoT
```
Fetching CSA certified products from Matter DCL...
  DCL: 4914 certified models
Deduplicated to 4914 unique products
Products: 4914, Validated: 2321, New manufacturers: 286
Cache SAVED (TTL: 7d)
```
(Le process a été tué par le timeout de 10 min après écriture complète des résultats et du cache — socket keep-alive non refermée ; les données sont intactes.)

## Notes / suivi

- `scripts/automation/token-budget.js` et `api-key-manager.js` lisent aussi `GH_PAT || GITHUB_TOKEN` — hors périmètre de cette mission, même fix d'une ligne recommandé.
- Le cache tinytuya a été régénéré après le test de la garde (le test invalide le cache en fin de run).
- La garde ne protège que le cas « 0 résultat + erreurs » ; un 0 légitime (ex. openHAB) reste cacheable.
