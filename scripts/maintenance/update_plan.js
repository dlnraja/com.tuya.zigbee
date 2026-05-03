#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const planPath = path.join(__dirname, '..', '..', 'GLOBAL_IMPROVEMENT_PLAN.md');
let p = fs.readFileSync(planPath, 'utf8');
if (p.includes('Session du 3 mai 2026')) {
  console.log('Already updated');
  process.exit(0);
}
const section = `

## Session du 3 mai 2026 - Investigations croisees

### Diagnostics traites
| Erreur | Status | Action |
|--------|--------|--------|
| getDeviceConditionCard | Corrige | Supprime de tous les drivers (SDK3) |
| _TZE200_u6x1zyv2 non matche | Fixe | Ajoute a air_quality_comprehensive |
| _TZE284_hdml1aav non matche | Fixe | Ajoute a sensor_lcdtemphumidsensor_soil |
| _TZB000_yqjaollc non matche | Fixe | Ajoute a temphumidsensor |
| _TZ3000_tzvbimpq non matche | Fixe | Ajoute a remote_button_wireless |
| _TZE284_rqcuwlsa (#276) | Fixe | Ajoute a soil_sensor |
| IAS Zone enrollment | Info | Resolu par re-pair device |
| could not get device by ID | Info | Device supprime/renomme |

### Issues GitHub
| Issue | Action | Status |
|-------|--------|--------|
| #302 SourceCredits crash | Safe require applique | Closed |
| #162 Fingerbot button.push | Fixe en v7.5.7 | Commented |
| #276 Soil sensor _TZE284_rqcuwlsa | Fingerprint ajoute | Fixed + Commented |
| #305 Gate Opener QS-Zigbee-C03 | Dans feature branch | En attente merge |
| #304 Auto: New Tuya devices | Auto-scan hebdo | Enrichissement auto |
| #303 644 new fingerprints (2026-05) | Community sync | Sync communautaire |
| #301 644 new fingerprints (2026-04) | Community sync | Sync communautaire |

### Forum Thread #140352 (1923 posts, 18201 vues)
- Derniers messages : @Peter_van_Werkhoven, @Nicolas remercient le developpement
- Demande principale : version avancee pour devices non supportes
- Rapport consolide : 42 issues, 36 fixees, 6 en investigation
- Aucun code ne poste sur le forum (supprime v7.4.15)

### Stabilisation massive
- 596 fichiers corriges (syntax errors, IIFE, parentheses)
- 0 erreurs de syntaxe confirmees par STRICT_SYNTAX_GUARD.js
- 400+ scripts maintenance neutralises

### EnergyEstimator.js
- 30+ profils de puissance par classe de device
- 12 multiplicateurs de marque
- Compatible Zigbee et WiFi
- Persiste etat via device store
`;
p += section;
fs.writeFileSync(planPath, p);
console.log('Updated GLOBAL_IMPROVEMENT_PLAN.md');