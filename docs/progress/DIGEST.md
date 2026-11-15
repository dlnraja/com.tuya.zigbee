# Digest automatique (P3048)

_Généré le 15/11/2026 13:41:55 (heure de Paris) par `scripts/automation/digest.cjs`, sans IA, sans envoi : ni mail, ni post, ni commentaire._

## Versions

| Branche | App | Version | Dernier statut Athom connu | Gate P3036 |
|---|---|---|---|---|
| master | com.dlnraja.tuya.zigbee | 9.0.1622 | 9.0.1622 #? processing_failed | n/a |
| stable-v5 | com.dlnraja.tuya.zigbee.stable | 5.12.549 | ? #415 transient | n/a |
| bastien-home | com.dlnraja.tuya.zigbee.bastien | 1.0.230 | 1.0.168 #176 test | n/a |

## Échecs CI (72 h)

- 2026-11-15 12:40 UTC · fail · Node 22 runtime tests failed on master (test / Full suite on Node 22: no-log)
- 2026-11-15 12:40 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / Driver signature duplicate gate (P3238 — new driver identical to an existing one is refused): no-log)
- 2026-11-15 12:40 UTC · fail · Autonomous review failed on master (critical tests / Full critical suite: no-log)
- 2026-11-15 12:40 UTC · fail · Node 22 runtime tests failed on cursor/gh632-trv602z-ltwbm23f-3270 (strict / node:test strict (P3057-3): no-log)
- 2026-11-15 12:40 UTC · fail · 🚦 PR Gate failed on cursor/gh632-trv602z-ltwbm23f-3270 (🚦 Version + Sacred Couple + routing / 🧪 Critical routing tests (mocha): no-log)
- 2026-11-15 12:40 UTC · fail · Autonomous review failed on cursor/gh632-trv602z-ltwbm23f-3270 (critical tests / Full critical suite: no-log)
- 2026-11-15 12:40 UTC · fail · Node 22 runtime tests failed on cursor/gh632-trv602z-ltwbm23f-3270 (strict / node:test strict (P3057-3): no-log)
- 2026-11-15 12:40 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on cursor/gh632-trv602z-ltwbm23f-3270 (self-check / Driver signature duplicate gate (P3238 — new driver identical to an existing one is refused): no-log)
- 2026-11-15 12:40 UTC · fail · Node 22 runtime tests failed on bastien-home (test / Full suite on Node 22: no-log)
- 2026-11-15 12:40 UTC · fail · Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): no-log)
- 2026-11-15 12:40 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / Driver signature duplicate gate (P3238 — new driver identical to an existing one is refused): no-log)
- 2026-11-15 12:40 UTC · fail · 🔍 Syntax Check & SDK3 Validation failed on stable-v5 (syntax-check / P2138 BSEED dimmer + Poll Control tests: no-log)
- 2026-11-15 12:40 UTC · fail · 🤖 Auto-Fix + Publish Pipeline failed on stable-v5 (auto-fix / 🛡️ P244x / P246x / P248x / P249x family gates: no-log)
- 2026-11-15 12:40 UTC · fail · Autonomous review failed on master (critical tests / Full critical suite: no-log)
- 2026-11-15 12:40 UTC · fail · 🤖 Auto-Fix + Publish Pipeline failed on master (auto-fix / 🛡️ P244x / P246x / P248x / P249x family gates: no-log)

## Santé (7 jours)

- Combinaisons du paquet publié (platform-budget run 43700362215 du 2026-11-15) : **19944** / 17000 (marge -2944) ; plus gros driver climate_sensor = 1600 / 1008 (marge -592)
- Combinaisons brutes des sources (avant élagage prepare-publish, indicatif) : 829415 ; plus gros driver switch_1gang = 141934 ; 41 driver(s) au-dessus de 1008 avant élagage.
- Plafonds actifs dans auto-publish-on-push.yml : total 15500, par driver 1500, top-up 20000.
- Workflows rattrapés par une simple relance (instables) : aucun
- Échecs répétés (même signature ≥ 2) : Node 22 runtime tests b446e2740f9d ×6, Node 22 runtime tests 351d901e2c87 ×8, Node 22 runtime tests 57f650364735 ×6, Node 22 runtime tests 4b363edeecc7 ×2, Autonomous review 2a1553568063 ×5, Autonomous review 6b7f6cfbf7a6 ×6, Autonomous review 0bbdd15454c8 ×2, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 6d2c80d14bb1 ×5, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 72bdff597f12 ×8, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) b4093e189b03 ×3, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 7cb53e213373 ×3, 🛡️ Unified CI/CD Orchestrator 7646881c10df ×2, 🔍 Syntax Check & SDK3 Validation edd7f9128ffe ×2, 🔍 Syntax Check & SDK3 Validation 4343ee8f200b ×3, Capability coherence audit (P3136) 4a903a6c1783 ×2, 🤖 Auto-Fix + Publish Pipeline 3dd7ea17e5ed ×3
- Watchdog : 62 workflows planifiés, 10 alerte(s)
  - repeated-failure `.github/workflows/autonomous-review.yml` : 5 failures in 72 h: Autonomous review failed on stable-v5 (critical tests / Full critical suite: code-or-test)
  - repeated-failure `.github/workflows/node22-tests.yml` : 6 failures in 72 h: Node 22 runtime tests failed on bastien-home (test / Full suite on Node 22: code-or-test)
  - repeated-failure `.github/workflows/ci-self-check.yml` : 5 failures in 72 h: CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / Lint ratchet (lib/ drivers/ — total may only go down, no file may get worse): code-or-test)
  - repeated-failure `.github/workflows/ci-self-check.yml` : 8 failures in 72 h: CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / Report ratchet (about headers, no pasted third-party text, report shape — may only shrink): no-log)
  - repeated-failure `.github/workflows/node22-tests.yml` : 8 failures in 72 h: Node 22 runtime tests failed on master (test / Full suite on Node 22: no-log)
  - repeated-failure `.github/workflows/node22-tests.yml` : 6 failures in 72 h: Node 22 runtime tests failed on cursor/gh632-trv602z-ltwbm23f-3270 (strict / node:test strict (P3057-3): no-log)
  - repeated-failure `.github/workflows/autonomous-review.yml` : 6 failures in 72 h: Autonomous review failed on master (critical tests / Full critical suite: no-log)
  - repeated-failure `.github/workflows/ci-self-check.yml` : 3 failures in 72 h: CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / Compose parity (rebuild from compose == committed app.json, P3079): no-log)
  - repeated-failure `.github/workflows/syntax-check.yml` : 3 failures in 72 h: 🔍 Syntax Check & SDK3 Validation failed on stable-v5 (syntax-check / P2138 BSEED dimmer + Poll Control tests: no-log)
  - repeated-failure `.github/workflows/ci-self-check.yml` : 3 failures in 72 h: CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / Driver signature duplicate gate (P3238 — new driver identical to an existing one is refused): no-log)

## Candidats de réponse (rien n'est publié automatiquement)

Aucun.

## Journal

108 ligne(s) sur 72 h dans `data/progress/automation-journal.jsonl`.

