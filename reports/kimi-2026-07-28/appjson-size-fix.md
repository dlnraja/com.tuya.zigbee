# app.json Size Fix — P23 (Test channel frozen, processing_failed)

Date : 2026-07-28 · Agent : kimi · Projet : `C:/Users/Dell/Documents/homey/master`

## Résumé

| | Avant | Après |
|---|---|---|
| `app.json` (fichier) | 6 496 766 o (6,20 MiB) | **3 462 185 o (3,30 MiB)** |
| `app.json` (contenu compacté) | 3,51 MiB | 3,28 MiB |
| Mfrs synthétiques (warning M09) | 255 | 234 (tous canoniques) |
| `_pidConflictNotes` (métadonnées dev) | 245 drivers | 0 |
| Validateurs | — | **4/4 exit 0** |

Cible atteinte : **< 4 MB, sous la visée de 3,5 MB.**

## 1. Décomposition du poids (avant)

Constat central : **43,4 % du fichier (2,69 MiB) = indentation/espaces**. Le contenu
JSON compacté ne faisait que 3,51 MiB — déjà sous la limite Athom de 4 MB, mais le
fichier sur disque (et dans git) restait à 6,20 MiB.

Champs racine (octets compacts) :

- `drivers` : 1 786 KB — dont `settings` 870 KB, `zigbee` 249 KB, **`_pidConflictNotes` 226 KB**, `capabilitiesOptions` 76 KB
- `flow` : 1 784 KB
- `capabilities` : 17 KB — tout le reste < 1 KB

Identifiants Zigbee :

- `manufacturerName` : 5 439 entrées (5 353 uniques), 103 KB
- `productId` : 3 092 entrées, 34 KB
- Synthétiques (regex validateur) : 255 entrées, ~12,6 KB
- Doublons de casse (même mfr en upper/lower dans un driver) : 1 095 entrées excédentaires, ~20,7 KB

Top drivers : `climate_sensor` 29,4 KB, `switch_1gang` 24,5 KB, `button_wireless_2` 16,0 KB.

Script d'analyse : `tmp/analyze-appjson-size.js`.

## 2. Les « 255 mfrs synthétiques » — vérification contre la base canonique

Source du message : `scripts/validate/homey-mandatory-check.js` (warning **M09**, non bloquant).
Regex : `unknown|dummy|placeholder|needs_device_assignment|^_generic_|^_GENERIC_|^_hybrid_|^_HYBRID_|^_master_|^_MASTER_`.

Cross-ref avec `data/mfs_db.json` (base canonique) + `scripts/sync/data/{blakadder,deconz,z2m,zha}.json` :

- **234 / 255 présents dans mfs_db.json → CONSERVÉS** (règle absolue : jamais retirer un mfr canonique).
  Ce sont les paires dual-case `_hybrid_*`/`_HYBRID_*`, `_generic_*`/`_GENERIC_*` (pattern P82).
- **21 / 255 observés nulle part → RETIRÉS** : `_master_*_needs_device_assignment` (×12, dual-case),
  `_TZE200_placeholder_*` (×7), `_hybrid_lcdtemphumidsensor_3_*` (×2).
- Doublons de casse : **0 retiré** — dans chaque groupe de variantes, soit les deux formes sont
  dans mfs_db, soit aucune n'a de forme observée de référence. La base canonique impose de tout garder.

Les 14 drivers touchés sont tous des **templates génériques sans fingerprints** → exempts de la règle
M09 (vérifié avant application). Ceux qui se retrouvent avec `manufacturerName: []` restent valides :
`prepare-publish.js` supprime déjà les tableaux vides dans la copie de publication.

## 3. Comment le projet gérait déjà ça — et pourquoi ça ne suffisait pas

Chaîne de publication existante (`.github/actions/homey-app-publish/action.yml`,
`auto-fix-and-publish.yml`) : `homey app build` → `sanitize-manifest.cjs app.json .homeybuild/app.json`
→ `prepare-publish.js` (compacte les espaces + `compact-zigbee-identifiers.cjs` prune les synthétiques
et plafonne les combos à 350/driver, 20 000 total) → gate 4 MB sur la copie temporaire → publish.

