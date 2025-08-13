# 📋 TODOs RÉCUPÉRÉS APRÈS BSOD - v3.3

## 🚨 **TÂCHES CRITIQUES EN SUSPENS**

### 1. **CORRECTION DES IMAGES MANQUANTES**
- [ ] `generic_zigbee_switch_1gang` - Images PNG manquantes (75x75, 500x500)
- [ ] Vérifier tous les drivers pour assets complets

### 2. **MIGRATION SDK3+ COMPLÈTE**
- [ ] Créer dossiers "manques" : `__incoming__`, `__unknown__`, `__staging__`, `__deprecated__`
- [ ] Déplacer drivers non-validés vers `__staging__`
- [ ] Migrer structure vers `tuya_zigbee/` et `zigbee/`
- [ ] Implémenter overlays (brands/categories)

### 3. **CORRECTION DES NOMS (563 invalides)**
- [ ] Renommer tous les dossiers avec noms lisibles
- [ ] Supprimer préfixes `TSxxxx` des noms de dossiers
- [ ] Conserver `TSxxxx` dans `metadata.json.model_code`
- [ ] Appliquer format : `<device_type>_<form_factor>_<variant>`

### 4. **VALIDATION SDK3+ COMPLÈTE**
- [ ] Vérifier `driver.compose.json` pour tous les drivers
- [ ] Valider `metadata.json` avec schémas
- [ ] Contrôler tailles images (75x75, 500x500, 1000x1000)
- [ ] Vérifier `icon.svg` vectoriel

### 5. **CI/CD ET WORKFLOWS**
- [ ] Créer `tools/build-tools.js` (validation structure)
- [ ] Ajouter GitHub Actions (validate + pages)
- [ ] Workflow ncu hebdomadaire (remplace Dependabot)
- [ ] Validation automatique des schémas JSON

### 6. **DASHBOARD ET DOCUMENTATION**
- [ ] Générer `docs/data/*.json` (drivers, metrics, overlays)
- [ ] Créer dashboard GitHub Pages complet
- [ ] README multilingue (EN→FR→NL→TA)
- [ ] Matrice des drivers avec filtres

### 7. **VERSION ET CHANGELOG**
- [ ] Bump `app.json.version` → "3.3"
- [ ] Mettre à jour `CHANGELOG.md`
- [ ] Commit final avec tag v3.3
- [ ] Push sur master

### 8. **TESTS ET VALIDATION**
- [ ] Tests de tous les workflows
- [ ] Validation Homey SDK3
- [ ] Test de pairing et fallback
- [ ] Vérification des liens et chemins

## 📊 **STATISTIQUES ACTUELLES**

- **Drivers valides** : 219/782 (28%)
- **Noms invalides** : 563/782 (72%)
- **Structure** : ✅ OK
- **Overlays** : 8/8 ✅
- **Images manquantes** : 1 driver

## 🎯 **PRIORITÉS DE RÉCUPÉRATION**

1. **URGENT** : Images manquantes
2. **HAUTE** : Migration SDK3+ structure
3. **MOYENNE** : Correction des noms
4. **BASSE** : CI/CD et documentation

## 🚀 **PLAN D'EXÉCUTION**

**Phase A** : Correction immédiate (images + structure)  
**Phase B** : Migration complète (noms + validation)  
**Phase C** : CI/CD et workflows  
**Phase D** : Documentation et version finale  

---
**📅 Créé** : 13/08/2025 17:20  
**🎯 Objectif** : Récupération complète post-BSOD  
**✅ Statut** : TODOs récupérés et planifié
