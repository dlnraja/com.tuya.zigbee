# Digest automatique (P3048)

_Généré le 01/11/2026 12:50:06 (heure de Paris) par `scripts/automation/digest.cjs`, sans IA, sans envoi : ni mail, ni post, ni commentaire._

## Versions

| Branche | App | Version | Dernier statut Athom connu | Gate P3036 |
|---|---|---|---|---|
| master | com.dlnraja.tuya.zigbee | 9.0.1609 | 9.0.1609 #? processing_failed | n/a |
| stable-v5 | com.dlnraja.tuya.zigbee.stable | 5.12.527 | 5.12.525 #407 transient | n/a |
| bastien-home | com.dlnraja.tuya.zigbee.bastien | 1.0.222 | 1.0.168 #176 test | n/a |

## Échecs CI (72 h)

- 2026-11-01 11:48 UTC · fail · Node 22 runtime tests failed on master (test / Full suite on Node 22: no-log)
- 2026-11-01 11:48 UTC · fail · 🚦 PR Gate failed on kb/refresh-20261026 (🚦 Version + Sacred Couple + routing / 🔍 JS syntax audit (all repo files): no-log)
- 2026-11-01 11:48 UTC · fail · 🚦 PR Gate failed on bot/homey-knowledge-20261029 (🚦 Version + Sacred Couple + routing / 🔍 JS syntax audit (all repo files): no-log)
- 2026-11-01 11:48 UTC · fail · 🚀 Publish Stable to Test failed on stable-v5 (Promote to Test / Athom final state gate (red unless Test): no-log)
- 2026-11-01 11:48 UTC · fail · Node 22 runtime tests failed on bastien-home (test / Full suite on Node 22: no-log)
- 2026-11-01 11:48 UTC · fail · .github/workflows/node22-tests.yml failed on master ( / : no-job)
- 2026-11-01 11:48 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / actionlint (0 findings on master/stable/bastien at P3025 — any finding is a regression): no-log)
- 2026-11-01 11:48 UTC · fail · 🛡️ Unified CI/CD Orchestrator failed on master (🔍 Universal Validation (SDK 3 Strict) / 🛡️ GitHub Actions & YAML Policy Gate: no-log)
- 2026-11-01 11:48 UTC · fail · 🔍 Syntax Check & SDK3 Validation failed on master (syntax-check / Check GitHub Actions policy: no-log)
- 2026-11-01 11:48 UTC · fail · Node 22 runtime tests failed on master (test / Full suite on Node 22: no-log)
- 2026-11-01 11:48 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / Hygiene ratchet (pins, Node 20 actions, node-version, timeouts, raw pushes): no-log)
- 2026-11-01 11:48 UTC · fail · Node 22 runtime tests failed on master (test / Full suite on Node 22: no-log)
- 2026-11-01 11:48 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / Hygiene ratchet (pins, Node 20 actions, node-version, timeouts, raw pushes): no-log)
- 2026-11-01 11:48 UTC · fail · Node 22 runtime tests failed on master (test / Full suite on Node 22: code-or-test)
- 2026-11-01 11:48 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / Hygiene ratchet (pins, Node 20 actions, node-version, timeouts, raw pushes): code-or-test)

## Santé (7 jours)

- Combinaisons du paquet publié (platform-budget run 41302044043 du 2026-11-01) : **19927** / 17000 (marge -2927) ; plus gros driver curtain_motor = 1099 / 1008 (marge -91)
- Combinaisons brutes des sources (avant élagage prepare-publish, indicatif) : 846920 ; plus gros driver switch_1gang = 141110 ; 41 driver(s) au-dessus de 1008 avant élagage.
- Plafonds actifs dans auto-publish-on-push.yml : total 15500, par driver 1500, top-up 20000.
- Workflows rattrapés par une simple relance (instables) : aucun
- Échecs répétés (même signature ≥ 2) : CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) c567adb8a6e1 ×2, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 7eb76cc4ded8 ×2, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 64478740eb3e ×2, 🚦 PR Gate 817f8bd5923b ×3, 🚦 PR Gate d4d191a21402 ×2, Node 22 runtime tests b446e2740f9d ×15, Node 22 runtime tests 351d901e2c87 ×28, Node 22 runtime tests 6e84c480a105 ×8, Node 22 runtime tests 5be26e541885 ×6, Node 22 runtime tests 4b363edeecc7 ×8, Node 22 runtime tests 57f650364735 ×8, 🔍 Syntax Check & SDK3 Validation 511597415813 ×2, 🔍 Syntax Check & SDK3 Validation bd6d4433bab2 ×4, 🔍 Syntax Check & SDK3 Validation 8c4dbb4f88db ×2, 🔍 Syntax Check & SDK3 Validation 4343ee8f200b ×4, 🛡️ Unified CI/CD Orchestrator d64a0d71ff46 ×7, 🛡️ Unified CI/CD Orchestrator d2c3bf9ae874 ×3, 🛡️ Unified CI/CD Orchestrator a70346f68e80 ×2, 🛡️ Unified CI/CD Orchestrator a089ee206a72 ×2, 🤖 Auto-Fix + Publish Pipeline 3dd7ea17e5ed ×2, 🤖 Auto-Fix + Publish Pipeline a38e6c418909 ×2, 🤖 Auto-Fix + Publish Pipeline ae9f4ef5384b ×2, 🤖 Auto-Fix + Publish Pipeline 3eafa3e251a8 ×4, code-quality 7c75a5a143eb ×3, code-quality d9277ed3905f ×2, code-quality d1ec9f0993a2 ×2, code-quality fb19cc18274b ×2, code-quality 2aac89176943 ×2, Auto-Publish on Push a3bd0bda6aba ×4, 🤖 Daily Digest 28d56709ef60 ×4, 🤖 Daily Digest 88dfdae1295f ×4
- Watchdog : 59 workflows planifiés, 2 alerte(s)
  - repeated-failure `.github/workflows/node22-tests.yml` : 4 failures in 72 h: Node 22 runtime tests failed on master (test / Full suite on Node 22: code-or-test)
  - repeated-failure `.github/workflows/node22-tests.yml` : 4 failures in 72 h: Node 22 runtime tests failed on master (test / Full suite on Node 22: no-log)

## Candidats de réponse (rien n'est publié automatiquement)

- [#559](https://github.com/dlnraja/com.tuya.zigbee/issues/559) par @Lalla80111 — sujet: non classé — commit e28970dbb7, CI green

## Journal

45 ligne(s) sur 72 h dans `data/progress/automation-journal.jsonl`.

