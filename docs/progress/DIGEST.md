# Digest automatique (P3048)

_Généré le 26/10/2026 12:02:49 (heure de Paris) par `scripts/automation/digest.cjs`, sans IA, sans envoi : ni mail, ni post, ni commentaire._

## Versions

| Branche | App | Version | Dernier statut Athom connu | Gate P3036 |
|---|---|---|---|---|
| master | com.dlnraja.tuya.zigbee | 9.0.1601 | 9.0.1599 #3682 test | n/a |
| stable-v5 | com.dlnraja.tuya.zigbee.stable | 5.12.508 | 5.12.504 #394 test | n/a |
| bastien-home | com.dlnraja.tuya.zigbee.bastien | 1.0.213 | 1.0.168 #176 test | n/a |

## Échecs CI (72 h)

- 2026-10-26 11:01 UTC · fail · Node 22 runtime tests failed on wip/p3055-parasites (test / Full suite on Node 22: code-or-test)
- 2026-10-26 11:01 UTC · fail · Node 22 runtime tests failed on wip/p3055-parasites (test / Full suite on Node 22: code-or-test)
- 2026-10-26 11:01 UTC · fail · 🚀 Publish Stable to Test failed on stable-v5 (Publish to Draft / Prepare Publish Directory: unknown)
- 2026-10-26 11:01 UTC · fail · Node 22 runtime tests failed on wip/rescue/wt-dp (test / Full suite on Node 22: unknown)
- 2026-10-26 11:01 UTC · fail · Node 22 runtime tests failed on wip/rescue/branch-bisect-g0-control-1385 (test / Full suite on Node 22: unknown)
- 2026-10-26 11:01 UTC · fail · Node 22 runtime tests failed on wip/rescue/branch-bisect-g1-flowcards (test / Full suite on Node 22: unknown)
- 2026-10-26 11:01 UTC · fail · Node 22 runtime tests failed on wip/rescue/branch-bisect-g2-dp17 (test / Full suite on Node 22: unknown)
- 2026-10-26 11:01 UTC · fail · Node 22 runtime tests failed on wip/rescue/branch-bisect-g3-couples (test / Full suite on Node 22: unknown)
- 2026-10-26 11:01 UTC · fail · 🔍 Syntax Check & SDK3 Validation failed on master (syntax-check / Check forbidden patterns (TITAN v5): unknown)
- 2026-10-26 11:01 UTC · fail · Node 22 runtime tests failed on stable-v5 (test / node:test strict (P3057-3): code-or-test)
- 2026-10-25 19:52 UTC · fail · Auto-Publish on Push failed on master (Validate & Auto-Publish to Homey App Store / Athom final state gate (red unless Test): no-log)
- 2026-10-25 19:52 UTC · fail · Auto-Publish on Push failed on master (Validate & Auto-Publish to Homey App Store / Athom final state gate (red unless Test): no-log)
- 2026-10-25 19:52 UTC · fail · Auto-Publish on Push failed on master (Validate & Auto-Publish to Homey App Store / Athom final state gate (red unless Test): no-log)
- 2026-10-25 19:52 UTC · fail · 🤖 Auto-Fix + Publish Pipeline failed on master (auto-fix / 💾 Commit fixes: no-log)
- 2026-10-25 19:52 UTC · fail · 🛡️ Unified CI/CD Orchestrator failed on master (🔍 Universal Validation (SDK 3 Strict) / 🛡️ L99 dual-app enrich gates (hard): no-log)

## Santé (7 jours)

- Combinaisons du paquet publié (platform-budget run 40294901150 du 2026-10-26) : **19976** / 17000 (marge -2976) ; plus gros driver presence_sensor_radar = 1078 / 1008 (marge -70)
- Combinaisons brutes des sources (avant élagage prepare-publish, indicatif) : 864570 ; plus gros driver switch_1gang = 142140 ; 41 driver(s) au-dessus de 1008 avant élagage.
- Plafonds actifs dans auto-publish-on-push.yml : total 15500, par driver 1500, top-up 20000.
- Workflows rattrapés par une simple relance (instables) : aucun
- Échecs répétés (même signature ≥ 2) : CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) c567adb8a6e1 ×2, 🚦 PR Gate 817f8bd5923b ×3, Node 22 runtime tests b446e2740f9d ×15, Node 22 runtime tests 351d901e2c87 ×14, 🔍 Syntax Check & SDK3 Validation bd6d4433bab2 ×4, 🔍 Syntax Check & SDK3 Validation 8c4dbb4f88db ×2, 🛡️ Unified CI/CD Orchestrator d64a0d71ff46 ×7, 🤖 Auto-Fix + Publish Pipeline 3dd7ea17e5ed ×2, 🤖 Auto-Fix + Publish Pipeline a38e6c418909 ×2, code-quality 7c75a5a143eb ×2, Auto-Publish on Push a3bd0bda6aba ×4
- Watchdog : 51 workflows planifiés, 5 alerte(s)
  - repeated-failure `.github/workflows/pr-gate.yml` : 3 failures in 72 h: 🚦 PR Gate failed on fix/fingerbot-senddata (🚦 Version + Sacred Couple + routing / 🔥 lib smoke-test (require every lib module): unknown)
  - repeated-failure `.github/workflows/node22-tests.yml` : 15 failures in 72 h: Node 22 runtime tests failed on wip/p3055-parasites (test / Full suite on Node 22: code-or-test)
  - repeated-failure `.github/workflows/syntax-check.yml` : 4 failures in 72 h: 🔍 Syntax Check & SDK3 Validation failed on master (syntax-check / Energy compose gate: no-log)
  - repeated-failure `.github/workflows/unified-ci.yml` : 7 failures in 72 h: 🛡️ Unified CI/CD Orchestrator failed on master (🔍 Universal Validation (SDK 3 Strict) / Normalize Homey manifest after validation: no-log)
  - repeated-failure `.github/workflows/node22-tests.yml` : 14 failures in 72 h: Node 22 runtime tests failed on bastien-home (test / Full suite on Node 22: no-log)

## Candidats de réponse (rien n'est publié automatiquement)

Aucun.

## Journal

79 ligne(s) sur 72 h dans `data/progress/automation-journal.jsonl`.

