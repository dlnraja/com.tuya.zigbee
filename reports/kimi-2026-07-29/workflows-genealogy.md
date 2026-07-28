# Généalogie des workflows GitHub Actions — 2026-07-29

Projet : `com.tuya.zigbee` (checkout local `master`, historique purgé le 2026-07-10 — voir `HISTORY_PURGE.md`).
Périmètre : `.github/` + `reports/`. **Aucun commit/push.** Complète `reports/kimi-2026-07-28/workflows-audit.md`.

## Synthèse

| Indicateur | Valeur |
|---|---|
| Noms de workflows distincts ayant existé | **200** (274 chemins de fichiers, suffixes `.disabled`/`.DISABLED`/`.manual` inclus) |
| Actifs aujourd'hui | 53 `.yml` (+ 1 archivé `homey-app-cicd.yml.manual`) |
| Disparus (supprimés ou désactivés puis purgés) | 147 |
| Variantes n'ayant existé que sur des branches locales | 7 |
| Fonctions perdues identifiées | 3 (dont 1 réintroduite) |
| Enrichissements appliqués | 3 crons mensuels étalés, 34 en-têtes ajoutés, 1 étape réintroduite |
| YAML après modification | 54/54 valides (js-yaml), blocs `permissions:` 53/53 |

## Méthode et sources

- Historique local purgé (démarre 2026-07-10) → utilisation d'`origin/master` (**8 659 commits**, fetch déjà fait) : `git log origin/master --reverse --name-status --diff-filter=ADMR -- .github/workflows/` reconstitue chaque ajout, suppression et renommage (notamment les vagues de renommage `.yml` → `.yml.disabled`).
- Branches locales inspectées via `git ls-tree <branche> -- .github/workflows/` : `auto/driver-maintenance`, `auto/johan-sdk3-sync`, `auto/weekly-fingerprint-sync`, `codex-diag-timeouts`, `feature/wifi-local-first`, `gh-pages`, `masterwlan`, `stable-v5`.
- Raisons de suppression : messages de commit des vagues de purge (table ci-dessous), `HISTORY_PURGE.md`, P-numbers dans les en-têtes des workflows actifs (P9, P11, P29–P37, P52–P53, P69, P73), `reports/kimi-2026-07-28/workflows-audit.md`.
- Pour chaque disparu : contenu à son dernier commit (`git show <sha>^:<path>`) — nom, triggers, crons — comparé aux 54 actifs.

## Grandes vagues de vie/mort

| Période | Événement (message de commit) | Volume |
|---|---|---|
| 2025-10-24 | Création du dépôt propre (`.homeycompose`) — ~30 workflows d'emblée, beaucoup déjà `.disabled` | ~30 créés |
| 2025-11-04 | « Clean GitHub workflows — official Homey methods » : 1re vague de `.disabled` | ~25 désactivés |
| 2025-11-10 | « MASTER SYSTEM » puis « cleanup and organize workflows & docs » | +5 MASTER-*, 16 supprimés |
| 2025-12-03 | v5.3.24 « Official Athom Workflows » — mort des MASTER-*/PUBLISH-* maison | 11 supprimés |
| 2025-12-27/29 | Consolidation + « DISABLE AUTO WORKFLOWS » (auto-scans jugés non fiables) | ~10 désactivés |
| 2026-01-10/19 | « keep only publish.yml as main », résolution 12 issues | 6 supprimés |
| **2026-02-22** | **v5.11.19 — grande purge : 68 fichiers `.disabled` supprimés d'un coup** | 68 supprimés |
| 2026-03-28 | « npx validate as primary » — purge des docs internes à `workflows/` (README, guides) | 8 `.md` supprimés |
| 2026-04-05 | « restore disabled workflows instead of deleting them » — plusieurs réactivés sous `.disabled` puis réintroduits | renommages |
| 2026-04-28 | v7.4.11 « Doctrine of Silence, Weekly Pulses & AI Budgets » — mort des auto-répondeurs forum/issues | 10 supprimés |
| 2026-05-13 | « clean disabled workflows » + « agentic skills / secure diagnostics » | 32 supprimés (dont `reveal-secrets`, sécurité) |
| **2026-06-18** | **TITAN V5 GOD-MODE — suppression des orchestrateurs « galaxie »** (`daily-everything`, `master-cicd`, `unified-*`, gates, `sync-changelog-readme`, `monthly-irdb-sync`…) | 24 supprimés |
| **2026-07-12** | **P11 « carte blanche » — consolidation** : les 12 restants de l'ère TITAN (`sunday-master`, `daily-maintenance`, `weekly-fingerprint-sync`, `johan-sdk3-sync`, `bilat-fp-sync`, `enrich-drivers`, `nightly-auto-process`, `daily-promote-to-test`, `test-api-keys`, `upstream-auto-triage`, `weekly-external-sync`, `weekly-verification`) remplacés par `continuous-flow.yml` + spécialisés | 12 supprimés |

