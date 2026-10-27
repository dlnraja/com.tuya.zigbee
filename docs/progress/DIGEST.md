# Digest automatique (P3048)

_Généré le 27/10/2026 11:32:27 (heure de Paris) par `scripts/automation/digest.cjs`, sans IA, sans envoi : ni mail, ni post, ni commentaire._

## Versions

| Branche | App | Version | Dernier statut Athom connu | Gate P3036 |
|---|---|---|---|---|
| master | com.dlnraja.tuya.zigbee | 9.0.1602 | 9.0.1603 #3685 processing_failed | n/a |
| stable-v5 | com.dlnraja.tuya.zigbee.stable | 5.12.516 | 5.12.504 #394 test | n/a |
| bastien-home | com.dlnraja.tuya.zigbee.bastien | 1.0.217 | 1.0.168 #176 test | n/a |

## Échecs CI (72 h)

- 2026-10-27 10:31 UTC · fail · Autonomous Verification (P37) failed on master (🩺 CI health (master + stable-v5 → tracking issue) / 📦 Setup Node.js: no-log)
- 2026-10-27 10:31 UTC · fail · Node 22 runtime tests failed on bastien-home (test / node:test strict (P3057-3): no-log)
- 2026-10-27 10:31 UTC · fail · Node 22 runtime tests failed on master (test / Full suite on Node 22: no-log)
- 2026-10-27 10:31 UTC · fail · 🛡️ Unified CI/CD Orchestrator failed on master (🔍 Universal Validation (SDK 3 Strict) / 🛡️ L99 dual-app enrich gates (hard): no-log)
- 2026-10-27 10:31 UTC · fail · 🛡️ Unified CI/CD Orchestrator failed on master (🔍 Universal Validation (SDK 3 Strict) / 🛡️ L99 dual-app enrich gates (hard): no-log)
- 2026-10-27 10:31 UTC · fail · 🚀 Publish Stable to Test failed on stable-v5 (Publish to Draft / Re-upload when Athom processing fails (fresh higher version): no-log)
- 2026-10-27 10:31 UTC · fail · Node 22 runtime tests failed on bastien-home (test / node:test strict (P3057-3): no-log)
- 2026-10-27 10:31 UTC · fail · Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): no-log)
- 2026-10-27 10:31 UTC · fail · Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): no-log)
- 2026-10-27 10:31 UTC · fail · Node 22 runtime tests failed on master (test / Full suite on Node 22: no-log)
- 2026-10-27 10:30 UTC · fail · Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): no-log)
- 2026-10-27 10:30 UTC · fail · Node 22 runtime tests failed on bastien-home (test / node:test strict (P3057-3): no-log)
- 2026-10-27 10:30 UTC · fail · Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): no-log)
- 2026-10-27 10:30 UTC · fail · code-quality failed on master (Quality Checks / P244x flow/knob + family gates: no-log)
- 2026-10-27 10:30 UTC · fail · 🔍 Syntax Check & SDK3 Validation failed on master (syntax-check / P2138 BSEED dimmer + Poll Control tests: no-log)

## Santé (7 jours)

- Combinaisons du paquet publié (platform-budget run 40477513086 du 2026-10-27) : **19955** / 17000 (marge -2955) ; plus gros driver curtain_motor = 1099 / 1008 (marge -91)
- Combinaisons brutes des sources (avant élagage prepare-publish, indicatif) : 846806 ; plus gros driver switch_1gang = 141522 ; 41 driver(s) au-dessus de 1008 avant élagage.
- Plafonds actifs dans auto-publish-on-push.yml : total 15500, par driver 1500, top-up 20000.
- Workflows rattrapés par une simple relance (instables) : aucun
- Échecs répétés (même signature ≥ 2) : CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) c567adb8a6e1 ×2, 🚦 PR Gate 817f8bd5923b ×3, Node 22 runtime tests b446e2740f9d ×15, Node 22 runtime tests 351d901e2c87 ×24, Node 22 runtime tests 6e84c480a105 ×4, Node 22 runtime tests 5be26e541885 ×4, Node 22 runtime tests 4b363edeecc7 ×8, Node 22 runtime tests 57f650364735 ×8, 🔍 Syntax Check & SDK3 Validation 511597415813 ×2, 🔍 Syntax Check & SDK3 Validation bd6d4433bab2 ×4, 🔍 Syntax Check & SDK3 Validation 8c4dbb4f88db ×2, 🔍 Syntax Check & SDK3 Validation 4343ee8f200b ×4, 🛡️ Unified CI/CD Orchestrator d64a0d71ff46 ×7, 🛡️ Unified CI/CD Orchestrator d2c3bf9ae874 ×3, 🛡️ Unified CI/CD Orchestrator a70346f68e80 ×2, 🛡️ Unified CI/CD Orchestrator a089ee206a72 ×2, 🤖 Auto-Fix + Publish Pipeline 3dd7ea17e5ed ×2, 🤖 Auto-Fix + Publish Pipeline a38e6c418909 ×2, 🤖 Auto-Fix + Publish Pipeline ae9f4ef5384b ×2, 🤖 Auto-Fix + Publish Pipeline 3eafa3e251a8 ×4, code-quality 7c75a5a143eb ×3, code-quality d9277ed3905f ×2, code-quality d1ec9f0993a2 ×2, code-quality fb19cc18274b ×2, Auto-Publish on Push a3bd0bda6aba ×4
- Watchdog : 51 workflows planifiés, 12 alerte(s)
  - repeated-failure `.github/workflows/pr-gate.yml` : 3 failures in 72 h: 🚦 PR Gate failed on fix/fingerbot-senddata (🚦 Version + Sacred Couple + routing / 🔥 lib smoke-test (require every lib module): unknown)
  - repeated-failure `.github/workflows/node22-tests.yml` : 15 failures in 72 h: Node 22 runtime tests failed on wip/p3055-parasites (test / Full suite on Node 22: code-or-test)
  - repeated-failure `.github/workflows/syntax-check.yml` : 4 failures in 72 h: 🔍 Syntax Check & SDK3 Validation failed on master (syntax-check / Energy compose gate: no-log)
  - repeated-failure `.github/workflows/unified-ci.yml` : 7 failures in 72 h: 🛡️ Unified CI/CD Orchestrator failed on master (🔍 Universal Validation (SDK 3 Strict) / Normalize Homey manifest after validation: no-log)
  - repeated-failure `.github/workflows/code-quality.yml` : 3 failures in 72 h: code-quality failed on master (Quality Checks / P244x flow/knob + family gates: no-log)
  - repeated-failure `.github/workflows/node22-tests.yml` : 24 failures in 72 h: Node 22 runtime tests failed on master (test / Full suite on Node 22: no-log)
  - repeated-failure `.github/workflows/unified-ci.yml` : 3 failures in 72 h: 🛡️ Unified CI/CD Orchestrator failed on master (🔍 Universal Validation (SDK 3 Strict) / 🛡️ L99 dual-app enrich gates (hard): no-log)
  - repeated-failure `.github/workflows/node22-tests.yml` : 4 failures in 72 h: Node 22 runtime tests failed on master (test / Full suite on Node 22: code-or-test)
  - repeated-failure `.github/workflows/node22-tests.yml` : 4 failures in 72 h: Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): unknown)
  - repeated-failure `.github/workflows/node22-tests.yml` : 8 failures in 72 h: Node 22 runtime tests failed on bastien-home (test / node:test strict (P3057-3): no-log)

## Candidats de réponse (rien n'est publié automatiquement)

Aucun.

## Journal

149 ligne(s) sur 72 h dans `data/progress/automation-journal.jsonl`.

