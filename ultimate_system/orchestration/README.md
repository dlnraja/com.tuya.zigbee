# orchestration

Scripts d'orchestration et lancement

## Fichiers dans cette catégorie (5)

- **COMPLETE_ALL_TASKS.js**
- **RELANCE_COMPLETE.js**
- **SUPER_RELANCE.js**
- **Ultimate_Quantified_Orchestrator.js** — orchestrateur maître relançant les phases jusqu'à conformité.
- **modules/** — modules spécialisés (`Audit_System.js`, `Data_Enricher.js`, `Driver_Classifier_Corrector.js`, `Publisher_CI.js`).

## Sous-répertoires complémentaires

- **state/** — sorties JSON persistées (audit, enrichissement, classification, publication, résumé).
- **archives/** — dumps git redondés et anonymisés générés par `Audit_System.js`.
- **scripts/** — utilitaires secondaires déplacés hors de la racine (`ultimate_system/scripts/...`).

## Règle Mono-Fabricant

Chaque `driver.compose.json` doit contenir un unique `zigbee.manufacturerName` (ou famille connexe). Les rapports dans `state/driver_classifier_state.json` permettent de vérifier cette contrainte.

### Utilisation

```bash
node ultimate_system/orchestration/Ultimate_Quantified_Orchestrator.js
```

Le cycle exécute successivement les phases d'audit, d'enrichissement, de correction et de publication en consignant les métriques dans `ultimate_system/orchestration/state/`.

---
*Généré automatiquement par REORGANIZE_APPLY*
*Date: 2025-09-29T14:33:05.802Z*