Les branches locales `auto/*` et `codex-diag-timeouts` contiennent encore l'ensemble pré-P11 (12 workflows supprimés de master) ; `masterwlan` / `feature/wifi-local-first` contiennent l'ensemble pré-TITAN (39 fichiers) dont **7 variantes jamais présentes sur origin/master** : `archive-integrity-gate`, `image-integrity-gate`, `security-integrity`, `daily-fingerprint-lazyload-sync`, `enrichment-catchup`, `force-publish-safe`, `trellis-autonomous-orchestration`. Aucune n'apporte de fonction absente des actifs (gates d'intégrité couverts par `unified-ci.yml`/`shadow-policy-check.yml`, publish forcé couvert par `publish.yml`).

## Diff fonctions perdues vs les 54 actifs

Familles de disparus et couverture actuelle :

| Famille (exemples) | Successeur(s) actif(s) | Fonction perdue ? |
|---|---|---|
| Publish maison (~25 variantes : `MASTER-publish*`, `PUBLISH-*`, `homey-*publish*`, `publish-official*`, `force-publish*`, `publish-ultimate`, `publish-with-db`, `validate-and-publish`, `smart-version-increment`, `version-bump`, `pre-publish-version-check`, `manual-publish*`, `auto-publish(-homey/-improved)`) | `publish.yml`, `auto-publish-on-push.yml`, `publish-stable.yml`, `draft-to-test.yml`, `auto-fix-and-publish.yml` | Non — tag auto couvert par `publish.yml` |
| CI / validation (`build`, `ci*`, `pr-validation`, `homey-validate*`, `syntax-*`, `validate-drivers`, `comprehensive-auto-validation`, `dual-layer-integrity-gate`, `mandatory-files-gate`, `check-invalid-paths`, `fingerprint-validation`, `master-cicd`) | `unified-ci.yml`, `syntax-check.yml`, `validate.yml`, `code-quality.yml` | **`check-onNodeInit`** — script supprimé du dépôt, non réintroductible proprement |
| Enrichissement / sync FP (`daily-everything`, `nightly-auto-process`, `sunday-master`, `daily-maintenance`, `weekly-*`, `johan-sdk3-sync`, `sync-johan`, `bilat-fp-sync`, `enrich-drivers`, `unified-intelligence`, `unified-maintenance`, `fleet-intelligence`, `tuya-automation-hub`, `auto-discovery`, `AUTO-discover-new-devices`, `MASTER-intelligent-enrichment`) | `continuous-flow.yml` (en-tête liste les remplacés), `blakadder-fetch.yml` (P53, cross-ref Johan/Gmail), `mega-crawl.yml`, `monthly-*` actifs, `recurrent-orchestrator.yml`, `nightly-audit.yml`, `smart-update.yml` | **`sync-changelog-readme`** (script intact, orphelin) → **réintroduit** ; `monthly-irdb-sync` (script supprimé) ; `monthly-api-discovery` (couvert par mega-crawl/monthly-scan) |
| Docs / matrice (`update-docs`, `auto-update-docs`, `organize-docs`, `matrix-export`, `update-device-matrix`, `sync-changelog-readme`) | `deploy-pages.yml` (Device Finder), `monthly-enrichment.yml` | changelog→README : **perdue puis réintroduite** (voir § enrichissements) |
| Communauté / forum / issues (`auto-respond`, `bot-auto-response`, `intelligent-auto-respond`, `forum-auto-responder`, `forum-monitor`, `forum-merge-posts`, `forum-cleanup-flagged`, `unified-community`, `multi-ai-auto-handler`, `ai-multi-agent-system`, `ai-enhanced-automation`, `github-auto-manage`, `issue-crossref`, `auto-issue-pr-forum-handler`, `scheduled-issues-scan`, `update-forum-post-1`, `fix-post-1558`, `fix-post-now`, `force-forum-release`, `cleanup-wrong-threads`, `upstream-auto-triage`) | `auto-close-supported.yml`, `auto-reopen-on-comment.yml`, `bug-report-auto-pr.yml`, `forum-poll.yml`, `notifications.yml`, `stale.yml`, `delete-own-upstream-comments.yml`, `delete-johan-comments.yml` | **Assumées** (Doctrine of Silence v7.4.11, anti-spam) : répondeurs auto, édition auto du post forum n°1. Scan quotidien d'issues couvert par `continuous-flow` |
| Diagnostics (`diagnostic`, `secure-diagnostics`, `diagnostic-anonymizer`, `gmail-diagnostics-anonymize`, `fetch-target-diag`) | `gmail-diagnostics.yml`, `fetch-diags.yml`, `collect-diagnostics.yml`, `verified-publish-and-diagnostics.yml` (anonymisation intégrée) | Non |
| Divers | — | `metrics-collector` (analytics, abandonné) ; `test-api-keys` (mort avec `if: false` — déjà volontairement coupé ; la cascade API vit dans `scripts/automation/api-key-manager.js`, utilisée en bibliothèque) ; `reveal-secrets` (**dangereux**, supprimé le 2026-05-13, ne jamais réintroduire) ; `deploy-github-pages` → `deploy-pages.yml` ; `cleanup`/`auto-organize`/`root-cleanup-and-integrity` → couverts par conventions P9 |

