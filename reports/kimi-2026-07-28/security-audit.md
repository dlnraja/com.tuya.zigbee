# Audit de sécurité — com.tuya.zigbee

**Date** : 2026-07-28 · **Périmètre** : `.github/workflows/` (53 fichiers), secrets dans le code, outils CI, revue ciblée `lib/` `app.js` `api.js` · **Agent** : kimi (lecture seule GitHub, aucun commit)

---

## Résumé exécutif

| Sévérité | Trouvailles | Corrigées |
|----------|-------------|-----------|
| Critique | 0 | — |
| Élevé | 2 | 2 |
| Moyen | 3 | 1 |
| Info | 7 | — |

Aucun secret commité, aucun `pull_request_target` dangereux, aucune exfiltration de secret par URL détectée. Les deux findings élevés (permissions implicites larges, injection par nom de branche) sont **corrigés dans cette session**.

---

## Findings

### ÉLEVÉ

#### E1 — 6 workflows sans bloc `permissions:` → token aux permissions par défaut (CORRIGÉ)

Sans bloc explicite, `GITHUB_TOKEN` hérite des permissions par défaut du repo (historiquement permissives read/write). Fichiers corrigés avec le minimum déduit de leurs actions réelles :

| Workflow | Permissions appliquées | Justification |
|----------|------------------------|---------------|
| `activity-monitor.yml` | `contents: write`, `issues: read`, `pull-requests: read`, `actions: read` | `git push` du snapshot (l.79-80) ; `fetch-all-activity.js` GET `/issues`, `/pulls`, `/actions/runs` |
| `temporal-monitor.yml` | `contents: write`, `issues: read` | `git push` (l.48-49) ; `temporal-monitor.js` GET `/issues` |
| `autonomous-verification.yml` | `contents: read` | tests locaux uniquement |
| `offline-crash-analyzer.yml` | `contents: read`, `models: read` | upload-artifact ; `smart-auto-fix.js --ai` appelle `models.inference.ai.azure.com` avec le token |
| `recurrent-orchestrator.yml` | `contents: read`, `issues: read`, `pull-requests: read`, `actions: read` | pipeline orchestrant fetch-all-activity/temporal-monitor/session-start |
| `upstream-guard.yml` | `contents: read` | reusable workflow en lecture seule |

`continuous-flow.yml`, `delete-johan-comments.yml`, `e2e-dashboard-test.yml` n'ont pas de bloc top-level mais **tous leurs jobs ont un bloc `permissions:` au niveau job** — couverts. `homey-app-cicd.yml.manual` est inactif (non chargé par GitHub).

#### E2 — Injection shell via nom de branche de fork dans `code-quality.yml` (CORRIGÉ)

`code-quality.yml:140` (avant correction) :

```yaml
echo "**Trigger**: ${{ github.event_name }} ${{ github.event.pull_request.head.ref || github.ref_name }}"
```

Le workflow se déclenche sur `pull_request` (forks inclus). Un nom de branche git peut contenir `$()` et backticks → exécution de commande arbitraire dans le runner au moment de l'expansion shell. Corrigé par passage en `env:` (pattern standard) :

```yaml
env:
  PR_HEAD_REF: ${{ github.event.pull_request.head.ref || github.ref_name }}
run: |
  echo "**Trigger**: ${{ github.event_name }} $PR_HEAD_REF"
```

Impact résiduel avant correction limité (token rétrogradé read-only et secrets masqués pour les PR de fork), mais le pattern restait une RCE dans le runner.

### MOYEN

#### M1 — Exécution de code de fork dans `smart-pr-merge.yml` (recommandation)

`smart-pr-merge.yml:60-69,106` : sur `pull_request` (forks inclus), le job checkout le merge commit (contient le code de la PR), lance `npm ci` (lifecycle scripts du `package.json` de la PR) puis exécute `.github/scripts/smart-pr-merge.js` **qui peut être modifié dans la PR elle-même**. Atténuations natives GitHub : secrets non transmis aux forks, `GITHUB_TOKEN` rétrogradé en lecture. Risque résiduel : abus de runner, et escalade si le déclencheur était un jour changé en `pull_request_target`.
**Recommandation** : restreindre le job aux PR same-repo (`if: github.event.pull_request.head.repo.full_name == github.repository`) pour la partie qui exécute du code, ou utiliser `npm ci --ignore-scripts`.

#### M2 — Actions tierces sur tags mutables (recommandation, non corrigé volontairement)

Contrairement à ce qu'affirme `WORKFLOW_GUIDELINES.md` (« All action refs pinned to SHA hashes »), l'inventaire réel :

