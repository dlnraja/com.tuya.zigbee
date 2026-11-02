# Digest automatique (P3048)

_Généré le 02/11/2026 14:28:42 (heure de Paris) par `scripts/automation/digest.cjs`, sans IA, sans envoi : ni mail, ni post, ni commentaire._

## Versions

| Branche | App | Version | Dernier statut Athom connu | Gate P3036 |
|---|---|---|---|---|
| master | com.dlnraja.tuya.zigbee | 9.0.1612 | 9.0.1612 #? processing_failed | n/a |
| stable-v5 | com.dlnraja.tuya.zigbee.stable | 5.12.533 | ? #410 transient | n/a |
| bastien-home | com.dlnraja.tuya.zigbee.bastien | 1.0.226 | 1.0.168 #176 test | n/a |

## Échecs CI (72 h)

- 2026-11-02 13:27 UTC · fail · Auto-Publish on Push failed on master (Validate & Auto-Publish to Homey App Store / Athom final state gate (red unless Test): code-or-test)
- 2026-11-02 13:27 UTC · fail · Homey App Validate (all levels) failed on master (validate / Publish payload build + size/structure report: code-or-test)
- 2026-11-02 13:27 UTC · fail · Node 22 runtime tests failed on master (test / Full suite on Node 22: code-or-test)
- 2026-11-02 13:27 UTC · fail · Node 22 runtime tests failed on master (test / Full suite on Node 22: code-or-test)
- 2026-11-02 13:27 UTC · transient · Fetch Homey Diagnostics failed on master (fetch-diags / Privacy and diagnostic gates: fetch failed)
- 2026-11-02 13:27 UTC · fail · KB refresh (weekly) failed on master (refresh / Open draft PR when changed: unknown)
- 2026-11-01 11:48 UTC · fail · Node 22 runtime tests failed on master (test / Full suite on Node 22: no-log)
- 2026-11-01 11:48 UTC · fail · 🚦 PR Gate failed on kb/refresh-20261026 (🚦 Version + Sacred Couple + routing / 🔍 JS syntax audit (all repo files): no-log)
- 2026-11-01 11:48 UTC · fail · 🚦 PR Gate failed on bot/homey-knowledge-20261029 (🚦 Version + Sacred Couple + routing / 🔍 JS syntax audit (all repo files): no-log)
- 2026-11-01 11:48 UTC · fail · 🚀 Publish Stable to Test failed on stable-v5 (Promote to Test / Athom final state gate (red unless Test): no-log)
- 2026-11-01 11:48 UTC · fail · Node 22 runtime tests failed on bastien-home (test / Full suite on Node 22: no-log)
- 2026-11-01 11:48 UTC · fail · .github/workflows/node22-tests.yml failed on master ( / : no-job)
- 2026-11-01 11:48 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / actionlint (0 findings on master/stable/bastien at P3025 — any finding is a regression): no-log)
- 2026-11-01 11:48 UTC · fail · 🛡️ Unified CI/CD Orchestrator failed on master (🔍 Universal Validation (SDK 3 Strict) / 🛡️ GitHub Actions & YAML Policy Gate: no-log)
- 2026-11-01 11:48 UTC · fail · 🔍 Syntax Check & SDK3 Validation failed on master (syntax-check / Check GitHub Actions policy: no-log)

## Santé (7 jours)

- Combinaisons du paquet publié (platform-budget run 41441857967 du 2026-11-02) : **19943** / 17000 (marge -2943) ; plus gros driver climate_sensor = 1768 / 1008 (marge -760)
- Combinaisons brutes des sources (avant élagage prepare-publish, indicatif) : 844498 ; plus gros driver switch_1gang = 141934 ; 41 driver(s) au-dessus de 1008 avant élagage.
- Plafonds actifs dans auto-publish-on-push.yml : total 15500, par driver 1500, top-up 20000.
- Workflows rattrapés par une simple relance (instables) : aucun
- Échecs répétés (même signature ≥ 2) : Node 22 runtime tests 6e84c480a105 ×10, Node 22 runtime tests 5be26e541885 ×6, Node 22 runtime tests 4b363edeecc7 ×8, Node 22 runtime tests 351d901e2c87 ×14, Node 22 runtime tests 57f650364735 ×8, 🤖 Auto-Fix + Publish Pipeline ae9f4ef5384b ×2, 🤖 Auto-Fix + Publish Pipeline 3eafa3e251a8 ×4, 🛡️ Unified CI/CD Orchestrator a70346f68e80 ×2, 🛡️ Unified CI/CD Orchestrator a089ee206a72 ×2, 🛡️ Unified CI/CD Orchestrator d2c3bf9ae874 ×2, code-quality d9277ed3905f ×2, code-quality d1ec9f0993a2 ×2, code-quality fb19cc18274b ×2, code-quality 2aac89176943 ×2, 🔍 Syntax Check & SDK3 Validation 4343ee8f200b ×4, 🤖 Daily Digest 28d56709ef60 ×4, 🤖 Daily Digest 88dfdae1295f ×4, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 7eb76cc4ded8 ×2, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 64478740eb3e ×2, 🚦 PR Gate d4d191a21402 ×2
- Watchdog : 61 workflows planifiés, 2 alerte(s)
  - repeated-failure `.github/workflows/node22-tests.yml` : 6 failures in 72 h: Node 22 runtime tests failed on master (test / Full suite on Node 22: code-or-test)
  - repeated-failure `.github/workflows/node22-tests.yml` : 4 failures in 72 h: Node 22 runtime tests failed on master (test / Full suite on Node 22: no-log)

## Candidats de réponse (rien n'est publié automatiquement)

Aucun.

## Journal

48 ligne(s) sur 72 h dans `data/progress/automation-journal.jsonl`.

