# Audit des workflows GitHub Actions — 2026-07-28

Projet : `com.tuya.zigbee` (branche `master`, checkout local sans remote).
Périmètre : `.github/workflows/` — 54 fichiers (53 `.yml` + 1 `.yml.manual`).
Aucun commit/push effectué. Modifications limitées aux 3 workflows avec références de scripts cassées.

## Synthèse

| Indicateur | Valeur |
|---|---|
| Fichiers audités | 54 |
| Syntaxe YAML valide | 54/54 (parsés avec `js-yaml`, 0 erreur) |
| Fonctionnellement désactivés | 1 (`homey-app-cicd.yml.manual`, renommé volontairement) |
| Réactivés | 0 (le `.manual` est redondant → laissé archivé, documenté ci-dessous) |
| Références de scripts cassées | 4 trouvées → 4 corrigées (dans 3 workflows) |
| Workflows actifs sains | 53 |

Note : 23 workflows ont un `schedule:`, les autres sont sur événements (`push`, `pull_request`, `issues`, `issue_comment`, `workflow_run`, `workflow_call`) ou `workflow_dispatch` uniquement. Un workflow dispatch-only n'est **pas** considéré comme désactivé (ex. `monthly-device-enrichment.yml` mentionne explicitement « schedule removed » dans son en-tête — consolidation assumée). Aucun `if: false` global, aucun `schedule:` commenté, aucun `on:` vide détecté.

## Tableau d'inventaire