- **Tierces non épinglées** : `peter-evans/create-pull-request@v6` (bug-report-auto-pr.yml), `marocchino/sticky-pull-request-comment@v2` (continuous-flow.yml)
- **Officielles sur tags mutables** : `actions/checkout@v5` ×55, `actions/setup-node@v5` ×46, `actions/upload-artifact@v5` ×22, `actions/cache@v5` ×2, `actions/github-script@v7` ×2
- **Déjà épinglées SHA** : `actions/labeler`, `actions/stale`, `actions/deploy-pages`, `actions/upload-pages-artifact`, `dependabot/fetch-metadata`, `softprops/action-gh-release`, `athombv/github-action-homey-app-{validate,publish}`, `actions/github-script` ×4, et 4 occurrences checkout/setup-node

**Recommandation** : épingler en SHA d'abord les deux actions tierces (surface supply-chain la plus exposée), puis les officielles par vague avec CI. Non appliqué ici (mission 5c — validation impossible sans CI).

#### M3 — `workflow_run.head_branch` dans un bloc `run:` de `e2e-dashboard-test.yml` (CORRIGÉ)

`e2e-dashboard-test.yml:176` interpolait `${{ github.event.workflow_run.head_branch }}` dans un `echo`. Le déclencheur `workflow_run` ne porte que sur `continuous-flow` (schedule/push, branches du repo), donc risque faible, mais le pattern était identique à E2. Corrigé via `env: TRIGGER_REF`.

### INFO

