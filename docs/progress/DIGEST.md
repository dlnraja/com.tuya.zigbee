# Digest automatique (P3048)

_Généré le 21/11/2026 14:26:14 (heure de Paris) par `scripts/automation/digest.cjs`, sans IA, sans envoi : ni mail, ni post, ni commentaire._

## Versions

| Branche | App | Version | Dernier statut Athom connu | Gate P3036 |
|---|---|---|---|---|
| master | com.dlnraja.tuya.zigbee | 9.0.1634 | 9.0.1634 #3715 test | n/a |
| stable-v5 | com.dlnraja.tuya.zigbee.stable | 5.12.555 | 5.12.549 #425 waiting_for_files | n/a |
| bastien-home | com.dlnraja.tuya.zigbee.bastien | 1.0.247 | 1.0.168 #176 test | n/a |

## Échecs CI (72 h)

- 2026-11-21 13:24 UTC · fail · 🚦 PR Gate failed on fix/rakazo-cleanup-emojis-ci (🚦 Version + Sacred Couple + routing / 🔍 JS syntax audit (all repo files): no-log)
- 2026-11-21 13:24 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on fix/rakazo-cleanup-emojis-ci (self-check / app.json ↔ compose drift (fingerprints + flow titleFormatted, lossless): no-log)
- 2026-11-21 13:24 UTC · fail · 🔍 Syntax Check & SDK3 Validation failed on fix/rakazo-cleanup-emojis-ci (syntax-check / P2138 BSEED dimmer + Poll Control tests: no-log)
- 2026-11-21 13:24 UTC · fail · Homey App Validate (all levels) failed on fix/rakazo-cleanup-emojis-ci (validate / Publish payload build + size/structure report: no-log)
- 2026-11-21 13:24 UTC · fail · Autonomous review failed on fix/rakazo-cleanup-emojis-ci (staged publish validate / Compose, stage, validate, guard: no-log)
- 2026-11-21 13:24 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on fix/rakazo-stable-v5-cleanup-emojis-ci (self-check / app.json ↔ compose drift (fingerprints + flow titleFormatted, lossless): no-log)
- 2026-11-21 13:24 UTC · fail · Autonomous review failed on fix/oom-flow-consolidation-rakazo (critical tests / Full critical suite: no-log)
- 2026-11-21 13:24 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on fix/oom-flow-consolidation-rakazo (self-check / app.json ↔ compose drift (fingerprints + flow titleFormatted, lossless): no-log)
- 2026-11-21 13:24 UTC · fail · Homey App Validate (all levels) failed on master (validate / Publish payload build + size/structure report: no-log)
- 2026-11-21 13:24 UTC · fail · 🔍 Syntax Check & SDK3 Validation failed on master (syntax-check / P2138 BSEED dimmer + Poll Control tests: no-log)
- 2026-11-21 13:24 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / app.json ↔ compose drift (fingerprints + flow titleFormatted, lossless): no-log)
- 2026-11-21 13:24 UTC · fail · Platform Budget (P3026) failed on master (budget / Build + prepare payload (local only, no upload): no-log)
- 2026-11-21 13:24 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on bastien-home (self-check / app.json ↔ compose drift (fingerprints + flow titleFormatted, lossless): no-log)
- 2026-11-21 13:24 UTC · fail · Node 22 runtime tests failed on fix/rakazo-cleanup-emojis-ci (test / Full suite on Node 22: no-log)
- 2026-11-21 13:24 UTC · fail · Autonomous review failed on fix/rakazo-stable-v5-cleanup-emojis-ci (critical tests / Full critical suite: no-log)

## Santé (7 jours)

- Combinaisons du paquet publié (platform-budget run 44906967210 du 2026-11-21) : **20080** / 17000 (marge -3080) ; plus gros driver climate_sensor = 1664 / 1008 (marge -656)
- Combinaisons brutes des sources (avant élagage prepare-publish, indicatif) : 831771 ; plus gros driver switch_1gang = 143170 ; 41 driver(s) au-dessus de 1008 avant élagage.
- Plafonds actifs dans auto-publish-on-push.yml : total 15500, par driver 1500, top-up 20000.
- Workflows rattrapés par une simple relance (instables) : aucun
- Échecs répétés (même signature ≥ 2) : Node 22 runtime tests b446e2740f9d ×3, Node 22 runtime tests 351d901e2c87 ×7, Node 22 runtime tests 57f650364735 ×5, Node 22 runtime tests 5be26e541885 ×6, Node 22 runtime tests b8b4d0a704a7 ×3, Node 22 runtime tests 985eb7e70d8b ×2, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) b4093e189b03 ×5, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 7cb53e213373 ×5, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) d21382127725 ×2, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) b81376c1da58 ×7, Capability coherence audit (P3136) 4a903a6c1783 ×2, Autonomous review 2a1553568063 ×6, Autonomous review 6b7f6cfbf7a6 ×12, Autonomous review 943a14060e21 ×2, 🤖 Auto-Fix + Publish Pipeline 3dd7ea17e5ed ×3, 🔍 Syntax Check & SDK3 Validation 4343ee8f200b ×5, 🚦 PR Gate a614dec56b7b ×5, 🚦 PR Gate 3e56b4b8d95d ×2, Platform Budget (P3026) eab905b90fc9 ×2, Homey App Validate (all levels) 36aeff16af05 ×2, Homey App Validate (all levels) a3ea004b0cdf ×4
- Watchdog : 62 workflows planifiés, 6 alerte(s)
  - repeated-failure `.github/workflows/autonomous-review.yml` : 3 failures in 72 h: Autonomous review failed on fix/p3330-sacred-keep-collision (critical tests / Full critical suite: code-or-test)
  - repeated-failure `.github/workflows/pr-gate.yml` : 4 failures in 72 h: 🚦 PR Gate failed on fix/rakazo-stable-v5-cleanup-emojis-ci (🚦 Version + Sacred Couple + routing / 🧪 Critical routing tests (mocha): no-log)
  - repeated-failure `.github/workflows/node22-tests.yml` : 3 failures in 72 h: Node 22 runtime tests failed on fix/rakazo-cleanup-emojis-ci (test / Full suite on Node 22: no-log)
  - repeated-failure `.github/workflows/autonomous-review.yml` : 8 failures in 72 h: Autonomous review failed on fix/oom-flow-consolidation-rakazo (critical tests / Full critical suite: no-log)
  - repeated-failure `.github/workflows/ci-self-check.yml` : 7 failures in 72 h: CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on fix/rakazo-cleanup-emojis-ci (self-check / app.json ↔ compose drift (fingerprints + flow titleFormatted, lossless): no-log)
  - repeated-failure `.github/workflows/homey-app-validate.yml` : 4 failures in 72 h: Homey App Validate (all levels) failed on fix/rakazo-cleanup-emojis-ci (validate / Publish payload build + size/structure report: no-log)

## Candidats de réponse (rien n'est publié automatiquement)

Aucun.

## Journal

70 ligne(s) sur 72 h dans `data/progress/automation-journal.jsonl`.

