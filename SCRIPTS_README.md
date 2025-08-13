// Scripts Tuya Zigbee - Nouvelle Architecture JavaScript

#// 🚀 **MEGA-PROMPT ULTIMATE**

Tous les scripts JavaScript ont été convertis en JavaScript pour une meilleure compatibilité et performance.

#// 📁 **Structure des Scripts**

##// **Script Principal**
- **`mega-verify-enrich.js`** - Orchestrateur principal qui exécute toute la pipeline

##// **Gestion des Backups et Sources**
- **\normalize-backup.js`** - Normalise les backups ZIP dans `.backup/zips/`
- **\restore-tmp-sources.js`** - Restaure `.tmp_tuya_zip_work` depuis les backups
- **`ingest-tuya-zips.js`** - Ingeste les ZIPs Tuya pour extraction des drivers

##// **Réorganisation des Drivers**
- **\reorganize-drivers.js`** - Réorganisation complète vers `domain/category/vendor/model`
- **\reorganize-drivers-ultimate.js`** - Version avancée de réorganisation

##// **Migration et Enrichissement**
- **`migrate-meshdriver-to-zigbeedriver.js`** - Migration meshdriver → zigbeedriver
- **`enrich-drivers.js`** - Enrichit les drivers avec les métadonnées des backups
- **`verify-coherence-and-enrich.js`** - Vérifie la cohérence et enrichit

##// **Génération et Maintenance**
- **`assets-generate.js`** - Génère les icônes SVG manquantes
- **`create-small-png.js`** - Crée le PNG small requis par Homey
- **`fix-package.js`** - Corrige et optimise package.json
- **`update-readme.js`** - Met à jour README.md
- **\reindex-drivers.js`** - Réindexe tous les drivers

##// **Nettoyage**
- **`cleanup-obsolete.js`** - Supprime les scripts obsolètes et JavaScript

#// 🎯 **Structure des Drivers**

```
drivers/
├── tuya/                    // Domaine Tuya
│   ├── light/              // Catégorie
│   │   ├── tuya/           // Vendor
│   │   │   └── model-1/    // Modèle
│   │   └── aqara/
│   │       └── model-2/
│   └── sensor/
│       └── generic/
│           └── model-3/
└── zigbee/                  // Domaine Zigbee
    ├── plug/
    │   └── sonoff/
    │       └── model-4/
    └── switch/
        └── ikea/
            └── model-5/
```

#// 🔧 **Utilisation**

##// **Exécution Complète**
```bash
node scripts/mega-verify-enrich.js
```

##// **Exécution Individuelle**
```bash
// Normaliser backups
node scripts/normalize-backup.js

// Restaurer sources temporaires
node scripts/restore-tmp-sources.js

// Réorganiser drivers
node scripts/reorganize-drivers.js

// Migrer vers zigbeedriver
node scripts/migrate-meshdriver-to-zigbeedriver.js

// Enrichir drivers
node scripts/enrich-drivers.js --apply

// Générer assets
node scripts/assets-generate.js

// Vérifier cohérence
node scripts/verify-coherence-and-enrich.js
```

#// 🌍 **Variables d'Environnement**

- **`DO_MIGRATE=1`** - Active la migration meshdriver → zigbeedriver (défaut: 1)
- **`SKIP_NPM=1`** - Saute npm install (défaut: 1)
- **`SKIP_VALIDATE=1`** - Saute la validation Homey (défaut: 1)
- **`SKIP_RUN=1`** - Saute l'exécution (défaut: 1)
- **`SKIP_GIT_PUSH=1`** - Saute le push Git (défaut: 1)
- **`PERSIST_TMP=1`** - Garde `.tmp_tuya_zip_work` (défaut: 1)
- **`KEEP_BACKUP=1`** - Garde `.backup` (défaut: 1)

#// 📋 **Pipeline Complète**

1. **Normalisation des backups** → `.backup/zips/`
2. **Restauration des sources** → `.tmp_tuya_zip_work/`
3. **Aplatissement des variants** → Fusion dans le parent
4. **Réorganisation** → `domain/category/vendor/model`
5. **Migration** → meshdriver → zigbeedriver
6. **Enrichissement** → Métadonnées depuis backups
7. **Vérification** → Cohérence et validation
8. **Génération** → Assets manquants
9. **Réindexation** → Index des drivers
10. **Mise à jour** → README et documentation
11. **Commit Git** → Sauvegarde locale
12. **Rapport final** → Statut complet

#// 🎨 **Caractéristiques**

- ✅ **100% JavaScript** - Plus de JavaScript
- ✅ **Structure hiérarchique** - Domain/Category/Vendor/Model
- ✅ **Séparation automatique** - Tuya vs Zigbee
- ✅ **Persistance des sources** - `.tmp_tuya_zip_work` jamais supprimé
- ✅ **Backups sécurisés** - `.backup/zips/` préservé
- ✅ **Migration automatique** - meshdriver → zigbeedriver
- ✅ **Génération d'assets** - Icônes SVG et PNG
- ✅ **Validation complète** - Cohérence et métadonnées
- ✅ **Documentation automatique** - README et changelog

#// 🚨 **Notes Importantes**

- **`.tmp_tuya_zip_work`** est **PERSISTANT** et ne doit jamais être supprimé
- **`.backup/zips/`** contient tous les ZIPs Tuya et est **PRÉSERVÉ**
- La structure finale est **`drivers/<domain>/<category>/<vendor>/<model>/`**
- Tous les **variants** sont **aplatis** et **fusionnés** dans le parent
- La **migration meshdriver** est **automatique** et **sécurisée**

#// 🔄 **Mise à Jour**

Pour mettre à jour les scripts :

```bash
// Nettoyer les scripts obsolètes
node scripts/cleanup-obsolete.js

// Exécuter le mega-prompt
node scripts/mega-verify-enrich.js
```

---

**📅 Créé**: 29/07/2025  
**🎯 Objectif**: Conversion complète JavaScript → JavaScript  
**🚀 Statut**: ARCHITECTURE COMPLÈTE ET OPÉRATIONNELLE
