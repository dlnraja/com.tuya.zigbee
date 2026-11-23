# Digest automatique (P3048)

_Généré le 22/11/2026 14:17:39 (heure de Paris) par `scripts/automation/digest.cjs`, sans IA, sans envoi : ni mail, ni post, ni commentaire._

## Versions

| Branche | App | Version | Dernier statut Athom connu | Gate P3036 |
|---|---|---|---|---|
| master | com.dlnraja.tuya.zigbee | 9.0.1637 | 9.0.1636 #3717 test | n/a |
| stable-v5 | com.dlnraja.tuya.zigbee.stable | 5.12.560 | 5.12.549 #425 waiting_for_files | n/a |
| bastien-home | com.dlnraja.tuya.zigbee.bastien | 1.0.252 | 1.0.168 #176 test | n/a |

## Échecs CI (72 h)

- 2026-11-22 13:16 UTC · fail · Homey App Validate (all levels) failed on master (validate / Publish payload build + size/structure report: no-log)
- 2026-11-22 13:16 UTC · fail · Node 22 runtime tests failed on bastien-home (test / node:test strict (P3057-3): no-log)
- 2026-11-22 13:16 UTC · fail · Promote to Live failed on master (Objective gates then Live (master) / Promote if gates pass: no-log)
- 2026-11-22 13:16 UTC · fail · Node 22 runtime tests failed on stable-v5 (test / node:test strict (P3057-3): no-log)
- 2026-11-22 13:16 UTC · fail · Promote to Live failed on master (Objective gates then Live (master) / Promote if gates pass: no-log)
- 2026-11-22 13:16 UTC · fail · Promote to Live failed on master (Objective gates then Live (stable) / Promote if gates pass: no-log)
- 2026-11-22 13:16 UTC · fail · Node 22 runtime tests failed on stable-v5 (test / node:test strict (P3057-3): no-log)
- 2026-11-22 13:16 UTC · fail · Promote to Live failed on master (Objective gates then Live (master) / Promote if gates pass: no-log)
- 2026-11-22 13:16 UTC · fail · Promote to Live failed on master (Objective gates then Live (stable) / Promote if gates pass: no-log)
- 2026-11-22 13:16 UTC · fail · Autonomous review failed on bastien-home (semantic review / Exact couples, weakened tests, identity: no-log)
- 2026-11-22 13:16 UTC · fail · Node 22 runtime tests failed on cursor/stable-sleepy-tx-a632 (test / Full suite on Node 22: no-log)
- 2026-11-22 13:16 UTC · fail · Node 22 runtime tests failed on cursor/bastien-oom-sleepy-battery-a632 (strict / node:test strict (P3057-3): no-log)
- 2026-11-22 13:15 UTC · fail · Node 22 runtime tests failed on cursor/bastien-home-sleepy-tx-a632 (test / node:test strict (P3057-3): no-log)
- 2026-11-22 13:15 UTC · fail · Node 22 runtime tests failed on wip/work/r1025-master (test / Full suite on Node 22: no-log)
- 2026-11-22 13:15 UTC · fail · Node 22 runtime tests failed on wip/rescue/wt-dp (test / Full suite on Node 22: no-log)

## Santé (7 jours)

- Combinaisons du paquet publié (platform-budget run 44987355564 du 2026-11-22) : **20094** / 17000 (marge -3094) ; plus gros driver climate_sensor = 1672 / 1008 (marge -664)
- Combinaisons brutes des sources (avant élagage prepare-publish, indicatif) : 831967 ; plus gros driver switch_1gang = 143170 ; 41 driver(s) au-dessus de 1008 avant élagage.
- Plafonds actifs dans auto-publish-on-push.yml : total 15500, par driver 1500, top-up 20000.
- Workflows rattrapés par une simple relance (instables) : aucun
- Échecs répétés (même signature ≥ 2) : Platform Budget (P3026) eab905b90fc9 ×2, Node 22 runtime tests 5be26e541885 ×6, Node 22 runtime tests b8b4d0a704a7 ×3, Node 22 runtime tests 57f650364735 ×3, Node 22 runtime tests 985eb7e70d8b ×2, Node 22 runtime tests 351d901e2c87 ×6, Node 22 runtime tests b446e2740f9d ×2, Node 22 runtime tests 4b363edeecc7 ×4, Autonomous review 943a14060e21 ×5, Autonomous review 2a1553568063 ×4, Autonomous review 5f7fe9c41b03 ×3, Autonomous review 6b7f6cfbf7a6 ×9, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) d21382127725 ×2, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) b81376c1da58 ×8, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 7cb53e213373 ×2, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) b4093e189b03 ×2, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 6d2c80d14bb1 ×3, 🚦 PR Gate 3e56b4b8d95d ×2, 🚦 PR Gate a614dec56b7b ×4, Homey App Validate (all levels) 36aeff16af05 ×4, Homey App Validate (all levels) a3ea004b0cdf ×5, 🔍 Syntax Check & SDK3 Validation 4343ee8f200b ×2, Promote to Live 406e02a0541f ×2, Promote to Live 24abaa36c2ec ×3
- Watchdog : 67 workflows planifiés, 12 alerte(s)
  - stale `publish-self-heal.yml` : no scheduled run for 16 h (expected <= 14 h)
  - repeated-failure `.github/workflows/autonomous-review.yml` : 3 failures in 72 h: Autonomous review failed on fix/p3330-sacred-keep-collision (critical tests / Full critical suite: code-or-test)
  - repeated-failure `.github/workflows/homey-app-validate.yml` : 4 failures in 72 h: Homey App Validate (all levels) failed on master (validate / Publish payload build + size/structure report: code-or-test)
  - repeated-failure `.github/workflows/autonomous-review.yml` : 3 failures in 72 h: Autonomous review failed on master (staged publish validate / Compose, stage, validate, guard: unknown)
  - repeated-failure `.github/workflows/pr-gate.yml` : 4 failures in 72 h: 🚦 PR Gate failed on fix/rakazo-stable-v5-cleanup-emojis-ci (🚦 Version + Sacred Couple + routing / 🧪 Critical routing tests (mocha): no-log)
  - repeated-failure `.github/workflows/node22-tests.yml` : 6 failures in 72 h: Node 22 runtime tests failed on cursor/stable-sleepy-tx-a632 (test / Full suite on Node 22: no-log)
  - repeated-failure `.github/workflows/autonomous-review.yml` : 9 failures in 72 h: Autonomous review failed on stable-v5 (critical tests / Full critical suite: no-log)
  - repeated-failure `.github/workflows/ci-self-check.yml` : 8 failures in 72 h: CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on stable-v5 (self-check / app.json ↔ compose drift (fingerprints + flow titleFormatted, lossless): no-log)
  - repeated-failure `.github/workflows/homey-app-validate.yml` : 5 failures in 72 h: Homey App Validate (all levels) failed on master (validate / Publish payload build + size/structure report: no-log)
  - repeated-failure `.github/workflows/ci-self-check.yml` : 3 failures in 72 h: CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on bastien-home (self-check / Lint ratchet (lib/ drivers/ — total may only go down, no file may get worse): code-or-test)

## Candidats de réponse (rien n'est publié automatiquement)

Aucun.

## Journal

109 ligne(s) sur 72 h dans `data/progress/automation-journal.jsonl`.

