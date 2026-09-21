# P2664 Bastien remotes + flows — treat 2026-09-22

## Diags treated
| Log ID | App | User message | Root |
|--------|-----|--------------|------|
| e8d98608 | bastien 1.0.7 | Bug flow et device wrong device | remote_button_wireless_wall 1-gang for 3-btn sticky |
| 4d4e1684 | bastien 1.0.14 | bouton 3ch ne fonctionne pas | wrong driver / Virtual |
| 4c0d232b | bastien 1.0.34 | 3ch + app click once then error | debounce + onoff phantom + tip lag |
| 52ef684a | bastien 1.0.34 | Aucun bouton ne fonctionne | flow double-register + Virtual |
| be119f76 | bastien 1.0.34 | probleme de channel | sub_capability boolean (fixed P2659 ≥1.0.35) |

## Live fleet (snapshot)
- `_TZ3000_vsxvaj9i` = Homey Virtual « Appareil Zigbee » ← MUST re-pair as button_wireless_3
- Flows Test/Test1/Test2 point at deleted devices (8dbf4762…) or Virtual onoff_true

## Code (1.0.39 / BOTH)
- ButtonDevice typed debounce + 120ms for scene remotes
- remote_button_wireless_wall soft multi-EP hybrid gap-fill
- FeatureFlowCards idempotent register
- learnmode teaches Button pressed → light

## User
1. Update Bastien → 1.0.39
2. Delete Virtual telecommande; pair Zigbee Bastien → Bouton sans fil 3
3. Delete orphan Flows; recreate: Bouton appuye (1/2/3) → Allumer eclairage
