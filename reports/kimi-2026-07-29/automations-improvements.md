# Automations Improvements — 2026-07-29

Périmètre : `.github/workflows/`, `.github/scripts/`, `scripts/ci/`, `reports/`. Aucun commit/push.
Fichiers modifiés/créés :

- `.github/workflows/publish-self-heal.yml` (job self-heal Athom + permissions)
- `.github/scripts/athom-processing-failure-retry.js` (nouveau)
- `.github/workflows/auto-fix-and-publish.yml` (permissions + garde rebase)
- `.github/scripts/fp-collision-check.js` (faux positif baseline)
- `.github/workflows/nightly-audit.yml` (cron étalé)
- `.github/workflows/safe-sync-stable.yml` (cron étalé)

## 1. Self-heal publish (`processing_failed`)

### État avant

- `.github/workflows/publish-self-heal.yml` ne détectait que les **runs GHA coincés**
  (>90 min `in_progress`, via `scripts/ci/find-stuck-runs.py`) : annulation + re-trigger.
  Il **n'interrogeait pas l'API Athom** — un build `processing_failed` côté Athom
  (flakiness prouvée : contenus quasi identiques, 3 échecs / 1 succès) n'était jamais retenté ici.
- Bonus : les étapes existantes `gh run cancel` / `gh workflow run` tournaient avec
  `actions: read` → appels voués au 403.
- `.github/scripts/processing-failure-republish-check.js` (utilisé dans
  `auto-fix-and-publish.yml`) existe bien, mais il est **indirect** : il dépend d'un
  rapport dashboard (`.github/state/dashboard-monitor-report.json`, fraîcheur max 30 min)
  et refuse de retenter si la version du build échoué ≠ `app.json` (cas réel vu le
  2026-07-29 02:28 : build v9.0.353 échoué vs app.json v9.0.352 → « avoiding stale
  republish »). Insuffisant comme filet de sécurité.

### Action implémentée

Nouveau job `athom-heal` dans `publish-self-heal.yml` (cron existant toutes les 4h) +
nouveau script `.github/scripts/athom-processing-failure-retry.js` :

1. **(a) Sonde l'API Athom** — échange `HOMEY_PAT` → delegation token
   (`POST api.athom.com/delegation/token?audience=apps`) puis
   `GET apps-api.athom.com/api/v1/app/{id}/build?limit=20` (pattern de
   `scripts/check-build.js` + `tmp/probe2.js`). HTTPS stdlib uniquement → pas de `npm ci`.