**Bilan : 3 fonctions réellement perdues** —
1. `sync-changelog-readme` (sync `.homeychangelog.json` → README « Latest Updates ») — script `scripts/automation/sync-changelog-readme.js` intact mais orphelin → **réintroduite** (voir ci-dessous).
2. `monthly-irdb-sync` (sync base IR le 15 du mois) — script IRDB supprimé du dépôt → non réintroductible proprement, documentée ici.
3. `check-onNodeInit` (gate signatures SDK3) — script supprimé → non réintroductible ; `syntax-check.yml` couvre partiellement.

## Enrichissements appliqués (2026-07-29)

### 1. Crons mensuels étalés (recommandation n°3 de l'audit du 2026-07-28)

3 workflows partageaient `0 0 1 * *` (3 runs simultanés le 1er du mois) :

| Workflow | Avant | Après |
|---|---|---|
| `ai-monthly-audit.yml` | `0 0 1 * *` | `17 0 1 * *` (00:17 UTC) |
| `monthly-scan.yml` | `0 0 1 * *` | `43 0 1 * *` (00:43 UTC) |
| `monthly-tuya-intelligence.yml` | `0 0 1 * *` | `9 1 1 * *` (01:09 UTC) |

### 2. Réintroduction propre : sync changelog → README

Fonction du défunt `sync-changelog-readme.yml` (quotidien 12:30 + push, mort le 2026-06-18 dans la vague TITAN) réintroduite **sans nouveau fichier** dans `continuous-flow.yml` (quotidien 03:00, déjà consolidé) :

