# 🚀 Tuya Light - Version Simplifiée

## 📋 Description

Version simplifiée du projet `com.tuya.zigbee` sans automatisation complexe, optimisée pour une utilisation directe.

## 🌟 Fonctionnalités

- **Drivers SDK3** : Support complet des appareils Tuya Zigbee
- **Installation simple** : Prêt à l'utilisation immédiate
- **Documentation claire** : Guides d'installation et d'utilisation
- **Support communautaire** : Issues et contribution ouverts

## 🛠️ Installation

```bash
# Cloner le repository
git clone https://github.com/dlnraja/com.universaltuyazigbee.device.git

# Basculer sur la branche tuya-light
git checkout tuya-light

# Installer les dépendances
npm install

# Valider le projet
npm run validate
```

## 📁 Structure

```
tuya-light/
├── drivers/sdk3/          # Drivers Homey SDK3
├── package.json           # Configuration npm
├── app.json              # Configuration Homey
└── README.md             # Documentation
```

## 🔧 Scripts Disponibles

```bash
npm run build          # Compiler le projet
npm run test           # Exécuter les tests
npm run validate       # Valider le projet
npm run deploy         # Déployer sur Homey
```

## 📊 Drivers Disponibles

- **Capteurs** : Température, humidité, mouvement
- **Interrupteurs** : Prises intelligentes, interrupteurs
- **Éclairage** : Ampoules RGB, variateurs
- **Capteurs** : Fumée, eau, porte/fenêtre

## 🤝 Contribution

Voir `docs/CONTRIBUTING.md` pour les guidelines de contribution.

## 📄 Licence

MIT License - Voir `LICENSE` pour plus de détails.

---

**Version** : 1.0.19  
**Branche** : tuya-light  
**Auteur** : Dylan Rajasekaram  
**Support** : [GitHub Issues](https://github.com/dlnraja/com.universaltuyazigbee.device/issues)
