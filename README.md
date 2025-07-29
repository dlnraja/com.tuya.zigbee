# 🏠 **Tuya Zigbee - Drivers Homey Intelligents**

## 🎯 **Vue d'ensemble**

Système intelligent de gestion et réparation des drivers Homey Zigbee/Tuya avec pipeline automatisé. Ce projet fournit une collection complète de drivers pour les appareils Tuya et Zigbee compatibles avec Homey.

## 📊 **Statistiques**

- **Total Drivers**: 47
- **Drivers Tuya**: 21
- **Drivers Zigbee**: 26
- **Catégories**: 10
- **Capabilities**: 20
- **Clusters**: 8

## 🏗️ **Architecture**

### **Protocoles Supportés**
- **Tuya**: 21 drivers
- **Zigbee**: 26 drivers

### **Catégories Principales**
- **assets**: 2 drivers
- **automation**: 1 drivers
- **climate**: 2 drivers
- **controllers**: 14 drivers
- **custom**: 1 drivers
- **generic**: 8 drivers
- **legacy**: 0 drivers
- **security**: 3 drivers
- **sensors**: 7 drivers
- **unknown**: 9 drivers

### **Capabilities Populaires**
- **onoff**: 21 drivers
- **measure_temperature**: 9 drivers
- **measure_humidity**: 5 drivers
- **dim**: 5 drivers
- **measure_power**: 4 drivers
- **alarm_motion**: 4 drivers
- **alarm_battery**: 3 drivers
- **alarm_contact**: 2 drivers
- **target_temperature**: 2 drivers
- **light_temperature**: 2 drivers

## 🚀 **Installation**

```bash
npm install
npm run pipeline
```

## 📁 **Structure des Drivers**

```
drivers/
├── tuya/
│   ├── controllers/
│   ├── sensors/
│   ├── security/
│   ├── climate/
│   ├── automation/
│   └── generic/
└── zigbee/
    ├── controllers/
    ├── sensors/
    ├── security/
    ├── climate/
    ├── automation/
    └── generic/
```

## 🔧 **Scripts Disponibles**

- `npm run pipeline` - Pipeline complet
- `npm run verify` - Vérification des drivers
- `npm run fetch` - Récupération nouveaux appareils
- `npm run enrich` - Enrichissement AI
- `npm run fusion` - Fusion intelligente
- `npm run compatibility` - Tests compatibilité
- `npm run cleanup` - Nettoyage et optimisation

## 🏠 **Compatibilité**

### **Firmware Tuya**
- ✅ Officiel
- ✅ OTA (Over-The-Air)
- ✅ Partiel
- ✅ Custom
- ✅ Générique
- ✅ Instable

### **Homey Models**
- ✅ Homey Pro (2016, 2019, 2023)
- ✅ Homey Bridge
- ✅ Homey Cloud

## 📈 **Pipeline Automatisé**

Le projet utilise une pipeline automatisée qui :
1. Vérifie et analyse tous les drivers
2. Scrape les sources externes
3. Enrichit avec l'AI
4. Fusionne intelligemment
5. Teste la compatibilité
6. Nettoie et optimise

## 🤝 **Contribution**

Les contributions sont les bienvenues ! Veuillez :
1. Fork le projet
2. Créer une branche feature
3. Commit vos changements
4. Push vers la branche
5. Ouvrir une Pull Request

## 📝 **Licence**

MIT License - voir le fichier LICENSE pour plus de détails.

## 📞 **Support**

- **Email**: [redacted-email]
- **GitHub**: https://github.com/dlnraja/tuya_repair
- **Issues**: https://github.com/dlnraja/tuya_repair/issues

---

**📅 Dernière mise à jour**: 2025-07-29T14:13:53.727Z
**👨‍💻 Auteur**: dlnraja <[redacted-email]>
