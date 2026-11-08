# Digest automatique (P3048)

_Généré le 08/11/2026 12:54:47 (heure de Paris) par `scripts/automation/digest.cjs`, sans IA, sans envoi : ni mail, ni post, ni commentaire._

## Versions

| Branche | App | Version | Dernier statut Athom connu | Gate P3036 |
|---|---|---|---|---|
| master | com.dlnraja.tuya.zigbee | 9.0.1618 | 9.0.1618 #? processing_failed | n/a |
| stable-v5 | com.dlnraja.tuya.zigbee.stable | 5.12.548 | ? #415 transient | n/a |
| bastien-home | com.dlnraja.tuya.zigbee.bastien | 1.0.230 | 1.0.168 #176 test | n/a |

## Échecs CI (72 h)

- 2026-11-08 11:53 UTC · fail · Node 22 runtime tests failed on master (test / Full suite on Node 22: no-log)
- 2026-11-08 11:53 UTC · fail · Node 22 runtime tests failed on cursor/p3269-bastien-prefix-shard-a632 (test / node:test strict (P3057-3): no-log)
- 2026-11-08 11:53 UTC · fail · Node 22 runtime tests failed on cursor/p3269-bastien-prefix-shard-a632 (test / node:test strict (P3057-3): no-log)
- 2026-11-08 11:53 UTC · fail · 🚦 PR Gate failed on cursor/dual-layer-gate-a632 (🚦 Version + Sacred Couple + routing / 🔍 JS syntax audit (all repo files): no-log)
- 2026-11-08 11:53 UTC · fail · Node 22 runtime tests failed on bastien-home (test / node:test strict (P3057-3): no-log)
- 2026-11-08 11:53 UTC · fail · Node 22 runtime tests failed on bastien-home (test / Full suite on Node 22: no-log)
- 2026-11-08 11:53 UTC · fail · Node 22 runtime tests failed on stable-v5 (test / Full suite on Node 22: no-log)
- 2026-11-08 11:53 UTC · fail · Node 22 runtime tests failed on master (test / Full suite on Node 22: no-log)
- 2026-11-08 11:53 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / Lint ratchet (lib/ drivers/ — total may only go down, no file may get worse): no-log)
- 2026-11-08 11:53 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on bastien-home (self-check / Lint ratchet (lib/ drivers/ — total may only go down, no file may get worse): no-log)
- 2026-11-08 11:53 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on stable-v5 (self-check / Lint ratchet (lib/ drivers/ — total may only go down, no file may get worse): no-log)
- 2026-11-08 11:53 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on stable-v5 (self-check / Lint ratchet (lib/ drivers/ — total may only go down, no file may get worse): no-log)
- 2026-11-08 11:53 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on bastien-home (self-check / Lint ratchet (lib/ drivers/ — total may only go down, no file may get worse): no-log)
- 2026-11-08 11:53 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / Lint ratchet (lib/ drivers/ — total may only go down, no file may get worse): no-log)
- 2026-11-08 11:53 UTC · fail · Node 22 runtime tests failed on bastien-home (test / node:test strict (P3057-3): no-log)

## Santé (7 jours)

- Combinaisons du paquet publié (platform-budget run 42472276246 du 2026-11-08) : **19943** / 17000 (marge -2943) ; plus gros driver climate_sensor = 1600 / 1008 (marge -592)
- Combinaisons brutes des sources (avant élagage prepare-publish, indicatif) : 829415 ; plus gros driver switch_1gang = 141934 ; 41 driver(s) au-dessus de 1008 avant élagage.
- Plafonds actifs dans auto-publish-on-push.yml : total 15500, par driver 1500, top-up 20000.
- Workflows rattrapés par une simple relance (instables) : aucun
- Échecs répétés (même signature ≥ 2) : Node 22 runtime tests 6e84c480a105 ×2, Node 22 runtime tests 5be26e541885 ×4, Node 22 runtime tests 351d901e2c87 ×13, Node 22 runtime tests 57f650364735 ×2, Node 22 runtime tests 4b363edeecc7 ×4, Homey App Validate (all levels) a3ea004b0cdf ×4, 🔍 Validate Homey App de52b80418c8 ×4, 🔍 Syntax Check & SDK3 Validation ee7f1425cb78 ×2, Secret scan (gitleaks) 971d891f41dc ×4, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) fa3b79cd787a ×5, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) c6d1ad4d0e56 ×2, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 510d21345cba ×6
- Watchdog : 62 workflows planifiés, 8 alerte(s)
  - repeated-failure `.github/workflows/validate.yml` : 3 failures in 72 h: 🔍 Validate Homey App failed on master (🔍 Validate / 🛡️ GitHub Actions & YAML Policy Gate: code-or-test)
  - repeated-failure `.github/workflows/node22-tests.yml` : 3 failures in 72 h: Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): code-or-test)
  - repeated-failure `.github/workflows/secret-scan.yml` : 4 failures in 72 h: Secret scan (gitleaks) failed on stable-v5 (gitleaks / Install gitleaks (pinned + checksum): unknown)
  - repeated-failure `.github/workflows/node22-tests.yml` : 13 failures in 72 h: Node 22 runtime tests failed on master (test / Full suite on Node 22: no-log)
  - repeated-failure `.github/workflows/homey-app-validate.yml` : 4 failures in 72 h: Homey App Validate (all levels) failed on bastien-home (validate / Publish payload build + size/structure report: no-log)
  - repeated-failure `.github/workflows/ci-self-check.yml` : 5 failures in 72 h: CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on bastien-home (self-check / Install actionlint (pinned + sha256, retried on network blips only): no-log)
  - repeated-failure `.github/workflows/node22-tests.yml` : 4 failures in 72 h: Node 22 runtime tests failed on cursor/p3269-bastien-prefix-shard-a632 (test / node:test strict (P3057-3): no-log)
  - repeated-failure `.github/workflows/ci-self-check.yml` : 6 failures in 72 h: CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / Lint ratchet (lib/ drivers/ — total may only go down, no file may get worse): no-log)

## Candidats de réponse (rien n'est publié automatiquement)

Aucun.

## Journal

86 ligne(s) sur 72 h dans `data/progress/automation-journal.jsonl`.

