# Digest automatique (P3048)

_Généré le 07/11/2026 12:42:05 (heure de Paris) par `scripts/automation/digest.cjs`, sans IA, sans envoi : ni mail, ni post, ni commentaire._

## Versions

| Branche | App | Version | Dernier statut Athom connu | Gate P3036 |
|---|---|---|---|---|
| master | com.dlnraja.tuya.zigbee | 9.0.1616 | 9.0.1616 #? processing_failed | n/a |
| stable-v5 | com.dlnraja.tuya.zigbee.stable | 5.12.542 | ? #415 transient | n/a |
| bastien-home | com.dlnraja.tuya.zigbee.bastien | 1.0.227 | 1.0.168 #176 test | n/a |

## Échecs CI (72 h)

- 2026-11-07 11:40 UTC · fail · 🔍 Validate Homey App failed on master (🔍 Validate / 🛡️ GitHub Actions & YAML Policy Gate: code-or-test)
- 2026-11-06 12:53 UTC · fail · 🔍 Validate Homey App failed on master (🔍 Validate / 🛡️ GitHub Actions & YAML Policy Gate: code-or-test)
- 2026-11-06 12:53 UTC · fail · 🔍 Syntax Check & SDK3 Validation failed on master (syntax-check / Check GitHub Actions policy: unknown)
- 2026-11-06 12:53 UTC · fail · Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): code-or-test)
- 2026-11-05 13:06 UTC · fail · 🔍 Validate Homey App failed on master (🔍 Validate / 🛡️ GitHub Actions & YAML Policy Gate: code-or-test)
- 2026-11-04 12:56 UTC · fail · Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): code-or-test)
- 2026-11-04 12:56 UTC · fail · 🛡️ Unified CI/CD Orchestrator failed on master (🔍 Universal Validation (SDK 3 Strict) / 🛡️ GitHub Actions & YAML Policy Gate: unknown)
- 2026-11-04 12:56 UTC · fail · 🔍 Syntax Check & SDK3 Validation failed on master (syntax-check / Check GitHub Actions policy: unknown)
- 2026-11-04 12:56 UTC · fail · 🔍 Validate Homey App failed on master (🔍 Validate / 🛡️ GitHub Actions & YAML Policy Gate: code-or-test)

## Santé (7 jours)

- Combinaisons du paquet publié (platform-budget run 41660062246 du 2026-11-03) : **19944** / 17000 (marge -2944) ; plus gros driver climate_sensor = 1600 / 1008 (marge -592)
- Combinaisons brutes des sources (avant élagage prepare-publish, indicatif) : 829415 ; plus gros driver switch_1gang = 141934 ; 41 driver(s) au-dessus de 1008 avant élagage.
- Plafonds actifs dans auto-publish-on-push.yml : total 15500, par driver 1500, top-up 20000.
- Workflows rattrapés par une simple relance (instables) : aucun
- Échecs répétés (même signature ≥ 2) : code-quality 2aac89176943 ×2, Node 22 runtime tests 5be26e541885 ×4, Node 22 runtime tests 6e84c480a105 ×6, Node 22 runtime tests 351d901e2c87 ×4, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 7eb76cc4ded8 ×2, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 64478740eb3e ×2, 🔍 Syntax Check & SDK3 Validation ee7f1425cb78 ×2, 🚦 PR Gate d4d191a21402 ×2, 🔍 Validate Homey App de52b80418c8 ×4
- Watchdog : 62 workflows planifiés, 2 alerte(s)
  - failing `validate.yml` : last 3 completed runs failed (newest https://github.com/dlnraja/com.tuya.zigbee/actions/runs/42277016583)
  - repeated-failure `.github/workflows/validate.yml` : 4 failures in 72 h: 🔍 Validate Homey App failed on master (🔍 Validate / 🛡️ GitHub Actions & YAML Policy Gate: code-or-test)

## Candidats de réponse (rien n'est publié automatiquement)

Aucun.

## Journal

23 ligne(s) sur 72 h dans `data/progress/automation-journal.jsonl`.

