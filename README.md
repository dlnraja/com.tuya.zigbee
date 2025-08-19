# 🚀 Tuya Zigbee Drivers for Homey SDK 3

## 📱 **Compatible Homey SDK 3**

**Version:** 3.7.0  
**Auteur:** dlnraja  
**Licence:** MIT

## 🎯 **Fonctionnalités**

- ✅ **Drivers Tuya Zigbee** complets et optimisés
- ✅ **MEGA Orchestrator** pour l'automatisation
- ✅ **SDK 3** entièrement compatible
- ✅ **Structure modulaire** et maintenable
- ✅ **Dashboard moderne** et responsive
- ✅ **Tests automatisés** et validation
- ✅ **Support multilingue** (EN/FR/NL)

## 🏗️ **Architecture**

```
📁 src/
  ├── 📁 core/          (Modules principaux)
  │   ├── orchestrator.js      (Orchestrateur principal)
  │   ├── preparation.js       (Préparation du projet)
  │   ├── validator.js         (Validation)
  │   ├── matrix-builder.js    (Construction des matrices)
  │   ├── dashboard-builder.js (Construction du dashboard)
  │   ├── enricher.js          (Enrichissement des drivers)
  │   ├── web-enricher.js      (Enrichissement web)
  │   ├── final-validator.js   (Validation finale)
  │   └── deployer.js          (Déploiement)
  ├── 📁 utils/         (Utilitaires)
  │   ├── script-converter.js  (Conversion de scripts)
  │   ├── script-consolidator.js (Consolidation)
  │   ├── enrichment-suite.js  (Suite d'enrichissement)
  │   ├── build-suite.js       (Suite de construction)
  │   └── validation-suite.js  (Suite de validation)
  ├── 📁 drivers/       (Drivers Tuya)
  │   ├── 📁 tuya/      (Drivers Tuya spécifiques)
  │   ├── 📁 zigbee/    (Drivers Zigbee génériques)
  │   └── 📁 generic/   (Drivers génériques)
  ├── 📁 homey/         (Application Homey)
  └── 📁 workflows/     (Workflows)
```

## 🚀 **Installation**

### Prérequis
- Node.js 18+ 
- Homey CLI
- Git

### Installation rapide
```bash
# Cloner le projet
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee

# Installer les dépendances
npm install

# Lancer l'application
npm start
```

## 🔧 **Scripts Disponibles**

- `npm start` - Lance l'application Homey
- `npm run orchestrate:mega` - Lance le MEGA Orchestrator
- `npm test` - Lance les tests
- `npm run validate` - Valide l'application
- `npm run enrich` - Lance l'enrichissement des drivers
- `npm run build:suite` - Lance la suite de construction

## 📊 **Dashboard & Pages**

- GitHub Pages: activées via `.github/workflows/pages.yml`.
- Une page par défaut `docs/index.html` est générée si absente.
- Dashboard local (si généré): `dist/dashboard/index.html`.
- 📊 Statut du projet
- 🔌 Drivers Tuya
- ⚡ Capacités supportées
- 🏭 Fabricants supportés
- 🔧 Architecture modulaire

## 🔌 **Drivers Supportés**

### Ampoule RGB Tuya
- **ID:** `tuya-bulb-rgb`
- **Capacités:** onoff, dim, light_hue, light_saturation
- **Modèle:** TS0505B
- **Fabricant:** Tuya

### Interrupteur Tuya
- **ID:** `tuya-switch`
- **Capacités:** onoff
- **Modèle:** TS0011
- **Fabricant:** Tuya

### Capteur de température Tuya
- **ID:** `tuya-sensor-temp`
- **Capacités:** measure_temperature
- **Modèle:** TS0601
- **Fabricant:** Tuya

## ⚡ **Capacités Supportées**

### Contrôle
- `onoff` - Allumer/éteindre
- `dim` - Variation de luminosité

### Éclairage
- `light_hue` - Variation de couleur
- `light_saturation` - Variation de saturation
- `light_temperature` - Variation de température de couleur

### Capteurs
- `measure_temperature` - Mesure de température
- `measure_humidity` - Mesure d'humidité
- `measure_pressure` - Mesure de pression

### Sécurité
- `alarm_motion` - Détection de mouvement
- `alarm_contact` - Détection d'ouverture
- `alarm_water` - Détection d'eau
- `alarm_smoke` - Détection de fumée

## 🏭 **Fabricants Supportés**

- **Tuya** - Support complet
- **Smart Life** - Compatible Tuya
- **Jinvoo** - Compatible Tuya
- **EcoSmart** - Compatible Tuya
- **Teckin** - Compatible Tuya
- **Treatlife** - Compatible Tuya
- **Gosund** - Compatible Tuya
- **Blitzwolf** - Compatible Tuya
- **Lumiman** - Compatible Tuya
- **Novostella** - Compatible Tuya

## 🔧 **MEGA Orchestrator**

Le MEGA Orchestrator est le cœur du projet qui gère automatiquement :

1. **Préparation** - Initialisation et configuration
2. **Validation** - Vérification de la cohérence
3. **Construction** - Génération des matrices et dashboard
4. **Enrichissement** - Amélioration des drivers
5. **Validation finale** - Vérification complète
6. **Déploiement** - Publication de l'application

