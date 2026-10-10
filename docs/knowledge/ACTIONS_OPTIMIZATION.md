# GitHub Actions — mesure et optimisation (10/10/2026)

Mesure : API `actions/runs` sur 30 jours (10/09 au 10/10/2026), 7457 runs, durée = fin − début du run arrondie à la minute (approximation : la facturation réelle se fait par job). **≈ 29 700 min/mois.**
Le repo est **public** : les runners standard ubuntu-latest sont gratuits et illimités ; le vrai coût est la file d'attente (20 jobs simultanés).

Par déclencheur : push 16 900 · schedule 9 460 · workflow_dispatch 1 600 · workflow_run 1 410.
Top : auto-publish-on-push 4 357 · continuous-flow 2 825 · auto-fix-and-publish 2 704 · publish-stable 2 064 · code-quality 1 639 · syntax-check 1 629 · auto-enrich-closed-loop 1 450 · unified-ci 1 405.

Déjà en place : les 78 workflows ont tous un `concurrency` et des timeouts ; les CI push ont des filtres de chemins.

Changements de la branche ci/actions-optimization :
- cache npm sur 9 étapes setup-node de 7 workflows qui font `npm ci` (62 sur 87 l'avaient déjà) ;
- e2e-dashboard-test : cron 07:00 supprimé, doublon de son déclenchement par continuous-flow ;
- source-registry : lecture incrémentale du forum corrigée (les numéros de post étaient passés comme IDs, et le curseur sautait les posts au-delà de 20).

Estimation : ≈ 26 100 min/mois après (−12 %), dont l'essentiel vient du retrait du déclencheur push de continuous-flow le 04/10 (≈ 2 700 min, plus ≈ 750 min de e2e en cascade).
Plus gros gisement restant (à décider) : les runs rouges (syntax-check ≈ 700 min, unified-ci ≈ 510, auto-publish ≈ 580, code-quality ≈ 400) ; 4 workflows lancés à chaque push sur master (code-quality, syntax-check, unified-ci, auto-fix-and-publish) qui se recouvrent en partie ; auto-fix-and-publish toutes les 6 h (≈ 570 min/mois en planifié).