- **I1 — `labeler.yml` (`pull_request_target`) : pattern sûr.** Pas de checkout de code fork, `permissions: contents: read + pull-requests: write` minimales, `actions/labeler` épinglé SHA. Aucun secret exposé.
- **I2 — Appels réseau sortants au runtime Homey** (l'app se dit « local-first ») : `lib/ota/OTAUpdateManager.js` (chargé par `app.js:81,264-268`) télécharge l'index OTA depuis `raw.githubusercontent.com` toutes les 6 h — feature OTA documentée, lecture seule ; `drivers/wifi_camera/device.js` → `lib/tuya-camera` → `openapi.tuyaeu.com` etc. — inhérent aux devices WiFi Tuya (credentials fournis par l'utilisateur). Les libs AI/scraping (`LocalFirstEngine`, `AutonomousEnricher`, `smart-fetch`, `IntelligenceHealth`) **ne sont pas chargées** par `app.js`/`api.js` — usage CI uniquement. `EweLinkLANClient` = LAN uniquement.
- **I3 — `execSync` dans `lib/temporal/`** (EvolutionTracker, ProjectTimeline, RegressionDetector) : commandes `git log` construites à partir d'un paramètre `days` numérique interne (coercition via `Date`), aucun input utilisateur ; libs non chargées par `app.js`. Pas d'`eval(` ni `new Function` dans le code applicatif.
- **I4 — Dumps forum dans `.github/state/`** contiennent des `token` UUID de devices Homey extraits de posts utilisateurs (ex. `.github/state/forum/full-140352.json:12427`). Fichiers **non trackés** et couverts par `.gitignore` (`.github/state/**`). Données utilisateur à purger périodiquement par hygiène.
- **I5 — Convention des guidelines à revoir** : `WORKFLOW_GUIDELINES.md` §B recommande `permissions: contents: write + issues: write + pull-requests: write` pour **tous** les workflows — contraire au moindre privilège. Recommandation : remplacer par « `contents: read` par défaut, write au besoin ».
- **I6 — Secrets dans les logs/URLs** : aucun `curl` avec secret dans l'URL ; `ai-monthly-audit.yml:387` passe `ANTHROPIC_API_KEY` en header (correct). Aucun `echo` de secret détecté dans les workflows.
- **I7 — `dependabot-auto-merge.yml`** : checkout du head SHA de PR mais gardé par `if: github.actor == 'dependabot[bot]'` — acceptable.

---

## Secrets dans le code (mission 2)

- Patterns `ghp_`, `gho_`, `github_pat_`, `sk-`, `AIza`, `xox`, `-----BEGIN`, `password=/api_key=` sur fichiers trackés : **0 correspondance** (grep + `git grep`).
- `git ls-files .github/state/ tmp/` → **0 fichier tracké** ; le working tree actuel est propre (purge du 27/07 effective).
- `.gitignore` couvre : `*.env*`, `credentials.json`, `token.json`, `client_secret*.json`, `*.key/pem/p12/pfx/keystore`, `.netrc`, `tmp/`, `.github/state/**`, screenshots, dumps HTML. Seuls fichiers trackés contenant le mot « token/secret » : docs et scripts d'audit (légitimes).

## Outils CI existants (mission 3)

| Outil | Mode | Résultat |
|-------|------|----------|
| `scripts/ci/privacy-guard.js` | read-only (sans `--fix`) | ✅ « No sensitive/operational files tracked » |
| `tools/ci/audit-gh-writes.js` | read-only | 12 fichiers write-capable ; 3 flags « Johan » **vérifiés = faux positifs** (`monthly-community-sync.yml` crée des issues sur `context.repo` propre, `upstream-guard.yml` = commentaires doc, `check-writes.js` = auditeur) |
| `.github/scripts/check-github-shadow-policy.js` | read-only | ✅ « Shadow policy OK: 6 scripts and 53 workflows checked » (re-exécuté après corrections : toujours OK) |

Note : `privacy-guard.js` était référencé dans la mission sous `tools/ci/` — il vit en réalité dans `scripts/ci/`.

---

## Corrections appliquées (8 fichiers, `.github/workflows/` uniquement)

1. `activity-monitor.yml` — bloc `permissions:` ajouté
2. `temporal-monitor.yml` — bloc `permissions:` ajouté
3. `autonomous-verification.yml` — `permissions: contents: read`
4. `offline-crash-analyzer.yml` — `permissions: contents: read + models: read`
5. `recurrent-orchestrator.yml` — bloc `permissions:` ajouté
6. `upstream-guard.yml` — `permissions: contents: read`
7. `code-quality.yml` — injection E2 corrigée via `env: PR_HEAD_REF`
8. `e2e-dashboard-test.yml` — injection M3 corrigée via `env: TRIGGER_REF`

**Validation** : syntaxe YAML vérifiée par `js-yaml` sur les 8 fichiers (tous OK, permissions relues conformes) ; `check-github-shadow-policy.js` et `privacy-guard.js` re-passés sans erreur. Aucune logique de workflow refactorisée au-delà des blocs `permissions` et des deux passages en `env:`.

## Recommandations restantes

1. **Épingler en SHA** `peter-evans/create-pull-request@v6` et `marocchino/sticky-pull-request-comment@v2` (M2), puis les `actions/*@v5` par vague validée CI.
2. **Restreindre `smart-pr-merge.yml`** aux PR same-repo ou `npm ci --ignore-scripts` (M1).
3. Mettre à jour `WORKFLOW_GUIDELINES.md` §B (permissions write-for-all → read par défaut) et sa section « Supply-Chain Security » qui affirme à tort un pinning SHA complet (I5).
4. Purge périodique des dumps `.github/state/forum/` (tokens devices utilisateurs, I4).
5. Documenter dans la description app (Homey App Store) l'appel sortant OTA 6 h vers GitHub raw (I2) pour cohérence avec le positionnement « local-first ».

---

## Follow-ups applied (2026-07-28)

Recommandations 1–3 appliquées (`.github/` uniquement, aucun commit) :

1. **M2 — Pinning SHA des actions tierces** (résolution via `git ls-remote`) :
   - `peter-evans/create-pull-request@v6` → `@c5a7806660adbe173f04e3e038b0ccdcd758773c # v6.1.0` dans `ai-monthly-audit.yml` (le tag `v6` pointait déjà sur v6.1.0 — même commit, désormais immuable).
   - `marocchino/sticky-pull-request-comment@v2` → `@773744901bac0e8cbb5a0dc842800d45e9b2b405 # v2.9.4` dans `continuous-flow.yml`.
   - Les `actions/*@v5` officielles restent en tag majeur (règle documentée, vague SHA ultérieure avec validation CI).
2. **M1 — `smart-pr-merge.yml`** : option « same-repo » retenue (moins cassante que `--ignore-scripts`, qui laisserait le checkout de fork exécuter un `smart-pr-merge.js` potentiellement modifié par la PR). Le job `smart-merge` est désormais conditionné à `github.event.pull_request.head.repo.full_name == github.repository` pour les événements `pull_request` et `pull_request_review` ; `workflow_dispatch` inchangé. Conséquence assumée : plus d'auto-merge IA sur les PR de forks (revue manuelle requise — comportement souhaité).
3. **I5 — `WORKFLOW_GUIDELINES.md`** : §B « Always include » remplacée (×2, section dupliquée dans le fichier) par la règle de moindre privilège (`contents: read` par défaut, write au besoin) ; section « Supply-Chain Security » (×2) corrigée — l'affirmation « All action refs pinned to SHA » était fausse, remplacée par la règle réelle : tierces en SHA, officielles en tag majeur.

**Validation** : syntaxe YAML vérifiée par `js-yaml` sur les 3 workflows modifiés (`ai-monthly-audit.yml`, `continuous-flow.yml`, `smart-pr-merge.yml`) — tous OK.
