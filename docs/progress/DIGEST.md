# Digest automatique (P3048)

_Généré le 14/11/2026 13:06:59 (heure de Paris) par `scripts/automation/digest.cjs`, sans IA, sans envoi : ni mail, ni post, ni commentaire._

## Versions

| Branche | App | Version | Dernier statut Athom connu | Gate P3036 |
|---|---|---|---|---|
| master | com.dlnraja.tuya.zigbee | 9.0.1620 | 9.0.1620 #? test | n/a |
| stable-v5 | com.dlnraja.tuya.zigbee.stable | 5.12.548 | ? #415 transient | n/a |
| bastien-home | com.dlnraja.tuya.zigbee.bastien | 1.0.230 | 1.0.168 #176 test | n/a |

## Échecs CI (72 h)

- 2026-11-14 12:05 UTC · fail · Homey App Validate (all levels) failed on master (validate / Publish payload build + size/structure report: no-log)
- 2026-11-14 12:05 UTC · fail · Auto-Publish on Push failed on master (Validate & Auto-Publish to Homey App Store / Publish to Homey App Store: no-log)
- 2026-11-14 12:05 UTC · fail · Node 22 runtime tests failed on cursor/gh632-trv602z-ltwbm23f-3270 (strict / node:test strict (P3057-3): no-log)
- 2026-11-14 12:05 UTC · fail · Node 22 runtime tests failed on cursor/gh632-trv602z-ltwbm23f-3270 (test / Full suite on Node 22: no-log)
- 2026-11-14 12:05 UTC · fail · 🚦 PR Gate failed on cursor/gh632-trv602z-ltwbm23f-3270 (🚦 Version + Sacred Couple + routing / 🔍 JS syntax audit (all repo files): no-log)
- 2026-11-14 12:05 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on cursor/gh632-trv602z-ltwbm23f-3270 (self-check / Lint ratchet (lib/ drivers/ — total may only go down, no file may get worse): no-log)
- 2026-11-14 12:05 UTC · fail · Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): no-log)
- 2026-11-14 12:05 UTC · fail · Autonomous review failed on master (semantic review / Exact couples, weakened tests, identity: no-log)
- 2026-11-14 12:05 UTC · fail · 🔍 Syntax Check & SDK3 Validation failed on master (syntax-check / Check GitHub Actions policy: no-log)
- 2026-11-14 12:05 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / Report ratchet (about headers, no pasted third-party text, report shape — may only shrink): no-log)
- 2026-11-14 12:05 UTC · fail · 🛡️ Unified CI/CD Orchestrator failed on master (🔍 Universal Validation (SDK 3 Strict) / 🛡️ GitHub Actions & YAML Policy Gate: no-log)
- 2026-11-14 12:05 UTC · fail · Node 22 runtime tests failed on stable-v5 (test / node:test strict (P3057-3): no-log)
- 2026-11-14 12:05 UTC · fail · Autonomous review failed on stable-v5 (semantic review / Exact couples, weakened tests, identity: no-log)
- 2026-11-14 12:05 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on stable-v5 (self-check / Report ratchet (about headers, no pasted third-party text, report shape — may only shrink): no-log)
- 2026-11-14 12:05 UTC · fail · Autonomous review failed on bastien-home (critical tests / Full critical suite: no-log)

## Santé (7 jours)

- Combinaisons du paquet publié (platform-budget run 43500315996 du 2026-11-13) : **19943** / 17000 (marge -2943) ; plus gros driver climate_sensor = 1600 / 1008 (marge -592)
- Combinaisons brutes des sources (avant élagage prepare-publish, indicatif) : 829415 ; plus gros driver switch_1gang = 141934 ; 41 driver(s) au-dessus de 1008 avant élagage.
- Plafonds actifs dans auto-publish-on-push.yml : total 15500, par driver 1500, top-up 20000.
- Workflows rattrapés par une simple relance (instables) : aucun
- Échecs répétés (même signature ≥ 2) : Secret scan (gitleaks) 971d891f41dc ×4, Node 22 runtime tests 985eb7e70d8b ×2, Node 22 runtime tests b446e2740f9d ×4, Node 22 runtime tests 5be26e541885 ×2, Node 22 runtime tests 351d901e2c87 ×17, Node 22 runtime tests 57f650364735 ×5, Node 22 runtime tests 4b363edeecc7 ×6, 🔍 Syntax Check & SDK3 Validation edd7f9128ffe ×3, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) fa3b79cd787a ×5, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) c6d1ad4d0e56 ×2, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 510d21345cba ×7, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 6d2c80d14bb1 ×5, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 72bdff597f12 ×8, 🛡️ Unified CI/CD Orchestrator 7646881c10df ×2, Homey App Validate (all levels) a3ea004b0cdf ×5, 🚦 PR Gate d4d191a21402 ×2, Autonomous review 2a1553568063 ×3, Autonomous review 6b7f6cfbf7a6 ×2, Autonomous review 0bbdd15454c8 ×2
- Watchdog : 62 workflows planifiés, 6 alerte(s)
  - repeated-failure `.github/workflows/autonomous-review.yml` : 3 failures in 72 h: Autonomous review failed on bastien-home (critical tests / Full critical suite: code-or-test)
  - repeated-failure `.github/workflows/node22-tests.yml` : 3 failures in 72 h: Node 22 runtime tests failed on stable-v5 (test / Full suite on Node 22: code-or-test)
  - repeated-failure `.github/workflows/ci-self-check.yml` : 5 failures in 72 h: CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / Lint ratchet (lib/ drivers/ — total may only go down, no file may get worse): code-or-test)
  - repeated-failure `.github/workflows/ci-self-check.yml` : 8 failures in 72 h: CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / Report ratchet (about headers, no pasted third-party text, report shape — may only shrink): no-log)
  - repeated-failure `.github/workflows/node22-tests.yml` : 4 failures in 72 h: Node 22 runtime tests failed on cursor/gh632-trv602z-ltwbm23f-3270 (test / Full suite on Node 22: no-log)
  - repeated-failure `.github/workflows/node22-tests.yml` : 3 failures in 72 h: Node 22 runtime tests failed on cursor/gh632-trv602z-ltwbm23f-3270 (strict / node:test strict (P3057-3): no-log)

## Candidats de réponse (rien n'est publié automatiquement)

Aucun.

## Journal

63 ligne(s) sur 72 h dans `data/progress/automation-journal.jsonl`.