2. **(b) Décision** — retry seulement si : dernier build en état terminal
   (`processing_failed|error|failed|revoked`) **ET** échec vieux de **>6h** (laisse les
   pipelines réguliers se rattraper d'abord) **ET** aucun build plus récent en état actif
   (`test/approved/...`) **ET** pas de retry dans les dernières 24h.
3. **Retry** = `gh workflow run "🚀 Publish Stable to Test" --ref stable-v5`.

**Garde-fous** : max 1 retry/24h via fichier marqueur
`.github/state/publish-self-heal-retry.txt` persisté par `actions/cache` (restore-keys
par préfixe) ; job entier en `continue-on-error: true`, étape de re-trigger aussi ;
log explicite dans le step summary (raison, build, version, âge) ; le script `exit 0`
dans tous les cas (HOMEY_PAT absent, API en panne, timestamp illisible → `retry=false`).
Permissions corrigées : `actions: write`.

Testé localement : sans `HOMEY_PAT` → `retry=false`, exit 0 ; `node --check` OK.

## 2. Santé des workflows (gh run list, 40 dernières failures)

### 🔍 Validate Homey App + 🛡️ Unified CI/CD Orchestrator — échecs en boucle quotidiens (corrigé)

4 échecs consécutifs de Validate (cron 12:00, 25→28/07) + Orchestrator (24/07, 25/07, 29/07 02:01).
Cause unique : étape **Fingerprint Collision Check** — `NEW COLLISION hobeian|TS0601 ->
soil_sensor, water_leak_sensor`. Faux positif : la baseline contient ce fingerprint avec
**3 drivers** (`sensor_contact_zigbee` inclus) ; le code actuel ne l'a plus que dans
**2 drivers** — une amélioration comptée comme « nouvelle » collision car l'ID de collision
inclut l'ensemble exact des drivers.

Correctif dans `.github/scripts/fp-collision-check.js` : `isCoveredByBaseline()` — une
collision courante est couverte si la baseline a la même clé avec un **sur-ensemble**
des drivers (exact ⊇ courant). Un ensemble qui grossit reste une nouvelle collision.
Tests : baseline réelle → shrunk `hobeian|TS0601` couvert ✓, exact couvert ✓,
ensemble agrandi NON couvert ✓, clé inconnue NON couverte ✓ ; run complet exit 0.

### 🤖 Auto-Fix + Publish Pipeline — échecs intermittents (corrigé x2)

- **Rebase conflict** (29/07 02:27, run 30416874668) : `git rebase origin/master` en
  conflit sur `app.json` (course avec un push concurrent) → exit 1. Correctif : rebase
  avec `-X ours`, et en cas d'échec `rebase --abort` + `reset --hard origin/$BRANCH`
  avec `::warning::` — les commits auto-fix sont idempotents et régénérés au run suivant.
- **Notify on failure 403** : le step `actions/github-script` poste un commentaire sur
  l'issue #420 sans `issues: write` → 403 « Resource not accessible by integration »,
  masquant l'erreur réelle. Correctif : `issues: write` ajouté aux permissions.

### Publish Stable / Auto-Publish on Push — échecs

Liés au `processing_failed` Athom (objet du self-heal ci-dessus) — pas de cause
config détectée dans cette passe.

### Documenté, non corrigé

- `scripts/ci/find-stuck-runs.py` : OK, utilisé par le job `heal` existant.
- Runs `cancelled` fréquents (Orchestrator, Auto-Publish, continuous-flow) : effet
  normal des concurrency groups `cancel-in-progress`, pas des échecs.

## 3. Étalement des crons — 30 workflows schedulés (21 attendus, le parc a grossi)

Les 3 mensuels restent étalés ✔ (`17 0 1 * *`, `43 0 1 * *`, `9 1 1 * *`).

**2 chevauchements exacts trouvés et corrigés** :

- `30 3 * * *` : nightly-audit + recurrent-orchestrator → nightly-audit passe à `45 3 * * *`
- `0 4 * * *` : activity-monitor + safe-sync-stable (+ publish-self-heal à 04:00) →
  safe-sync-stable passe à `25 4 * * *`

Chevauchement partiel accepté (hebdo vs quotidien, lundis seulement) :
`0 5 * * *` offline-crash-analyzer (quotidien) vs stale (lundi).

| Cron (UTC) | Workflow |
|---|---|
| `0 */4 * * *` | auto-enrich-closed-loop |
| `0 0,6,12,18 * * *` | gmail-diagnostics |
| `0 12 * * *` | validate |
| `0 2 * * *` | mega-crawl |
| `0 3 * * *` | continuous-flow |
| `0 3 * * 3` | code-quality (mer.) |
| `0 4 * * *` | activity-monitor |
| `0 4,8,12,16,20 * * *` | publish-self-heal |
| `0 5 * * *` | offline-crash-analyzer |
| `0 5 * * 1` | stale (lun.) |
| `0 6 * * *` | temporal-monitor |
| `0 7 * * *` | e2e-dashboard-test |
| `0 8 * * *` | gmail-token-keepalive |
| `0 9 * * *` | deploy-pages |
| `15 */6 * * *` | autonomous-verification |
| `15 10 * * 1` | collect-diagnostics (lun.) |
| `15 2,6,10,14,18,22 * * *` | forum-poll |
| `15 4 * * *` | blakadder-fetch |
| `17 0 1 * *` | ai-monthly-audit (mensuel) |
| `17 2 * * *` | build-error-diag |
| `25 */6 * * *` | fetch-diags |
| `25 4 * * *` | safe-sync-stable ✱ nouvel horaire |
| `30 1 * * *` | smart-update |
| `30 2 * * *` | knowledge-graph-sync |
| `30 3 * * *` | recurrent-orchestrator |
| `30 4 * * 5` | driver-maintenance (ven.) |
| `43 0 1 * *` | monthly-scan (mensuel) |
| `45 3 * * *` | nightly-audit ✱ nouvel horaire |
| `5 */6 * * *` | auto-fix-and-publish |
| `9 1 1 * *` | monthly-tuya-intelligence (mensuel) |

## 4. Validation

- js-yaml sur les 4 workflows modifiés : OK.
- `scripts/ci/validate-all-yaml.js` : 67 fichiers, 0 erreur.
- `.github/scripts/_validate-workflows.js` : 53 fichiers, 0 erreur (les 2 warnings
  setup-node/npm sur le nouveau job ont été corrigés en ajoutant `actions/setup-node` v5
  piné ; le script probe reste stdlib-only, sans npm ci volontairement).
- `node --check` sur les 2 scripts JS modifiés/créés : OK.

## Suivi possible

- `processing-failure-republish-check.js` pourrait consommer directement l'API Athom
  (comme le nouveau probe) au lieu du rapport dashboard — non fait (hors minimal).
- Le refus « version mismatch → no republish » mérite une passe : en cas de
  `processing_failed` sur vN+1 avec app.json à vN, un bump + republish serait légitime.