- en-tête mis à jour (`sync-changelog-readme.yml` ajouté à la liste « Replaces ») ;
- étape `Sync changelog to README` (`node scripts/automation/sync-changelog-readme.js`, `continue-on-error: true`) après `Detect multi-device mfrs` ;
- ligne `changelog-sync` ajoutée au tableau du step summary ;
- le commit retour passe par l'étape existante « Commit state (apply only) » — comportement DRY_RUN préservé ;
- script vérifié : `node --check` OK, sort proprement si `.homeychangelog.json` absent.

### 3. En-têtes de documentation (34 fichiers)

34 des 53 actifs commençaient directement par `name:` sans aucun commentaire. Ajout d'un en-tête 3 lignes (rôle via le `name:`, triggers/crons réels extraits du fichier, secrets requis) : `activity-monitor`, `ai-monthly-audit`, `auto-enrich-closed-loop`, `auto-fix-and-publish`, `auto-publish-on-push`, `autonomous-verification`, `bug-report-auto-pr`, `build-error-diag`, `delete-johan-comments`, `delete-own-upstream-comments`, `dependabot-auto-merge`, `deploy-pages`, `e2e-dashboard-test`, `fetch-diags`, `forum-poll`, `gmail-diagnostics`, `gmail-token-keepalive`, `knowledge-graph-sync`, `labeler`, `nightly-audit`, `notifications`, `offline-crash-analyzer`, `publish-diagnose`, `publish-self-heal`, `publish-stable`, `recurrent-orchestrator`, `safe-sync-stable`, `shadow-policy-check`, `smart-pr-merge`, `smart-update`, `stale`, `temporal-monitor`, `tuya-deep-diag`, `unified-ci`. Les 19 autres avaient déjà un en-tête. Aucune logique modifiée.

### 4. Vérifications

- `js-yaml` (node_modules) : **54/54 fichiers valides** après modification (53 `.yml` + `.manual`).
- Blocs `permissions:` présents dans les 53 actifs — audit sécurité du 2026-07-28 non régressé.
- `homey-app-cicd.yml.manual` : laissé archivé tel quel (redondant, cf. audit du 2026-07-28 — couvert par `unified-ci.yml` + `publish.yml` + `auto-publish-on-push.yml`).

## Table complète de généalogie (200 noms)

Naissance = premier commit ajoutant le fichier (toute forme, `.disabled` inclus) sur `origin/master`. Mort = dernier commit le retirant. Les actifs marqués « réintroduit après … » avaient été supprimés puis recréés. `homey-app-cicd.yml.manual` = archivé volontairement (présent, ignoré par GitHub).

