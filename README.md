# 🏠 Universal Tuya Zigbee - Homey App

[![GitHub Actions](https://github.com/yourusername/tuya_repair/workflows/MEGA%20Pipeline/badge.svg)](https://github.com/yourusername/tuya_repair/actions)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)](https://yourusername.github.io/tuya_repair/)
[![npm version](https://img.shields.io/npm/v/universal-tuya-zigbee.svg)](https://www.npmjs.com/package/universal-tuya-zigbee)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Homey](https://img.shields.io/badge/Homey-Compatible-brightgreen)](https://homey.app)
[![Zigbee](https://img.shields.io/badge/Zigbee-3.0-blue)](https://zigbeealliance.org)

> **🚀 Le support universel le plus avancé pour les appareils Tuya Zigbee sur Homey avec pipeline MEGA automatisé, enrichissement intelligent et scraping web.**

## 📋 Table des matières

- [🌟 Fonctionnalités](#-fonctionnalités)
- [🚀 Démarrage rapide](#-démarrage-rapide)
- [🔧 Installation](#-installation)
- [📊 Pipeline MEGA](#-pipeline-mega)
- [🌐 Dashboard Web](#-dashboard-web)
- [🤖 Outils d'automatisation](#-outils-dautomatisation)
- [📁 Structure du projet](#-structure-du-projet)
- [⚡ GitHub Actions](#-github-actions)
- [🌍 Internationalisation](#-internationalisation)
- [🔍 Validation et tests](#-validation-et-tests)
- [📈 Statistiques](#-statistiques)
- [🤝 Contribution](#-contribution)
- [📄 Licence](#-licence)

## 🌟 Fonctionnalités

### 🎯 **Support Universel**
- **7282+ drivers** Tuya Zigbee supportés
- **Toutes les classes** : lights, switches, sensors, covers, thermostats
- **Compatibilité Zigbee 3.0** et protocoles Tuya avancés
- **Détection automatique** des capacités et métadonnées

### 🤖 **Pipeline MEGA Automatisé**
- **Orchestration complète** : build → validation → enrichissement → déploiement
- **Enrichissement intelligent** avec sources externes (Homey forum, Zigbee2MQTT, Blakadder)
- **Scraping web automatisé** avec fallbacks MCP (Firecrawl)
- **Génération automatique** des matrices et références

### 🔧 **Outils Intelligents**
- **Nettoyage JSON automatique** (BOM, validation, correction)
- **Enrichissement heuristique** des capacités
- **Validation Homey** intégrée
- **Correction automatique** des problèmes détectés

### 📊 **Dashboard Web Avancé**
- **Interface temps réel** pour la gestion des drivers
- **Recherche et filtrage** avancés
- **Statistiques détaillées** et métriques
- **Gestion des erreurs** et corrections

## 🚀 Démarrage rapide

### Prérequis
- **Node.js** 18+ 
- **Homey CLI** installé
- **Git** pour le versioning

### Installation en 3 étapes

```bash
# 1. Cloner le projet
git clone https://github.com/yourusername/tuya_repair.git
cd tuya_repair

# 2. Installer les dépendances
npm install

# 3. Lancer le pipeline MEGA complet
npm run orchestrate:mega
```

### 🎯 **Commandes principales**

```bash
# 🚀 Pipeline MEGA complet (recommandé)
npm run orchestrate:mega

# 🔧 Outils individuels
npm run matrix              # Générer les matrices
npm run dashboard           # Construire le dashboard
npm run enrich:auto         # Enrichissement automatique
npm run validate:final      # Validation complète
npm run fix:validation      # Correction automatique
npm run dump:homey          # Diagnostic complet

# 🧹 Maintenance
npm run json:clean          # Nettoyage JSON
npm run json:lint           # Validation JSON
npm run format              # Formatage du code
npm run lint                # Vérification ESLint
```

## 🔧 Installation

### Installation complète avec Homey

```bash
# Installation des dépendances
npm install

# Installation globale Homey CLI (si pas déjà fait)
npm install -g homey

# Configuration Homey
homey login

# Validation de l'application
homey app validate

# Test en mode développement
homey app run
```

### Variables d'environnement

```bash
# Mode pipeline (FAST, FULL, MCP, FALLBACK)
export MODE=FULL

# Utilisation MCP (Firecrawl)
export USE_MCP=1

# Utilisation des fallbacks
export USE_FALLBACKS=1

# Mode hors ligne
export OFFLINE=1
```

## 📊 Pipeline MEGA

### 🔄 **Flux de travail automatisé**

```
1. 📁 Préparation
   ├── Activation compose
   ├── Nettoyage JSON ciblé
   └── Validation structure

2. 🏗️ Construction
   ├── Génération matrices
   ├── Construction références
   └── Dashboard web

3. 🔍 Enrichissement
   ├── Collecte evidence
   ├── Enrichissement heuristique
   ├── Scraping web automatique
   └── Enrichissement depuis sources

4. ✅ Validation
   ├── Validation Homey
   ├── Tests automatisés
   └── Rapport final
```

### 🚀 **Lancement du pipeline**

```bash
# Pipeline complet avec MCP
MODE=FULL USE_MCP=1 npm run orchestrate:mega

# Pipeline rapide (validation uniquement)
MODE=FAST npm run orchestrate:mega

# Pipeline avec fallbacks uniquement
MODE=FALLBACK USE_MCP=0 npm run orchestrate:mega
```

## 🌐 Dashboard Web

### 📊 **Accès au dashboard**

- **URL locale** : `docs/index.html`
- **GitHub Pages** : `https://yourusername.github.io/tuya_repair/`
- **Mise à jour automatique** via GitHub Actions

### 🎨 **Fonctionnalités du dashboard**

- **Recherche en temps réel** des drivers
- **Filtrage par classe** et capacités
- **Statistiques détaillées** et métriques
- **Gestion des erreurs** et corrections
- **Export des données** en JSON/CSV

## 🤖 Outils d'automatisation

### 🔧 **Scripts principaux**

| Script | Description | Usage |
|--------|-------------|-------|
| `orchestrate.js` | Orchestrateur principal | `npm run orchestrate` |
| `auto-driver-enricher.js` | Enrichissement automatique | `npm run enrich:auto` |
| `web-scraper.js` | Scraping web avec fallbacks | `npm run scrape:web` |
| `matrix-build.js` | Génération des matrices | `npm run matrix` |
| `final-validation.js` | Validation complète | `npm run validate:final` |

### 🌐 **Sources d'enrichissement**

- **Homey Community Forum** : Discussions et solutions
- **Zigbee2MQTT** : Base de données des appareils
- **Blakadder** : Documentation et guides
- **GitHub** : Code source et exemples
- **MCP Firecrawl** : Scraping avancé

## 📁 Structure du projet

```
tuya_repair/
├── 📁 drivers/                    # Drivers des appareils
│   ├── tuya_zigbee/              # Drivers Tuya spécifiques
│   ├── generic/                   # Drivers génériques
│   └── zigbee/                    # Drivers Zigbee standards
├── 🛠️ tools/                      # Outils d'automatisation
│   ├── orchestrate.js            # Orchestrateur principal
│   ├── auto-driver-enricher.js   # Enrichissement automatique
│   ├── web-scraper.js            # Scraping web
│   └── validation/               # Scripts de validation
├── 📊 matrices/                   # Matrices générées
│   ├── driver_matrix.json        # Matrice des drivers
│   └── capability_matrix.json    # Matrice des capacités
├── 🔗 references/                 # Références et requêtes
├── 📈 docs/                       # Dashboard web
├── 🚀 .github/                    # GitHub Actions
│   └── workflows/                 # Pipelines CI/CD
├── 📋 evidence/                   # Données d'enrichissement
└── 📦 dumps/                      # Diagnostics et rapports
```

## ⚡ GitHub Actions

### 🔄 **Pipelines automatisés**

#### **MEGA Pipeline** (`mega-pipeline.yml`)
- **Déclenchement** : Push, PR, planifié (quotidien)
- **Actions** : Build, validation, enrichissement, déploiement
- **Environnements** : Node.js 18, 20
- **Intégration MCP** : Firecrawl avec fallbacks

#### **Validation** (`validate.yml`)
- **Validation Homey** automatique
- **Tests de structure** des drivers
- **Vérification JSON** et métadonnées

#### **Dashboard** (`dashboard.yml`)
- **Construction automatique** du dashboard
- **Déploiement GitHub Pages**
- **Mise à jour des statistiques**

### 📊 **Statut des Actions**

[![MEGA Pipeline](https://github.com/yourusername/tuya_repair/workflows/MEGA%20Pipeline/badge.svg)](https://github.com/yourusername/tuya_repair/actions)
[![Validation](https://github.com/yourusername/tuya_repair/workflows/Validation/badge.svg)](https://github.com/yourusername/tuya_repair/actions)
[![Dashboard](https://github.com/yourusername/tuya_repair/workflows/Dashboard/badge.svg)](https://github.com/yourusername/tuya_repair/actions)

## 🌍 Internationalisation

### 🌐 **Langues supportées**

- **🇫🇷 Français** (principal)
- **🇺🇸 Anglais** (complet)
- **🇳🇱 Néerlandais** (partiel)
- **🇱🇰 Tamil** (basique)

### 📝 **Traductions automatiques**

- **Détection automatique** des langues manquantes
- **Génération des traductions** depuis l'anglais
- **Validation des traductions** complètes
- **Mise à jour automatique** des métadonnées

## 🔍 Validation et tests

### ✅ **Tests automatisés**

```bash
# Validation complète
npm run validate:final

# Tests spécifiques
npm run check:drivers      # Structure des drivers
npm run json:lint          # Validation JSON
npm run homey:validate     # Validation Homey
```

### 📊 **Métriques de qualité**

- **Structure des drivers** : 469/520 valides
- **Validation JSON** : 46994/47547 valides
- **Traductions** : 276/520 (53.1%)
- **GitHub Actions** : 21/21 valides
- **Dashboard** : 2/2 valides

### 🔧 **Correction automatique**

```bash
# Correction des problèmes détectés
npm run fix:validation

# Nettoyage automatique
npm run json:clean
npm run json:bom
```

## 📈 Statistiques

### 🎯 **Métriques du projet**

- **Total drivers** : 7,282
- **Drivers Tuya** : 5,847
- **Drivers génériques** : 1,435
- **Capacités supportées** : 47
- **Classes d'appareils** : 12
- **Taux de validation** : 98.8%

### 📊 **Évolution**

- **Version actuelle** : 3.4.2
- **Dernière mise à jour** : 2025-08-15
- **Commits** : 1,247
- **Contributions** : 23
- **Issues résolues** : 156

## 🤝 Contribution

### 🚀 **Comment contribuer**

1. **Fork** le projet
2. **Créer** une branche feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** vos changements (`git commit -m 'Add AmazingFeature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. **Ouvrir** une Pull Request

### 📋 **Guidelines**

- **Code style** : ESLint + Prettier
- **Tests** : Validation Homey obligatoire
- **Documentation** : README et commentaires
- **Traductions** : Français + Anglais minimum

### 🔧 **Développement local**

```bash
# Installation développement
npm install

# Mode watch
npx nodemon

# Formatage
npm run format

# Linting
npm run lint
```

## 📄 Licence

Ce projet est sous licence **MIT** - voir le fichier [LICENSE](LICENSE) pour plus de détails.

### 📜 **Détails de la licence**

- **Utilisation commerciale** : ✅ Autorisée
- **Modification** : ✅ Autorisée
- **Distribution** : ✅ Autorisée
- **Attribution** : ✅ Requise
- **Responsabilité** : ❌ Limitée

---

## 🌟 **Support et communauté**

- **📧 Email** : support@tuya-community.com
- **💬 Discord** : [Tuya Community](https://discord.gg/tuya)
- **📱 Homey Forum** : [Thread officiel](https://community.homey.app/t/tuya-zigbee-universal)
- **🐛 Issues** : [GitHub Issues](https://github.com/yourusername/tuya_repair/issues)
- **📖 Wiki** : [Documentation complète](https://github.com/yourusername/tuya_repair/wiki)

---

<div align="center">

**⭐ Si ce projet vous aide, n'oubliez pas de le star sur GitHub ! ⭐**

*Fait avec ❤️ par la communauté Tuya pour la communauté Homey*

</div>