**Faille n°1** : tout ce pruning ne s'applique qu'à la **copie de publication**. La source
(`app.json` tracké + `drivers/*/driver.compose.json`) gardait les 255 synthétiques, les
`_pidConflictNotes` (226 KB) et — surtout — le pretty-print.

**Faille n°2 (corrigée)** : `scripts/maintenance/sanitize-manifest.cjs` réécrivait les manifestes avec
`JSON.stringify(manifest, null, 2)` à **chaque run CI** → ré-inflation permanente de `app.json` et
`.homeybuild/app.json` à 6,2 MB même après toute compaction manuelle. Le gate 4 MB de
`prepare-publish` protégeait l'upload, mais le manifeste de build servi à Athom restait obèse selon
le chemin emprunté, et le fichier tracké ne repassait jamais sous 4 MB.

Correctif appliqué au script existant (pas de nouveau script) : écriture **compacte**
(`JSON.stringify(manifest) + '\n'`) avec commentaire explicatif. `app.json` porte déjà
`_comment: "This file is generated…"` — le pretty-print n'avait aucune valeur, toute la chaîne
outillée parse le JSON.

## 4. Réductions appliquées

Script : `tmp/prune-appjson-bloat.js` (dry-run validé avant `--apply`).

| Action | Fichiers | Gain |
|---|---|---|
| 21 mfrs synthétiques jamais observés retirés | `app.json` + 14 `driver.compose.json` | ~2 KB |
| `_pidConflictNotes` supprimé (métadonnée dev, doublon du rapport structuré `.github/state` déjà écrit par `fix-pid-conflicts-p2.js` ; aucun consommateur runtime — vérifié par grep sur `lib/`, `drivers/`, `scripts/`, `test/`) | `app.json` + 245 `driver.compose.json` | ~226 KB compact |
| Écriture compacte de `app.json` | `app.json` | ~2,7 MB |
| `sanitize-manifest.cjs` écrit compact (durabilité CI) | `scripts/maintenance/sanitize-manifest.cjs` | empêche la ré-inflation |

Non appliqué (proposé, non sûr sans décision) :

- **151 mfrs non-synthétiques jamais observés** dans mfs_db/sources (~5 KB) : retirer des mfrs réels
  possibles = risque de perte de compatibilité appairage. Hors scope de la consigne.
- `flow` (1,78 MB) et `settings` (870 KB) : fonctionnels, intouchables sans refonte.
- `fix-pid-conflicts-p2.js --apply` réinjecterait les notes s'il est relancé manuellement
  (non câblé dans les workflows — vérifié). Même dans ce cas : 3,28 + 0,23 = 3,51 MiB compact, toujours < 4 MB.

## 5. Validation (tous exit 0)

- `node scripts/_validate_all.js` → **3/3 checks passed** (driver mesh : 431 drivers, 0 erreur)
- `node .github/scripts/fp-collision-check.js --baseline .github/fingerprint-collision-baseline.json` → **exit 0**
- `npx mocha test/critical/*.test.js` → **62 passing, 0 fail** (+ 12 tests node, 0 fail)
- `node scripts/validate/homey-mandatory-check.js` → **exit 0**, « App is SAFE to publish ».
  Warning M09 : 255 → **234** synthétiques restants = exactement ceux présents dans mfs_db (canoniques).
- `ls -la app.json` → **3 462 185 octets (3,30 MiB)** ✅

## 6. Notes pour le commit (parent)

Empreinte de cette intervention :

- `app.json` (pruné + compacté)
- 249 × `drivers/*/driver.compose.json` (245 notes retirées, 14 mfrs synthétiques retirés — 10 fichiers ont les deux)
- `scripts/maintenance/sanitize-manifest.cjs` (écriture compacte)
- Nouveaux : `tmp/analyze-appjson-size.js`, `tmp/prune-appjson-bloat.js`, ce rapport

Attention : le working tree contenait **déjà** ~1 285 fichiers modifiés avant intervention
(dont `app.json` lui-même) — le diff `drivers/` (971 fichiers) inclut des modifications
antérieures non liées. Trier au commit.

Risque de régression résiduel : ~10 scripts legacy (`scripts/fix-*.js`, `inject-*.js`…) réécrivent
`app.json` en `null, 2` s'ils sont exécutés manuellement ; la taille contenu reste ~3,3 MiB et le
pipeline de publication compacte de toute façon — l'upload Athom reste protégé.