| Workflow | Statut | Naissance | Mort |
|---|---|---|---|
| homey-app-cicd | ARCHIVÉ | 2025-10-24 | — |
| AUTO-discover-new-devices | DISPARU | 2025-12-02 | 2025-12-03 |
| MASTER-auto-fix-monitor | DISPARU | 2025-11-10 | 2025-12-03 |
| MASTER-cleanup-organize | DISPARU | 2025-11-10 | 2025-12-03 |
| MASTER-intelligent-enrichment | DISPARU | 2025-12-02 | 2025-12-03 |
| MASTER-publish-v2 | DISPARU | 2025-11-10 | 2025-12-03 |
| MASTER-publish | DISPARU | 2025-11-10 | 2025-12-03 |
| PUBLISH-OFFICIAL | DISPARU | 2025-11-27 | 2025-12-03 |
| PUBLISH-WORKING | DISPARU | 2025-11-10 | 2025-12-03 |
| activity-monitor | ACTIF | 2026-07-13 | — |
| ai-enhanced-automation | DISPARU | 2025-11-02 | 2026-02-22 |
| ai-monthly-audit | ACTIF | 2026-06-18 | — |
| ai-multi-agent-system | DISPARU | 2025-11-02 | 2026-02-22 |
| ai-weekly-enrichment | DISPARU | 2025-10-24 | 2026-02-22 |
| auto-close-supported | ACTIF | 2026-02-27 | réintroduit après 2026-05-13 |
| auto-discovery | DISPARU | 2026-04-03 | 2026-06-18 |
| auto-driver-generation | DISPARU | 2025-10-24 | 2026-02-22 |
| auto-driver-publish | DISPARU | 2025-10-24 | 2026-02-22 |
| auto-enrich-closed-loop | ACTIF | 2026-07-16 | — |
| auto-enrichment | DISPARU | 2025-11-02 | 2026-02-22 |
| auto-fix-and-publish | ACTIF | 2026-06-22 | — |
| auto-fix-images | DISPARU | 2025-10-24 | 2026-02-22 |
| auto-fix | DISPARU | 2025-11-05 | 2025-11-10 |
| auto-issue-pr-forum-handler | DISPARU | 2025-11-27 | 2025-12-01 |
| auto-monitor-devices | DISPARU | 2025-12-22 | 2026-02-22 |
| auto-organize | DISPARU | 2025-11-03 | 2025-11-10 |
| auto-pr-handler | DISPARU | 2025-11-02 | 2026-02-22 |
| auto-process-github-issues | DISPARU | 2025-10-24 | 2026-02-22 |
| auto-publish-complete | DISPARU | 2025-10-24 | 2026-02-22 |
| auto-publish-homey | DISPARU | 2025-11-03 | 2026-02-22 |
| auto-publish-improved | DISPARU | 2025-10-24 | 2026-02-22 |
| auto-publish-on-push | ACTIF | 2025-11-06 | réintroduit après 2026-02-22 |
| auto-publish | DISPARU | 2025-10-24 | 2026-02-22 |
| auto-reopen-on-comment | ACTIF | 2026-02-27 | réintroduit après 2026-05-13 |
| auto-respond-to-prs | DISPARU | 2025-10-24 | 2026-02-22 |
| auto-respond | DISPARU | 2026-01-18 | 2026-05-13 |
| auto-tag | DISPARU | 2025-11-08 | 2025-11-10 |
| auto-update-docs | DISPARU | 2025-12-13 | 2026-02-22 |
| autonomous-verification | ACTIF | 2026-07-14 | — |
| bi-monthly-auto-enrichment | DISPARU | 2025-10-24 | 2026-02-22 |
| bilat-fp-sync | DISPARU | 2026-06-21 | 2026-07-12 |
| bimonthly-drivers-sync | DISPARU | 2025-10-28 | 2026-02-22 |
| blakadder-fetch | ACTIF | 2026-07-14 | — |
| bot-auto-response | DISPARU | 2026-04-05 | 2026-05-13 |
| bug-report-auto-pr | ACTIF | 2026-02-23 | réintroduit après 2026-05-13 |
| build-and-validate | DISPARU | 2025-10-24 | 2026-02-22 |
| build-error-diag | ACTIF | 2026-06-23 | — |
| build | DISPARU | 2025-10-24 | 2026-02-22 |
| check-invalid-paths | DISPARU | 2026-04-20 | 2026-06-18 |
| check-onNodeInit | DISPARU | 2025-10-28 | 2026-02-22 |
| check-onnodeinit-ci | DISPARU | 2025-10-28 | 2026-02-22 |
| ci-cd-pipeline | DISPARU | 2025-10-24 | 2026-02-22 |
| ci-complete | DISPARU | 2025-10-24 | 2026-02-22 |
| ci-official | DISPARU | 2025-11-10 | 2025-11-10 |
| ci-validation | DISPARU | 2025-10-24 | 2026-02-22 |
| ci | DISPARU | 2025-11-09 | 2025-11-10 |
| cleanup-wrong-threads | DISPARU | 2026-02-27 | 2026-05-13 |
| cleanup | DISPARU | 2025-11-04 | 2025-11-10 |
| code-quality | ACTIF | 2026-01-29 | — |
| collect-diagnostics | ACTIF | 2026-03-02 | réintroduit après 2026-05-13 |
| complete-automation | DISPARU | 2025-10-24 | 2026-02-22 |
| complete-validation | DISPARU | 2025-10-24 | 2026-02-22 |
| comprehensive-auto-validation | DISPARU | 2026-05-10 | 2026-06-18 |
| continuous-flow | ACTIF | 2026-07-12 | — |
| daily-everything | DISPARU | 2026-02-23 | 2026-06-18 |
| daily-maintenance | DISPARU | 2026-04-16 | 2026-07-12 |
| daily-promote-to-test | DISPARU | 2026-02-24 | 2026-07-12 |
| delete-johan-comments | ACTIF | 2026-07-12 | — |
| delete-own-upstream-comments | ACTIF | 2026-07-12 | — |
| dependabot-auto-merge | ACTIF | 2026-02-23 | — |
| deploy-github-pages | DISPARU | 2025-10-30 | 2026-02-22 |
| deploy-pages | ACTIF | 2026-02-23 | — |
| diagnostic-anonymizer | DISPARU | 2026-04-27 | 2026-06-18 |
| diagnostic | DISPARU | 2025-10-24 | 2026-02-22 |
| draft-to-test | ACTIF | 2026-05-14 | — |
| driver-maintenance | ACTIF | 2026-03-12 | — |
| dual-layer-integrity-gate | DISPARU | 2026-05-28 | 2026-06-18 |
| e2e-dashboard-test | ACTIF | 2026-07-12 | — |
| enrich-drivers | DISPARU | 2026-05-01 | 2026-07-12 |
| fetch-diags | ACTIF | 2026-06-21 | — |
| fetch-target-diag | DISPARU | 2026-05-11 | 2026-05-13 |
| fingerprint-validation | DISPARU | 2025-12-06 | 2026-02-22 |
| fix-post-1558 | DISPARU | 2026-03-01 | 2026-03-01 |
| fix-post-now | DISPARU | 2026-03-01 | 2026-03-01 |
| fleet-intelligence | DISPARU | 2026-04-24 | 2026-06-18 |
| force-forum-release | DISPARU | 2026-04-16 | 2026-04-28 |
| force-publish-official | DISPARU | 2025-11-10 | 2025-11-10 |
| force-publish | DISPARU | 2025-11-10 | 2025-11-10 |
| forum-analysis-automation | DISPARU | 2025-12-22 | 2026-02-22 |
| forum-auto-responder | DISPARU | 2025-11-02 | 2026-05-13 |
| forum-cleanup-flagged | DISPARU | 2026-02-27 | 2026-05-13 |
| forum-merge-posts | DISPARU | 2026-02-28 | 2026-05-13 |
| forum-monitor | DISPARU | 2026-04-03 | 2026-05-13 |
| forum-poll | ACTIF | 2026-07-16 | — |
| github-auto-manage | DISPARU | 2026-02-23 | 2026-06-18 |
| gmail-diagnostics-anonymize | DISPARU | 2026-04-27 | 2026-04-28 |
| gmail-diagnostics | ACTIF | 2026-02-22 | réintroduit après 2026-05-13 |
| gmail-token-keepalive | ACTIF | 2026-02-22 | réintroduit après 2026-05-13 |
| homey-app-publish | DISPARU | 2025-11-04 | 2026-02-22 |
| homey-app-store | DISPARU | 2025-10-24 | 2026-02-22 |
| homey-ci-cd | DISPARU | 2025-12-03 | 2026-02-22 |
| homey-official-publish-api | DISPARU | 2025-10-30 | 2026-02-22 |
| homey-official-publish-improved | DISPARU | 2025-10-24 | 2026-02-22 |
| homey-official-publish | DISPARU | 2025-10-24 | 2026-02-22 |
| homey-publish-enhanced | DISPARU | 2025-10-24 | 2026-02-22 |
| homey-publish-simple | DISPARU | 2025-10-24 | 2026-02-22 |
| homey-publish | DISPARU | 2025-10-24 | 2026-02-22 |
| homey-validate-only | DISPARU | 2025-10-24 | 2026-02-22 |
| homey-validate | DISPARU | 2025-10-24 | 2026-02-22 |
| homey-version | DISPARU | 2025-12-03 | 2026-02-22 |
| image-diagnostic-fix | DISPARU | 2025-10-24 | 2026-02-22 |
| intelligent-auto-respond | DISPARU | 2026-03-30 | 2026-05-13 |
| intelligent-weekly-automation | DISPARU | 2025-12-22 | 2026-02-22 |
| issue-crossref | DISPARU | 2026-03-29 | 2026-06-18 |
| johan-sdk3-sync | DISPARU | 2026-03-12 | 2026-07-12 |
| knowledge-graph-sync | ACTIF | 2026-07-14 | — |
| labeler | ACTIF | 2026-02-25 | — |
| mandatory-files-gate | DISPARU | 2026-05-28 | 2026-06-18 |
| manual-publish-v5.0.3 | DISPARU | 2025-11-24 | 2025-12-03 |
| manual-publish | DISPARU | 2025-10-24 | 2026-02-22 |
| master-cicd | DISPARU | 2026-04-16 | 2026-06-18 |
| matrix-export | DISPARU | 2025-10-24 | 2026-02-22 |
| mega-crawl | ACTIF | 2026-07-14 | — |
| metrics-collector | DISPARU | 2025-11-02 | 2026-02-22 |
| monthly-api-discovery | DISPARU | 2026-02-21 | 2026-06-18 |
| monthly-auto-enrichment | DISPARU | 2025-10-24 | 2026-02-22 |
| monthly-community-sync | ACTIF | 2026-01-30 | réintroduit après 2026-05-13 |
| monthly-comprehensive-sync | DISPARU | 2026-02-20 | 2026-06-18 |
| monthly-device-enrichment | ACTIF | 2026-01-18 | réintroduit après 2026-05-13 |
| monthly-enrichment | ACTIF | 2025-12-06 | réintroduit après 2026-05-13 |
| monthly-intelligence-update | DISPARU | 2025-10-28 | 2026-02-22 |
| monthly-irdb-sync | DISPARU | 2026-02-25 | 2026-06-18 |
| monthly-scan | ACTIF | 2026-01-19 | réintroduit après 2026-05-13 |
| monthly-tuya-intelligence | ACTIF | 2026-05-02 | — |
| monthly-update | DISPARU | 2025-11-22 | 2025-12-03 |
| multi-ai-auto-handler | DISPARU | 2025-11-02 | 2026-02-22 |
| nightly-audit | ACTIF | 2026-07-14 | — |
| nightly-auto-process | DISPARU | 2026-02-20 | 2026-07-12 |
| notifications | ACTIF | 2026-04-03 | réintroduit après 2026-05-13 |
| offline-crash-analyzer | ACTIF | 2026-07-13 | — |
| organize-docs | DISPARU | 2025-11-03 | 2026-02-22 |
| pr-validation | DISPARU | 2025-10-24 | 2026-02-22 |
| pre-publish-version-check | DISPARU | 2025-10-24 | 2026-02-22 |
| publish-auto | DISPARU | 2025-10-24 | 2026-02-22 |
| publish-diagnose | ACTIF | 2026-07-14 | — |
| publish-homey | DISPARU | 2025-10-24 | 2026-02-22 |
| publish-official-only | DISPARU | 2025-11-15 | 2025-12-01 |
| publish-official-optimized | DISPARU | 2025-11-10 | 2025-12-03 |
| publish-official | DISPARU | 2025-11-10 | 2025-11-10 |
| publish-self-heal | ACTIF | 2026-07-14 | — |
| publish-simple-no-cli | DISPARU | 2025-11-17 | 2025-12-01 |
| publish-stable | ACTIF | 2026-05-03 | — |
| publish-ultimate | DISPARU | 2025-11-10 | 2025-11-10 |
| publish-v3 | DISPARU | 2025-10-24 | 2026-02-22 |
| publish-with-db | DISPARU | 2025-10-24 | 2026-02-22 |
| publish | ACTIF | 2025-10-24 | réintroduit après 2025-11-10 |
| recurrent-orchestrator | ACTIF | 2026-07-13 | — |
| reveal-secrets | DISPARU | 2026-05-11 | 2026-05-13 |
| root-cleanup-and-integrity | DISPARU | 2026-05-28 | 2026-06-18 |
| safe-sync-stable | ACTIF | 2026-07-14 | — |
| scheduled-issues-scan | DISPARU | 2025-10-24 | 2026-02-22 |
| secure-diagnostics | DISPARU | 2026-05-13 | 2026-06-18 |
| shadow-policy-check | ACTIF | 2026-07-12 | — |
| smart-pr-merge | ACTIF | 2026-04-04 | — |
| smart-update | ACTIF | 2026-07-14 | — |
| smart-version-increment | DISPARU | 2025-10-24 | 2026-02-22 |
| stale | ACTIF | 2026-02-25 | — |
| sunday-fork-scanner | DISPARU | 2026-02-20 | 2026-02-22 |
| sunday-forum-scanner | DISPARU | 2026-02-20 | 2026-02-22 |
| sunday-github-triage | DISPARU | 2026-02-20 | 2026-02-22 |
| sunday-master | DISPARU | 2026-02-20 | 2026-07-12 |
| sync-changelog-readme | DISPARU | 2026-01-07 | 2026-06-18 |
| sync-johan | DISPARU | 2026-04-03 | 2026-06-18 |
| syntax-check | ACTIF | 2026-05-01 | — |
| syntax-purity-gate | DISPARU | 2026-04-20 | 2026-06-18 |
| syntax-validation | DISPARU | 2026-04-27 | 2026-06-18 |
| temporal-monitor | ACTIF | 2026-07-13 | — |
| test-api-keys | DISPARU | 2026-04-04 | 2026-07-12 |
| test-workflows | DISPARU | 2025-11-10 | 2025-11-10 |
| tuya-automation-hub | DISPARU | 2026-02-20 | 2026-06-18 |
| tuya-deep-diag | ACTIF | 2026-04-16 | — |
| unified-ci | ACTIF | 2026-04-16 | — |
| unified-community | DISPARU | 2026-04-16 | 2026-04-28 |
| unified-intelligence | DISPARU | 2026-04-16 | 2026-06-18 |
| unified-maintenance | DISPARU | 2026-04-16 | 2026-06-18 |
| update-device-matrix | DISPARU | 2025-10-29 | 2026-02-22 |
| update-docs | DISPARU | 2025-10-24 | 2026-02-22 |
| update-forum-post-1 | DISPARU | 2026-03-01 | 2026-05-13 |
| upstream-auto-triage | DISPARU | 2026-02-20 | 2026-07-12 |
| upstream-guard | ACTIF | 2026-07-12 | — |
| validate-and-publish | DISPARU | 2025-10-24 | 2026-02-22 |
| validate-drivers | DISPARU | 2026-04-03 | 2026-06-18 |
| validate-fix-publish | DISPARU | 2025-11-09 | 2025-11-10 |
| validate | ACTIF | 2025-10-24 | réintroduit après 2025-11-10 |
| verified-publish-and-diagnostics | ACTIF | 2026-04-27 | — |
| version-bump | DISPARU | 2025-11-04 | 2025-11-10 |
| weekly-enrichment | DISPARU | 2025-10-24 | 2026-02-22 |
| weekly-external-sync | DISPARU | 2026-03-02 | 2026-07-12 |
| weekly-fingerprint-sync | DISPARU | 2026-02-20 | 2026-07-12 |
| weekly-verification | DISPARU | 2026-03-06 | 2026-07-12 |