| Fichier | Triggers | Statut | Rôle (en-tête / nom) | Action |
|---|---|---|---|---|
| activity-monitor.yml | schedule `0 4 * * *` + dispatch | ACTIF | Activity Monitor (P30) | — |
| ai-monthly-audit.yml | schedule `0 0 1 * *` + dispatch | ACTIF | AI Monthly Audit (TITAN Protocol v2) | chemin script corrigé |
| auto-close-supported.yml | dispatch | ACTIF | Batch Analyze & Respond (réponses/labels, transitions manuelles) | — |
| auto-enrich-closed-loop.yml | schedule `0 */4 * * *` + dispatch | ACTIF | Auto-Enrich Closed Loop (P69) | — |
| auto-fix-and-publish.yml | push(master/stable-v5) + schedule `5 */6 * * *` + dispatch | ACTIF | Auto-Fix + Publish Pipeline | — |
| auto-publish-on-push.yml | push(master/main) + dispatch | ACTIF | Auto-Publish on Push (validate + bump + publish) | — |
| auto-reopen-on-comment.yml | issue_comment + dispatch | ACTIF | Réouvre les issues/PR fermés quand un utilisateur commente | — |
| autonomous-verification.yml | schedule `15 */6 * * *` + dispatch | ACTIF | Autonomous Verification (P37) | — |
| blakadder-fetch.yml | schedule `15 4 * * *` + dispatch | ACTIF | Blakadder Integration v2 (P53) : crawl + cross-ref mfs_db/Johan/Gmail | — |
| bug-report-auto-pr.yml | issues + dispatch | ACTIF | Bug Report Auto-PR | — |
| build-error-diag.yml | dispatch + schedule `17 2 * * *` | ACTIF | Build Error Diagnostic (Puppeteer) | — |
| code-quality.yml | PR + push (master/main/stable-v5) + schedule `0 3 * * 3` + dispatch | ACTIF | Code Quality Check (réactivé après P10 avec garde-fous) | chemin script corrigé |
| collect-diagnostics.yml | schedule `15 10 * * 1` + dispatch | ACTIF | Collect Diagnostics (UNIFIED CONSOLIDATION v8.5.17) | — |
| continuous-flow.yml | schedule `0 3 * * *` + dispatch + push(master, paths filtrés) | ACTIF | Workflow quotidien consolidé — remplace 10+ workflows (P9) | — |
| delete-johan-comments.yml | dispatch | ACTIF | Suppression manuelle de commentaires upstream | — |
| delete-own-upstream-comments.yml | dispatch | ACTIF | Delete My Upstream Comments (manuel) | — |
| dependabot-auto-merge.yml | pull_request | ACTIF | Dependabot Auto-Merge | — |
| deploy-pages.yml | schedule `0 9 * * *` + dispatch + workflow_run + push(master/main) | ACTIF | Deploy Device Finder to GitHub Pages | — |
| draft-to-test.yml | dispatch | ACTIF | Draft to Test Promotion (UNIFIED v8.5.1) | — |
| driver-maintenance.yml | schedule `30 4 * * 5` + dispatch | ACTIF | Driver Maintenance v1.0.0 (scaffold, conflits, PRs) — hebdo ven. | — |
| e2e-dashboard-test.yml | schedule `0 7 * * *` + dispatch + workflow_run | ACTIF | Test E2E dashboard master vs stable | 2 chemins scripts corrigés |
| fetch-diags.yml | schedule `25 */6 * * *` + dispatch | ACTIF | Fetch Homey Diagnostics | — |
| forum-poll.yml | schedule `15 2,6,10,14,18,22 * * *` + dispatch | ACTIF | Forum Poll (P69) | — |
| gmail-diagnostics.yml | schedule `0 0,6,12,18 * * *` + dispatch | ACTIF | Gmail Diagnostics Auto-Analysis | — |
| gmail-token-keepalive.yml | schedule `0 8 * * *` + dispatch + workflow_call | ACTIF | Gmail Auth Health Check | — |
| **homey-app-cicd.yml.manual** | push(master) + dispatch | **DÉSACTIVÉ (renommé .manual)** | Homey App CI/CD (validate on push + publish dispatch) | **laissé archivé — redondant (voir § suivant)** |
| knowledge-graph-sync.yml | schedule `30 2 * * *` + dispatch | ACTIF | Knowledge Graph Daily Sync | — |
| labeler.yml | pull_request_target | ACTIF | PR Labeler | — |
| mega-crawl.yml | schedule `0 2 * * *` + dispatch | ACTIF | Mega Crawler (P53) : 15 crawlers sources externes, quotidien 02:00 | — |
| monthly-community-sync.yml | dispatch | ACTIF | Monthly Community Sync (enrichissement FP, ne jamais écraser) | — |
| monthly-device-enrichment.yml | dispatch | ACTIF | Monthly Device Enrichment v9.0.34 (schedule retiré volontairement) | — |
| monthly-enrichment.yml | dispatch | ACTIF | Monthly Enrichment Pipeline (forums, PRs, validation drivers) | — |
| monthly-scan.yml | schedule `0 0 1 * *` + dispatch | ACTIF | Monthly Device Scan (Z2M → issues pour FP manquants) | — |
| monthly-tuya-intelligence.yml | schedule `0 0 1 * *` + dispatch | ACTIF | Monthly Tuya Intelligence & URL Audit | — |
| nightly-audit.yml | schedule `30 3 * * *` + dispatch | ACTIF | Nightly Audit | — |
| notifications.yml | issues + pull_request + dispatch | ACTIF | Secure Notifications (Enhanced) | — |
| offline-crash-analyzer.yml | schedule `0 5 * * *` + dispatch | ACTIF | Offline Crash Analyzer (P31) | — |
| publish-diagnose.yml | workflow_run + dispatch | ACTIF | Publish Diagnose | — |
| publish-self-heal.yml | schedule `0 4,8,12,16,20 * * *` + dispatch | ACTIF | Publish Self-Heal | — |
| publish-stable.yml | push(stable-v5) + dispatch | ACTIF | Publish Stable to Test (4 jobs) | — |
| publish.yml | dispatch | ACTIF | Auto Publish — actions Athom officielles, bump + promote (3 jobs) | — |
| recurrent-orchestrator.yml | schedule `30 3 * * *` + dispatch | ACTIF | Recurrent Orchestrator (P32) | — |
| safe-sync-stable.yml | schedule `0 4 * * *` + dispatch | ACTIF | Safe Sync master → stable-v5 (P52) | — |
| shadow-policy-check.yml | push + pull_request + dispatch | ACTIF | GitHub Shadow Policy | — |
| smart-pr-merge.yml | pull_request + pull_request_review + dispatch | ACTIF | Smart PR Auto-Merge | — |
| smart-update.yml | schedule `30 1 * * *` + dispatch | ACTIF | Smart Update Orchestrator | — |
| stale.yml | schedule `0 5 * * 1` + dispatch | ACTIF | Mark Stale Issues & PRs (hebdo lun.) | — |
| syntax-check.yml | push + PR (master/stable-v5) | ACTIF | Syntax Check & SDK3 Validation (TITAN v5) | — |
| temporal-monitor.yml | schedule `0 6 * * *` + dispatch | ACTIF | Temporal Monitor (P29.7) | — |
| tuya-deep-diag.yml | dispatch | ACTIF | Tuya Deep Diagnostics Recovery | — |
| unified-ci.yml | push + PR (master/main) + dispatch | ACTIF | Unified CI/CD Orchestrator — gate CI complet (4 jobs) | — |
| upstream-guard.yml | workflow_call | ACTIF | Garde réutilisable anti-écriture vers JohanBendz (appelé par d'autres) | — |
| validate.yml | schedule `0 12 * * *` + PR (master/main/stable-v5) + dispatch | ACTIF | Validate Homey App (TITAN v2, restauré 2026-06-16) | — |
| verified-publish-and-diagnostics.yml | dispatch | ACTIF | Verify, Diagnostics & Publish Test (UNIFIED v8.5.17) | — |

## Décision sur `homey-app-cicd.yml.manual`

Contenu : job `validate` (Athom validate level=publish) sur push master, job `publish` (bump via `.github/scripts/bump-homey-version.js` + `athombv/github-action-homey-app-publish`) sur `workflow_dispatch` uniquement.

Doublons détectés dans les workflows actifs :

- `unified-ci.yml` : validation complète (SDK3 strict, `npx homey app validate --level publish`, gates yaml/timer/voice) sur push master/main et PR — couvre et dépasse le job `validate` du `.manual`.
- `publish.yml` : `workflow_dispatch` avec le **même** script de bump `.github/scripts/bump-homey-version.js`, publication via action locale `./.github/actions/homey-app-publish`, plus auto-promote draft → couvre et dépasse le job `publish` du `.manual`.
- `auto-publish-on-push.yml` : publication sur push master avec bump — couvre aussi le cas push.

**Conclusion : le `.manual` est intégralement redondant. Il reste archivé** (GitHub ignore les extensions non `.yml/.yaml`). Aucune restauration nécessaire ; le renommage `.manual` est la méthode d'archivage actuelle du dépôt (les dossiers `.disabled/` et `archive/` de P9 n'existent plus). Sa fonction est documentée ici : validation sur push + publication manuelle avec bump de version, remplacée par `unified-ci.yml` + `publish.yml` + `auto-publish-on-push.yml`.

