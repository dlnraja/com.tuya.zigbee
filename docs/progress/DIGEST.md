# Digest automatique (P3048)

_Généré le 26/11/2026 16:03:52 (heure de Paris) par `scripts/automation/digest.cjs`, sans IA, sans envoi : ni mail, ni post, ni commentaire._

## Versions

| Branche | App | Version | Dernier statut Athom connu | Gate P3036 |
|---|---|---|---|---|
| master | com.dlnraja.tuya.zigbee | 9.0.1639 | 9.0.1639 #3718 test | n/a |
| stable-v5 | com.dlnraja.tuya.zigbee.stable | 5.12.568 | 5.12.549 #425 waiting_for_files | n/a |
| bastien-home | com.dlnraja.tuya.zigbee.bastien | 1.0.260 | 1.0.168 #176 test | n/a |

## Échecs CI (72 h)

- 2026-11-25 15:29 UTC · transient · Node 22 runtime tests failed on bastien-home (test / node:test strict (P3057-3): socket hang up)
- 2026-11-23 15:53 UTC · fail · Publish Zigbee Bastien failed on bastien-home (Publish Bastien house app / Publish Bastien draft → Test: unknown)
- 2026-11-23 15:53 UTC · fail · Autonomous review failed on bastien-home (semantic review / Exact couples, weakened tests, identity: unknown)
- 2026-11-23 15:53 UTC · fail · Publish Zigbee Bastien failed on bastien-home (Publish Bastien house app / Publish Bastien draft → Test: unknown)
- 2026-11-23 15:53 UTC · fail · Publish Zigbee Bastien failed on bastien-home (Publish Bastien house app / Publish Bastien draft → Test: code-or-test)
- 2026-11-23 15:52 UTC · fail · Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): code-or-test)
- 2026-11-23 15:52 UTC · fail · Homey App Validate (all levels) failed on master (validate / Publish payload build + size/structure report: code-or-test)
- 2026-11-23 15:52 UTC · fail · 🧠 Fleet Intelligent Enrich (P2372) failed on master (Fleet enrich all driver classes / Sacred + anti-bot gates: unknown)
- 2026-11-23 15:52 UTC · fail · Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): code-or-test)
- 2026-11-23 15:52 UTC · fail · CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) failed on master (self-check / Report ratchet (about headers, no pasted third-party text, report shape — may only shrink): code-or-test)
- 2026-11-23 15:52 UTC · fail · Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): code-or-test)
- 2026-11-23 15:52 UTC · fail · Autonomous review failed on master (staged publish validate / Compose, stage, validate, guard: unknown)
- 2026-11-23 15:52 UTC · fail · Auto-Publish on Push failed on master (Validate & Auto-Publish to Homey App Store / Publish to Homey App Store: code-or-test)
- 2026-11-23 15:52 UTC · fail · Autonomous review failed on bastien-home (semantic review / Exact couples, weakened tests, identity: unknown)
- 2026-11-23 15:52 UTC · fail · 🔍 Validate Homey App failed on cursor/gh632-trv602z-ltwbm23f-3270 (🔍 Validate / 🧷 Couple-removal guard (P3134, per exact mfr+pid): code-or-test)

## Santé (7 jours)

- Combinaisons du paquet publié (platform-budget run 45178968431 du 2026-11-23) : **20094** / 17000 (marge -3094) ; plus gros driver climate_sensor = 1672 / 1008 (marge -664)
- Combinaisons brutes des sources (avant élagage prepare-publish, indicatif) : 831967 ; plus gros driver switch_1gang = 143170 ; 41 driver(s) au-dessus de 1008 avant élagage.
- Plafonds actifs dans auto-publish-on-push.yml : total 15500, par driver 1500, top-up 20000.
- Workflows rattrapés par une simple relance (instables) : aucun
- Échecs répétés (même signature ≥ 2) : CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) d21382127725 ×2, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) b81376c1da58 ×8, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 7cb53e213373 ×2, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) b4093e189b03 ×2, CI self-check (actionlint + YAML + hygiene + manifest/data/lint gates) 6d2c80d14bb1 ×3, Node 22 runtime tests 985eb7e70d8b ×2, Node 22 runtime tests 5be26e541885 ×4, Node 22 runtime tests 351d901e2c87 ×6, Node 22 runtime tests 57f650364735 ×2, Node 22 runtime tests b446e2740f9d ×2, Node 22 runtime tests 4b363edeecc7 ×4, Autonomous review 2a1553568063 ×3, Autonomous review 5f7fe9c41b03 ×4, Autonomous review 6b7f6cfbf7a6 ×9, Autonomous review 943a14060e21 ×5, 🚦 PR Gate 3e56b4b8d95d ×2, 🚦 PR Gate a614dec56b7b ×4, Homey App Validate (all levels) 36aeff16af05 ×5, Homey App Validate (all levels) a3ea004b0cdf ×5, Platform Budget (P3026) eab905b90fc9 ×2, 🔍 Syntax Check & SDK3 Validation 4343ee8f200b ×2, Auto-Publish on Push 51495f0dd5d1 ×2, Publish Zigbee Bastien 350159bda9fd ×3, Promote to Live 406e02a0541f ×2, Promote to Live 24abaa36c2ec ×3
- Watchdog : 69 workflows planifiés, 2 alerte(s)
  - stale `promote-live.yml` : no scheduled run for 10 h (expected <= 8 h)
  - repeated-failure `.github/workflows/node22-tests.yml` : 3 failures in 72 h: Node 22 runtime tests failed on master (strict / node:test strict (P3057-3): code-or-test)

## Candidats de réponse (rien n'est publié automatiquement)

Aucun.

## Journal

31 ligne(s) sur 72 h dans `data/progress/automation-journal.jsonl`.

