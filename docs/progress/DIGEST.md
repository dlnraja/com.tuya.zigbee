# Digest automatique (P3048)

_Généré le 28/11/2026 15:08:21 (heure de Paris) par `scripts/automation/digest.cjs`, sans IA, sans envoi : ni mail, ni post, ni commentaire._

## Versions

| Branche | App | Version | Dernier statut Athom connu | Gate P3036 |
|---|---|---|---|---|
| master | com.dlnraja.tuya.zigbee | 9.0.1642 | 9.0.1639 #3718 test | n/a |
| stable-v5 | com.dlnraja.tuya.zigbee.stable | 5.12.571 | 5.12.549 #425 waiting_for_files | n/a |
| bastien-home | com.dlnraja.tuya.zigbee.bastien | 1.0.262 | 1.0.168 #176 test | n/a |

## Échecs CI (72 h)

- 2026-11-28 14:06 UTC · fail · 🔍 Syntax Check & SDK3 Validation failed on master (syntax-check / P2138 BSEED dimmer + Poll Control tests: no-log)
- 2026-11-28 14:06 UTC · fail · 🤖 Auto-Fix + Publish Pipeline failed on master (auto-fix / 🛡️ Spec 002 native-matrix gate (shared rules-gates): no-log)
- 2026-11-28 14:06 UTC · fail · Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): no-log)
- 2026-11-28 14:06 UTC · fail · Node 22 runtime tests failed on stable-v5 (test / Full suite on Node 22: no-log)
- 2026-11-28 14:06 UTC · fail · 🤖 Auto-Fix + Publish Pipeline failed on stable-v5 (auto-fix / 🛡️ P2495 publish path (soft-expect + sacred-keep + couple): no-log)
- 2026-11-28 14:06 UTC · fail · 🔍 Syntax Check & SDK3 Validation failed on stable-v5 (syntax-check / P2138 BSEED dimmer + Poll Control tests: no-log)
- 2026-11-28 14:06 UTC · fail · code-quality failed on stable-v5 (Quality Checks / Anti-bot + P2138 sacred-couple matrix + P244x flow/knob: no-log)
- 2026-11-28 14:06 UTC · fail · 🛡️ Unified CI/CD Orchestrator failed on master (🔍 Universal Validation (SDK 3 Strict) / 🔍 Fingerprint Collision Check: no-log)
- 2026-11-28 14:06 UTC · fail · code-quality failed on master (Quality Checks / P244x flow/knob + family gates: no-log)
- 2026-11-28 14:06 UTC · fail · 🤖 Auto-Fix + Publish Pipeline failed on master (auto-fix / 🛡️ Spec 002 native-matrix gate (shared rules-gates): no-log)
- 2026-11-28 14:06 UTC · fail · 🔍 Syntax Check & SDK3 Validation failed on master (syntax-check / P2138 BSEED dimmer + Poll Control tests: no-log)
- 2026-11-28 14:06 UTC · fail · code-quality failed on stable-v5 (Quality Checks / Anti-bot + P2138 sacred-couple matrix + P244x flow/knob: no-log)
- 2026-11-28 14:06 UTC · fail · 🔍 Syntax Check & SDK3 Validation failed on stable-v5 (syntax-check / P2138 BSEED dimmer + Poll Control tests: no-log)
- 2026-11-28 14:06 UTC · fail · 🤖 Auto-Fix + Publish Pipeline failed on stable-v5 (auto-fix / 🛡️ P2495 publish path (soft-expect + sacred-keep + couple): no-log)
- 2026-11-28 14:06 UTC · fail · Node 22 runtime tests failed on bastien-home (test / Full suite on Node 22: no-log)

## Santé (7 jours)

- Combinaisons du paquet publié (platform-budget run 46145966057 du 2026-11-28) : **20094** / 17000 (marge -3094) ; plus gros driver climate_sensor = 1672 / 1008 (marge -664)
- Combinaisons brutes des sources (avant élagage prepare-publish, indicatif) : 831615 ; plus gros driver switch_1gang = 143170 ; 41 driver(s) au-dessus de 1008 avant élagage.
- Plafonds actifs dans auto-publish-on-push.yml : total 15500, par driver 1500, top-up 20000.
- Workflows rattrapés par une simple relance (instables) : aucun
- Échecs répétés (même signature ≥ 2) : Auto-Publish on Push 51495f0dd5d1 ×2, Autonomous review 5f7fe9c41b03 ×3, Autonomous review 943a14060e21 ×5, Autonomous review 6b7f6cfbf7a6 ×5, Autonomous review 2a1553568063 ×4, Homey App Validate (all levels) 36aeff16af05 ×3, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 6d2c80d14bb1 ×3, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 928c57b58b89 ×2, Node 22 runtime tests b446e2740f9d ×2, Node 22 runtime tests 351d901e2c87 ×9, Node 22 runtime tests 4b363edeecc7 ×4, Node 22 runtime tests 57f650364735 ×4, Node 22 runtime tests 5be26e541885 ×3, Publish Zigbee Bastien 350159bda9fd ×3, Promote to Live 406e02a0541f ×2, Promote to Live 24abaa36c2ec ×3, 🤖 Auto-Fix + Publish Pipeline 3eafa3e251a8 ×5, 🤖 Auto-Fix + Publish Pipeline b37a0cc9106c ×5, 🔍 Syntax Check & SDK3 Validation 4343ee8f200b ×7, 🔍 Syntax Check & SDK3 Validation 29c30aad5645 ×3, code-quality d1ec9f0993a2 ×5, code-quality 7c75a5a143eb ×3, 🛡️ Unified CI/CD Orchestrator 6da7f9ded5b7 ×4
- Watchdog : 69 workflows planifiés, 9 alerte(s)
  - repeated-failure `.github/workflows/autonomous-review.yml` : 4 failures in 72 h: Autonomous review failed on master (critical tests / Full critical suite: unknown)
  - repeated-failure `.github/workflows/node22-tests.yml` : 6 failures in 72 h: Node 22 runtime tests failed on stable-v5 (test / Full suite on Node 22: no-log)
  - repeated-failure `.github/workflows/syntax-check.yml` : 7 failures in 72 h: 🔍 Syntax Check & SDK3 Validation failed on master (syntax-check / P2138 BSEED dimmer + Poll Control tests: no-log)
  - repeated-failure `.github/workflows/code-quality.yml` : 5 failures in 72 h: code-quality failed on stable-v5 (Quality Checks / Anti-bot + P2138 sacred-couple matrix + P244x flow/knob: no-log)
  - repeated-failure `.github/workflows/unified-ci.yml` : 4 failures in 72 h: 🛡️ Unified CI/CD Orchestrator failed on master (🔍 Universal Validation (SDK 3 Strict) / 🔍 Fingerprint Collision Check: no-log)
  - repeated-failure `.github/workflows/syntax-check.yml` : 3 failures in 72 h: 🔍 Syntax Check & SDK3 Validation failed on master (syntax-check / Check TITAN v5 lifecycle patterns: no-log)
  - repeated-failure `.github/workflows/node22-tests.yml` : 3 failures in 72 h: Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): no-log)
  - repeated-failure `.github/workflows/autonomous-review.yml` : 4 failures in 72 h: Autonomous review failed on master (critical tests / Full critical suite: no-log)
  - repeated-failure `.github/workflows/code-quality.yml` : 3 failures in 72 h: code-quality failed on master (Quality Checks / P244x flow/knob + family gates: no-log)

## Candidats de réponse (rien n'est publié automatiquement)

Aucun.

## Journal

83 ligne(s) sur 72 h dans `data/progress/automation-journal.jsonl`.