## Références cassées et corrections

Les 4 références étaient toutes protégées par `if [ -f ... ]` (skip silencieux, non bloquant), mais les scripts existaient ailleurs après déplacement. Correction des chemins vers les équivalents actuels :

| Workflow | Ancien chemin (absent) | Nouveau chemin (existe) | Justification |
|---|---|---|---|
| ai-monthly-audit.yml | `scripts/validation/check-syntax-drivers.js` | `scripts/validation/check-driver-health.js` | Même dossier ; le script inclut le syntax check `node --check` des drivers et affiche « PASSED », attendu par le `grep -c "PASSED"` du workflow |
| code-quality.yml | `tools/ci/driver-health-check.js` | `scripts/validation/check-driver-health.js` | « Comprehensive Driver Health Check » — renommé/déplacé |
| e2e-dashboard-test.yml | `tools/ci/ci-bug-hunter.js` | `scripts/ci/bug-hunter.js` | Même nom de base, déplacé vers `scripts/ci/` |
| e2e-dashboard-test.yml | `tools/ci/driver-health-check.js` | `scripts/validation/check-driver-health.js` | Idem code-quality |

Vérification après correction : 0 référence manquante sur 114 chemins `node xxx.js` / `uses: ./...` extraits des 54 fichiers ; YAML re-parsé OK sur les 3 fichiers modifiés. Les messages `echo` de skip ont été alignés sur les nouveaux noms. Tous les scripts `npm run` référencés par les workflows (`check:yaml`, `check:timer-context`, `check:voice`, `check:homey-guidelines`, `check:fingerprint-catalog`, `check:button-flows`, `check:diag-history`, `fix:generated-flow-args`, `prepare-publish`, `validate:conflicts`, `validate:fingerprints`, `validate:flows`, `build`) existent dans `package.json`.

## Autres constats (non modifiés)

- `tools/ci/archive-disabled.js` référence `.github/workflows/.disabled` et `archive/` qui n'existent plus — script obsolète mais inoffensif (non exécuté par un workflow actif).
- Chevauchements de cron sans conflit réel : `continuous-flow` (03:00), `nightly-audit` (03:30) et `recurrent-orchestrator` (03:30) se suivent ; `monthly-scan`, `monthly-tuya-intelligence` et `ai-monthly-audit` partagent `0 0 1 * *` (3 runs simultanés le 1er du mois — à étaler si charge).
- `PROJECT_INDEX.md` (section 12 + table des dossiers) indiquait « 63 workflows » et listait d'anciens noms (`daily-everything`, `sunday-master`, `nightly-auto-process`, `weekly-fingerprint-sync`) qui n'existent plus — corrigé : 54 fichiers (53 + 1 archivé), table d'exemples remplacée par des workflows réels, renvoi vers ce rapport.

## Recommandations

1. Ne pas réactiver `homey-app-cicd.yml.manual` ; si besoin d'archivage explicite, le déplacer dans `docs/archive/` plutôt que de le laisser dans `workflows/` (GitHub l'ignore déjà, c'est cosmétique).
2. Supprimer ou réécrire `tools/ci/archive-disabled.js` (chemins sources inexistants).
3. Étaler les 3 crons mensuels `0 0 1 * *` (ex. 00:00 / 01:00 / 02:00) pour limiter la concurrence de runners.
4. Lors de la consolidation documentaire prévue, régénérer la section 12 de `PROJECT_INDEX.md` à partir de ce rapport (table complète ci-dessus).
5. Ajouter le contrôle « références de scripts » au gate `npm run check:yaml` pour détecter automatiquement les futurs déplacements de scripts.
