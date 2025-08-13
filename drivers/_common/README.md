# 🔧 Common Utilities - Universal Tuya Zigbee

## 📁 Structure

Ce dossier contient les utilitaires partagés entre tous les drivers :

- **`lib/`** : Fonctions utilitaires communes
- **`clusters/`** : Helpers pour les clusters ZCL
- **`capabilities/`** : Mappings des capacités Homey

## 🎯 Utilisation

```javascript
// Dans un driver
const { helpers } = require('../../_common/lib/helpers');
const { clusterHelpers } = require('../../_common/clusters/cluster-helpers');
```

## 📋 Fonctionnalités

- **Helpers communs** : Logging, validation, erreurs
- **Cluster ZCL** : Bindings, attributs, commandes
- **Capacités** : Mappings standardisés Homey
- **Validation** : Schémas et contraintes

---

**📅 Créé** : 13/08/2025 22:44  
**🎯 Objectif** : Utilitaires partagés pour tous les drivers  
**✅ Statut** : Structure créée
