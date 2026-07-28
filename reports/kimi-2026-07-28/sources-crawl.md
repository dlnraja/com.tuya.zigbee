# Sources Crawl — 2026-07-28

> Phase « collecte fraîche » des 15 sources documentées dans `AGENTS.md`.
> Exécuté crawler par crawler (séquentiel) depuis la racine du projet, aucun script `apply-*` lancé, aucun commit.

## Résumé

| # | Source | Statut | Entrées collectées | Fraîcheur | Sortie |
|---|--------|--------|--------------------|-----------|--------|
| 1 | zigbee.blakadder.com | ✅ OK | 2692 devices bruts, **635 FPs Tuya**, 49 mfrs génériques, 55 pids TS | Nouveau (fetch 898 KB, DB v2026-07-28) | `scripts/sync/data/blakadder.json` |
| 2 | Z2M converters | ✅ OK | **2122 FPs Tuya uniques** (380 fichiers, 0 erreur) | Nouveau | `scripts/sync/data/z2m.json` |
| 3 | ZHA quirks | ✅ OK | **177 FPs uniques** (21 fichiers, 178 bruts) | Nouveau | `scripts/sync/data/zha.json` |
| 4 | deCONZ | ✅ OK | **23 FPs Tuya uniques** (3 fichiers cpp) | Nouveau | `scripts/sync/data/deconz.json` |
| 5 | JohanBendz issues/PRs | ✅ OK (incrémental) | 169 issues, 589 commentaires, 186 PRs, **123 devices (mfrs+pids)** | Nouveau (depuis 2026-07-16) | `.github/state/johan-dump/{issues,comments,prs,devices}.json` |
| 6 | Homey forum 140352 | ⏭️ SKIP (données récentes) | — | Cache du 2026-07-27 (J-1) : `topic-140352-posts.json` (1,2 MB), `full-140352.json` (5,3 MB) | `.github/state/forum/` |
| 7 | Gmail diagnostics | ⏭️ SKIP (credentials) | — | `GMAIL_APP_PASSWORD` absent ; script `tools/ci/gmail-diagnostics.js` introuvable sur master | — |
| 8 | TinyTuya | ⚠️ OK technique, 0 entrées | 0 DP mappings | Nouveau mais vide : le parseur cherche `dpid=… datatype=…` ; tinytuya upstream ne contient plus ces définitions par device | `data/scanners/tinytuya-results.json` |
| 9 | Tuya-Local | ✅ OK (après fix boucle) | **995 devices YAML, 519 mfrs uniques, 511 nouveaux, 16193 DP mappings** | Nouveau | `data/scanners/tuya-local-results.json` |
| 10 | Hubitat | ✅ OK (après fix env) | **85 drivers Groovy, 397 mfrs, 202 nouveaux FPs** | Nouveau | `data/scanners/hubitat-results.json` |
| 11 | SmartThings | ✅ OK (après fix) | **5 fichiers YAML, 118 mfrs / 79 modelIds, 73 nouveaux FPs** | Nouveau | `data/scanners/smartthings-results.json` |
| 12 | openHAB | ✅ OK (légitime) | 0 fichiers / 0 FPs (binding zigbee openHAB ne code pas de FPs Tuya en dur ; recherches GH retournent 2–6 hits) | Nouveau | `data/scanners/openhab-results.json` |
| 13 | Domoticz | ✅ OK (après fix bug) | **24 fichiers, 78 nouveaux FPs** | Nouveau | `data/scanners/domoticz-results.json` |
| 14 | Xiaomi MIoT | ✅ OK (légitime) | 432 zigbee models, 0 nouveaux FPs Tuya (mfrs `lumi.*`, pas `_TZ*`) | Nouveau | `data/scanners/xiaomi-miot-results.json` |
| 15 | CSA-IoT | ⚠️ OK technique, 0 entrées | 0 produits | Nouveau mais vide (endpoint `api.csa-iot.org` ne retourne rien d'exploitable) | `data/scanners/csa-iot-results.json` |

## Fixes appliqués pendant la collecte (minimaux)

1. **Auth GitHub des scanners** — tous les scanners lisent `GH_PAT || GITHUB_TOKEN`, mais l'environnement n'expose que `GH_TOKEN` (session `gh`). Relance avec `GITHUB_TOKEN=$GH_TOKEN` : hubitat et domoticz sont passés de 0 à des centaines de résultats.
   - *Recommandation permanente* : faire lire aussi `process.env.GH_TOKEN` dans les 8 scanners (une ligne chacun), ou exporter `GITHUB_TOKEN` dans `mega-crawler.js` / GHA.
2. **`scripts/scanners/domoticz-scanner.js:395`** — crash `Cannot read properties of undefined (reading 'length')` : les entrées issues du chemin « search GitHub » (push ligne ~365) n'ont pas de champ `localMatches`. Fix : `(d.localMatches?.length || 0)`. Relancé → 24 fichiers, 78 FPs.
3. **`scripts/scanners/smartthings-scanner.js:241`** — le qualifier `+path:fingerprint.yml` de la recherche code GitHub classique retourne systématiquement 0 (API dépréciée). Retiré ; le parseur YAML filtre déjà les blocs `fingerprint:`. Le repo « connu » `w35l3y/SmartThingsEdgeDrivers` est 404 (supprimé/renommé) — à remplacer.
4. **`scripts/scanners/tuya-local-scanner.js` (pagination ~l.258-274)** — **boucle infinie** : l'API GitHub `contents` ignore `per_page`/`page` pour les répertoires et renvoie le listing complet (995 fichiers) à chaque appel, donc la condition de sortie `items.length < 100` n'était jamais atteinte (observé : page 298+ avant kill). Fix : détection du listing répété (premier `name` identique à la page précédente) → sortie propre. Relancé → 995 devices en 9 s (le diff-cache avait déjà les blobs du run précédent).

## Caches invalidés puis régénérés

- `.cache/scanners/_cache-index.json` mis à jour pour blakadder, z2m, zha, hubitat, smartthings, domoticz, tinytuya, tuya-local, openhab, xiaomi-miot, csa-iot.
- Note : la première passe avait **sauvegardé des caches vides** (hubitat/smartthings/openhab/domoticz à 0 à cause du token manquant). Ils ont été invalidés (`scanner-cache.js --invalidate=<id>`) avant relance — attention en CI : un run non authentifié empoisonne le cache pour 12–48 h.

## Non lancés (par consigne)

- `tools/ci/apply-*.js`, `add-sacred-couples.js` (phase suivante).
- `tools/ci/blakadder-fetch.js` (variante étendue) — redondant avec `crawl-blakadder.js` pour cette phase.
- Cross-refs (`blakadder-cross-ref.js`, `cross-ref-gmail-fps.js`, …) — phase analyse.

## État mega-crawl

`.github/state/mega-crawl/state.json` date du 2026-07-16 — l'orchestrateur n'a pas été relancé globalement (les crawlers ont été pilotés un par un pour respecter les rate limits et diagnostiquer les échecs).
