# Contributing — Développement

Guide du workflow de développement des deux branches de l'app
`com.dlnraja.tuya.zigbee`.

## Les deux branches

| Branche | Canal | Rôle | Versions |
|---|---|---|---|
| `master` | Test (`/test/`) | Développement actif, nouveaux drivers, nouvelles features | `9.x.y` |
| `stable-v5` | Production | LTS — backports de stabilité **uniquement**, pas de nouveaux drivers | `5.12.y` |

Règles d'or :
- **Jamais** de nouvelle feature dans `stable-v5` — seulement des backports de fixes
  vérifiés dans master.
- Versions **semver strictes** : `9.x.y` pour master, `5.12.y` pour stable.
  Pas de suffixe pre-release (`-stable`, `-beta`…) — rejeté par
  `homey app validate --level publish`.
- `app.json` est **généré** (`.homeycompose/` + `drivers/*/driver.compose.json`) :
  ne jamais l'éditer à la main, toujours régénérer (`npx homey app validate`).

## Avant chaque commit

Les hooks sont installés par défaut (`git config core.hooksPath .githooks`) :
9 vérifications bloquantes (fichiers obligatoires, JSON, versions, secrets,
taille du payload publish…). Ne pas contourner avec `--no-verify`.

```bash
npm test                 # suite complète (doit être verte)
npx homey app validate   # validate niveau publish
```

## Ajouter une empreinte (fingerprint)

1. Identifier le device (interview Zigbee : manufacturerName + modelId + clusters).
2. Trouver le bon driver via `scripts/_registry.json`, `data/mfs_db.json` et Z2M/blakadder.
3. Ajouter le mfr (majuscule **et** minuscule) dans `drivers/<id>/driver.compose.json`.
4. Ajouter l'entrée dans `data/mfs_db.json` (driverId + source).
5. Régénérer (`npx homey app validate`), tester (`npm test` — le garde anti-purge
   et le test de cohérence driver↔mfs_db doivent passer).

## Règles de routage (« Sacred Couple »)

- Un même `manufacturerName` peut être revendiqué par plusieurs drivers **uniquement**
  si les `productId` diffèrent (désambiguïsation mfr+PID).
- `data/mfs_db.json` est la vérité curée par appareil ; les claims des drivers sont
  volontairement larges.
- Le gate CI (`tools/ci/pr-gate.js`) bloque tout conflit hors baseline.

## Outils utiles

| Besoin | Outil |
|---|---|
| Trouver un script | `scripts/_registry.json` |
| Vérifier les locales | `node tools/ci/locale-completeness.js` |
| Réparer du mojibake | `node tools/ci/fix-mojibake.js` |
| Requêter le knowledge graph | `node tools/ci/kg-query.js stats` |
| Gate PR en local | `node tools/ci/pr-gate.js` |
| Rangement du dépôt | `node .github/scripts/repo-housekeeping.js` (dry-run) |

## CI/CD

- `auto-fix-all` (03:00 UTC) : auto-fixes + bumps de version `[skip ci]`.
- `safe-sync-stable` (04:25 UTC) : sync sécurisée master → stable-v5.
- `housekeeping` (lundi 03:41 UTC) : rangement du dépôt + registre des scripts.
- `community-inbox` (05:17 UTC) : digest issues/PRs/forum.
- `pr-gate` : sur chaque PR (versions + Sacred Couple + tests de routage).

Voir `reports/kimi-2026-07-29/workflows-genealogy.md` pour l'historique complet.
