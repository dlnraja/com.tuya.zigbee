# 🚀 MEGA-PROMPT v3.4.0 - UNIVERSAL TUYA ZIGBEE PROJECT

## 🎯 **OBJECTIF PRINCIPAL**
Rebuild, enrichir et compléter le projet "Universal Tuya Zigbee" Homey SDK3 avec l'architecture Source-of-Truth (SOT) complète et le dashboard GitHub Pages fonctionnel.

## 🏗️ **ARCHITECTURE ACTUELLE (v3.4.0)**

### **Structure Source-of-Truth (SOT)**
```
/catalog/
├── categories.json          # Définitions des catégories
├── vendors.json            # Définitions des vendeurs
├── {category}/
    ├── {vendor}/
        ├── {productnontechnique}/
            ├── compose.json    # Configuration Homey
            ├── zcl.json        # Clusters ZCL
            ├── tuya.json       # Points de données Tuya
            ├── brands.json     # Marques et white-labels
            ├── sources.json    # Sources d'intégration
            ├── notes.md        # Notes et documentation
            └── assets/         # Icônes et images
```

### **Structure Drivers Homey**
```
/drivers/
├── _common/                 # Utilitaires partagés
├── tuya_zigbee/            # Drivers Tuya spécifiques
│   ├── __incoming__/       # Nouveaux drivers
│   ├── __staging__/        # En cours de validation
│   ├── __unknown__/        # À classifier
│   ├── __deprecated__/     # Obsolètes
│   ├── __generic__/        # Templates génériques
│   ├── __templates__/      # Modèles de base
│   ├── brands/             # Marques spécifiques
│   ├── categories/         # Catégories spécifiques
│   └── models/             # Modèles spécifiques
└── zigbee/                 # Drivers Zigbee purs
    ├── __incoming__/
    ├── __staging__/
    ├── __unknown__/
    ├── __deprecated__/
    ├── __generic__/
    ├── __templates__/
    ├── brands/
    ├── categories/
    └── models/
```

### **Dashboard GitHub Pages**
```
/docs/
├── index.html              # Interface principale
├── css/style.css          # Styling moderne
├── js/app.js              # Logique dynamique
├── lang/                  # Support multilingue
│   ├── en.json           # Anglais
│   ├── fr.json           # Français
│   ├── nl.json           # Néerlandais
│   └── ta-LK.json        # Tamil (Sri Lanka)
└── data/                  # Données générées
    ├── drivers.json       # Liste des drivers
    ├── sources.json       # Sources d'intégration
    ├── kpi.json          # Indicateurs clés
    └── categories.json    # Répartition par catégorie
```

## 🔄 **ALGORITHMES D'ENRICHISSEMENT**

### **1. SCAN ET ANALYSE**
- **Scan du catalog SOT** : Détection des produits manquants
- **Scan des drivers** : Validation de la structure et des assets
- **Analyse des sources** : Intégration des bases externes
- **Détection des doublons** : Élimination des répétitions

### **2. ENRICHISSEMENT AUTOMATIQUE**
- **Génération des drivers** : Création depuis le catalog SOT
- **Validation des assets** : Vérification des images et icônes
- **Mise à jour des métadonnées** : Enrichissement des descriptions
- **Génération des composables** : Création des fichiers Homey

### **3. VALIDATION ET QUALITÉ**
- **Tests de structure** : Vérification de l'architecture
- **Validation des assets** : Contrôle des dimensions et formats
- **Tests de compatibilité** : Vérification SDK3+
- **Génération des rapports** : Documentation des modifications

## 📊 **MÉTRIQUES ET KPIs**

### **Indicateurs de Progression**
- **Total Drivers** : Nombre total de drivers valides
- **Assets Completeness** : Pourcentage d'assets complets
- **Categories Coverage** : Couverture des catégories
- **Vendors Coverage** : Couverture des vendeurs
- **Integration Sources** : Pourcentage d'intégration par source

### **Sources d'Intégration**
- **Zigbee2MQTT** : Documentation officielle
- **Blakadder Database** : Base de données communautaire
- **Homey Forum** : Discussions et retours utilisateurs
- **JohanBenz Repos** : Repositories GitHub
- **Tuya Official** : Documentation officielle Tuya

## 🎯 **OBJECTIFS D'ENRICHISSEMENT**

### **Phase 1 : Structure et Validation**
- [ ] Validation de l'architecture SOT
- [ ] Nettoyage des drivers existants
- [ ] Création des dossiers de classification
- [ ] Migration des drivers vers la nouvelle structure

### **Phase 2 : Enrichissement des Données**
- [ ] Scan et analyse des sources externes
- [ ] Intégration des nouvelles données
- [ ] Génération des drivers manquants
- [ ] Enrichissement des métadonnées

### **Phase 3 : Validation et Déploiement**
- [ ] Tests de compatibilité SDK3+
- [ ] Validation des assets et images
- [ ] Génération des rapports finaux
- [ ] Déploiement du dashboard

## 🔧 **OUTILS ET SCRIPTS**

### **Scripts Principaux**
- `scripts/build/export_dashboard_data.mjs` : Export des données dashboard
- `scripts/build/validate_assets.mjs` : Validation des assets
- `scripts/build/generate_from_catalog.mjs` : Génération des drivers
- `scripts/enrich-drivers.js` : Enrichissement des drivers existants

### **Workflows GitHub Actions**
- `.github/workflows/build_dashboard.yml` : Build et déploiement dashboard
- `.github/workflows/update_readme_stats.yml` : Mise à jour des stats
- `.github/workflows/validate.yml` : Validation du projet

## 📋 **RÈGLES ET CONTRAINTES**

### **Règles de Nommage**
- **Catalog SOT** : `{category}/{vendor}/{productnontechnique}/`
- **Drivers Homey** : `{vendor}_{category}_{productnontechnique}_{techcode}/`
- **Assets** : `icon.svg`, `small.png` (75x75), `large.png` (500x500), `xlarge.png` (1000x1000)

### **Contraintes SDK3+**
- **Fichiers requis** : `driver.compose.json`, `driver.js`, `device.js`
- **Structure** : Utilisation de `ZigBeeDevice` et `registerCapability`
- **Assets** : Images sur fond blanc, dimensions exactes respectées

### **Politique d'Enrichissement**
- **Enrichment-Max** : Ne jamais supprimer les fichiers valides
- **Migration intelligente** : Préservation des données existantes
- **Validation continue** : Tests à chaque étape
- **Documentation complète** : Traçabilité des modifications

## 🚀 **EXÉCUTION DU MEGA-PROMPT**

### **Étapes d'Exécution**
1. **Analyse de l'état actuel** : Scan complet du projet
2. **Validation de l'architecture** : Vérification de la structure
3. **Enrichissement des données** : Intégration des sources externes
4. **Génération des drivers** : Création depuis le catalog SOT
5. **Validation et tests** : Contrôle qualité complet
6. **Génération des rapports** : Documentation des modifications
7. **Déploiement** : Mise à jour du dashboard et des stats

### **Résultats Attendus**
- **Architecture SOT** : Complète et validée
- **Drivers** : Tous générés et validés
- **Assets** : 100% complets et conformes
- **Dashboard** : Fonctionnel avec stats en temps réel
- **Documentation** : Complète et à jour

---

**📅 Version** : 3.4.0  
**👤 Auteur** : dlnraja  
**🎯 Statut** : PRÊT POUR EXÉCUTION  
**🚀 Mode** : ENRICHISSEMENT COMPLET