### Utilisation
```bash
# Lancer l'orchestrateur
npm run orchestrate:mega

# Ou directement
node src/core/orchestrator.js
```

## 🧪 **Tests et Validation**

### Validation Homey
```bash
# Validation complète
npm run validate

# Validation rapide
homey app validate -l debug
```

### Tests automatisés
```bash
# Tests unitaires
npm test

# Tests d'intégration
npm run test:integration
```

## 📈 **Statistiques du Projet**

- **Version:** 3.7.0
- **Drivers:** 3+ (en cours de développement)
- **Capacités:** 15+
- **Fabricants:** 10+
- **Modules Core:** 8
- **Utilitaires:** 5+
- **Support SDK:** Homey SDK 3

## 🌐 **Support Multilingue**

Le projet supporte officiellement :
1. **English (EN)** - Langue principale
2. **Français (FR)** - Support complet
3. **Nederlands (NL)** - Support complet

## 🤝 **Contribution**

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour plus de détails.

### Comment contribuer
1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 **Licence**

MIT License - voir [LICENSE](LICENSE) pour plus de détails.

## 🆘 **Support**

- **Issues:** [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)
- **Discussions:** [GitHub Discussions](https://github.com/dlnraja/com.tuya.zigbee/discussions)
- **Wiki:** [GitHub Wiki](https://github.com/dlnraja/com.tuya.zigbee/wiki)

## 🗺️ **Roadmap**

### Version 3.8.0 (Prochaine)
- [ ] Ajout de 10+ nouveaux drivers
- [ ] Support des capteurs environnementaux
- [ ] Interface d'administration avancée
- [ ] Intégration avec Homey Cloud

### Version 4.0.0 (Future)
- [ ] Support complet Zigbee 2.0
- [ ] Interface utilisateur moderne
- [ ] Support des appareils Matter
- [ ] Intégration avec d'autres écosystèmes

## 📊 **Métriques**

![Drivers](https://img.shields.io/badge/Drivers-3+-blue)
![Version](https://img.shields.io/badge/Version-3.7.0-green)
![SDK](https://img.shields.io/badge/SDK-Homey%203-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🎉 **Remerciements**

- **Homey Team** - Pour le SDK 3
- **Tuya Community** - Pour le support continu
- **Contributeurs** - Pour leurs contributions

---

**Développé avec ❤️ par dlnraja pour la communauté Homey**


## 🧠 Innovation: Offline Inference & Confidence Scoring
This app introduces a **fully offline** inference system that helps us support more Tuya Zigbee devices **without any cloud calls**.

- **Manual sources only**: we ingest structured notes in `research/manual/*.jsonl` (no scraping).
- **Weighted confidence**: each source type has a weight; we reward **diversity** (independent domains) and **explicit DP evidence**; we penalize contradictions.
- **Safe-by-default**: proposals are written as overlays with `status:"proposed"` and are **never loaded** at runtime. Only `status:"confirmed"` overlays are shipped.
- **Reproducible**: we version snapshots of proposals, device matrix and inference inputs.

### Why it's safe
- The **runtime** loads **only** confirmed overlays.
- All inference runs in **tools** (not in app), with deterministic inputs.
- A **fallback** exists for each family (e.g., Plug, TRV, Curtain, Remote), so the app never crashes on an unknown DP.

### How to contribute
1. Add manual facts into `research/manual/*.jsonl` (see template below).
2. Run: `npm run ingest && npm run infer && npm run propose`.
3. Test with replays: `npm run replay -- file=tests/replays/sample.replay.jsonl`.
4. Validate: `npm run validate:homey`.

---

## 🧪 Innovation: Golden Replays & Chaos-DP Simulator
We ship a reproducible **replay engine** to test drivers offline with real or synthetic DP sequences.

- **Golden Replays** (`.replay.jsonl`): recorded pairing/event logs you can replay against the driver.
- **Chaos-DP**: stress sequences (bursts, out-of-order, unknown DP) to validate FIFO & debounces.

**Commands**
- `npm run replay -- file=path/to/file.replay.jsonl`
- `npm run simulate -- scenario=chaos-basic` (uses built-in scenarios)

---

## 🚀 Nouvelles Fonctionnalités

## 🔧 Améliorations Implémentées

- **ESLint** : Règles de qualité du code strictes
- **Prettier** : Formatage automatique du code
- **TypeScript** : Support du typage statique
- **Sécurité** : Validation des entrées et gestion des erreurs
- **Performance** : Optimisations et mise en cache
- **Documentation** : Génération automatique et guides interactifs

## 📊 Métriques du Projet

- **Drivers** : 4 drivers Tuya et Zigbee
- **Tests** : 3 tests automatisés
- **Documentation** : 0 pages de documentation
- **Plugins** : 0 plugins disponibles

## 🚀 Installation et Utilisation

```bash
# Installation
npm install

# Validation
npm run validate

# Tests
npm run test

# Linting
npm run lint

# Formatage
npm run format
```

## 🤝 Contribution

Ce projet utilise maintenant un système de plugins modulaire. Consultez la documentation des plugins pour contribuer.

## 📈 Roadmap

- [ ] Marketplace de drivers communautaire
- [ ] Synchronisation cloud multi-appareils
- [ ] Interface mobile native
- [ ] Intégration avec d'autres écosystèmes IoT
- [ ] Intelligence artificielle pour l'optimisation automatique

