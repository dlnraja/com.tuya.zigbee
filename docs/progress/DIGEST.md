# Digest automatique (P3048)

_Généré le 16/11/2026 14:34:45 (heure de Paris) par `scripts/automation/digest.cjs`, sans IA, sans envoi : ni mail, ni post, ni commentaire._

## Versions

| Branche | App | Version | Dernier statut Athom connu | Gate P3036 |
|---|---|---|---|---|
| master | com.dlnraja.tuya.zigbee | 9.0.1626 | 9.0.1626 #3707 processing_failed | n/a |
| stable-v5 | com.dlnraja.tuya.zigbee.stable | 5.12.554 | 5.12.549 #425 waiting_for_files | n/a |
| bastien-home | com.dlnraja.tuya.zigbee.bastien | 1.0.241 | 1.0.168 #176 test | n/a |

## Échecs CI (72 h)

- 2026-11-16 13:33 UTC · fail · Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): no-log)
- 2026-11-16 13:33 UTC · fail · Auto-Publish on Push failed on master (Validate & Auto-Publish to Homey App Store / Record diagnostic draft: no-log)
- 2026-11-16 13:33 UTC · fail · 🚀 Publish Stable to Test failed on stable-v5 (Publish to Draft / Publish to Draft: no-log)
- 2026-11-16 13:33 UTC · fail · Autonomous review failed on bastien-home (critical tests / Full critical suite: code-or-test)
- 2026-11-16 13:33 UTC · fail · Node 22 runtime tests failed on bastien-home (test / node:test strict (P3057-3): code-or-test)
- 2026-11-16 13:33 UTC · fail · Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): code-or-test)
- 2026-11-16 13:33 UTC · fail · Node 22 runtime tests failed on stable-v5 (test / node:test strict (P3057-3): code-or-test)
- 2026-11-16 13:33 UTC · fail · Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): code-or-test)
- 2026-11-16 13:33 UTC · fail · 🚀 Publish Stable to Test failed on stable-v5 (Publish to Draft / Publish to Draft: unknown)
- 2026-11-16 13:33 UTC · transient · Node 22 runtime tests failed on bastien-home (test / node:test strict (P3057-3): socket hang up)
- 2026-11-16 13:33 UTC · fail · Node 22 runtime tests failed on stable-v5 (test / node:test strict (P3057-3): code-or-test)
- 2026-11-16 13:33 UTC · fail · Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): unknown)
- 2026-11-16 13:33 UTC · fail · Autonomous review failed on bastien-home (semantic review / Exact couples, weakened tests, identity: unknown)
- 2026-11-16 13:33 UTC · fail · Autonomous review failed on stable-v5 (semantic review / Exact couples, weakened tests, identity: unknown)
- 2026-11-16 13:32 UTC · fail · Auto-Publish on Push failed on master (Validate & Auto-Publish to Homey App Store / Record diagnostic draft: code-or-test)

## Santé (7 jours)

- Combinaisons du paquet publié (platform-budget run 43797187383 du 2026-11-16) : **20080** / 17000 (marge -3080) ; plus gros driver climate_sensor = 1600 / 1008 (marge -592)
- Combinaisons brutes des sources (avant élagage prepare-publish, indicatif) : 831771 ; plus gros driver switch_1gang = 143170 ; 41 driver(s) au-dessus de 1008 avant élagage.
- Plafonds actifs dans auto-publish-on-push.yml : total 15500, par driver 1500, top-up 20000.
- Workflows rattrapés par une simple relance (instables) : aucun
- Échecs répétés (même signature ≥ 2) : Node 22 runtime tests b446e2740f9d ×6, Node 22 runtime tests 351d901e2c87 ×8, Node 22 runtime tests 57f650364735 ×7, Node 22 runtime tests 4b363edeecc7 ×2, Node 22 runtime tests 5be26e541885 ×5, Node 22 runtime tests b8b4d0a704a7 ×3, Autonomous review 2a1553568063 ×6, Autonomous review 943a14060e21 ×3, Autonomous review 6b7f6cfbf7a6 ×6, Autonomous review 0bbdd15454c8 ×2, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 6d2c80d14bb1 ×5, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 72bdff597f12 ×8, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) b4093e189b03 ×3, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 7cb53e213373 ×3, 🛡️ Unified CI/CD Orchestrator 7646881c10df ×2, 🔍 Syntax Check & SDK3 Validation edd7f9128ffe ×2, 🔍 Syntax Check & SDK3 Validation 4343ee8f200b ×3, Capability coherence audit (P3136) 4a903a6c1783 ×2, 🤖 Auto-Fix + Publish Pipeline 3dd7ea17e5ed ×3
- Watchdog : 62 workflows planifiés, 13 alerte(s)
  - repeated-failure `.github/workflows/autonomous-review.yml` : 6 failures in 72 h: Autonomous review failed on bastien-home (critical tests / Full critical suite: code-or-test)
  - repeated-failure `.github/workflows/node22-tests.yml` : 6 failures in 72 h: Node 22 runtime tests failed on bastien-home (test / Full suite on Node 22: code-or-test)
  - repeated-failure `.github/workflows/ci-self-check.yml` : 5 failures in 72 h: CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / Lint ratchet (lib/ drivers/ — total may only go down, no file may get worse): code-or-test)
  - repeated-failure `.github/workflows/autonomous-review.yml` : 3 failures in 72 h: Autonomous review failed on bastien-home (semantic review / Exact couples, weakened tests, identity: unknown)
  - repeated-failure `.github/workflows/ci-self-check.yml` : 8 failures in 72 h: CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / Report ratchet (about headers, no pasted third-party text, report shape — may only shrink): no-log)
  - repeated-failure `.github/workflows/node22-tests.yml` : 8 failures in 72 h: Node 22 runtime tests failed on master (test / Full suite on Node 22: no-log)
  - repeated-failure `.github/workflows/node22-tests.yml` : 7 failures in 72 h: Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): no-log)
  - repeated-failure `.github/workflows/autonomous-review.yml` : 6 failures in 72 h: Autonomous review failed on master (critical tests / Full critical suite: no-log)
  - repeated-failure `.github/workflows/ci-self-check.yml` : 3 failures in 72 h: CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / Compose parity (rebuild from compose == committed app.json, P3079): no-log)
  - repeated-failure `.github/workflows/syntax-check.yml` : 3 failures in 72 h: 🔍 Syntax Check & SDK3 Validation failed on stable-v5 (syntax-check / P2138 BSEED dimmer + Poll Control tests: no-log)

## Candidats de réponse (rien n'est publié automatiquement)

Aucun.

## Journal

126 ligne(s) sur 72 h dans `data/progress/automation-journal.jsonl`.

