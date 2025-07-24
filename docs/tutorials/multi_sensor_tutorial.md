# 📚 Tutoriel - multi_sensor

## 🎯 Vue d'ensemble
Ce tutoriel vous guide dans l'installation et la configuration du driver **multi_sensor** pour Homey.

## 📋 Prérequis
- Homey avec firmware 8.0+
- Application Tuya Zigbee installée
- Appareil compatible multi_sensor

## 🔧 Installation

### Étape 1: Ajout du driver
1. Ouvrez l'application Tuya Zigbee sur Homey
2. Allez dans l'onglet "Drivers"
3. Recherchez "multi_sensor"
4. Cliquez sur "Installer"

### Étape 2: Configuration
1. Appuyez sur le bouton "+" pour ajouter un appareil
2. Sélectionnez "multi_sensor" dans la liste
3. Suivez les instructions à l'écran

## ⚙️ Configuration avancée

### Paramètres recommandés
- **Polling interval**: 60 secondes
- **Battery threshold**: 20%
- **Auto-reconnect**: Activé

### Dépannage
- **Problème**: L'appareil ne se connecte pas
  - **Solution**: Vérifiez que l'appareil est en mode pairing
- **Problème**: Batterie faible
  - **Solution**: Remplacez les piles et recalibrez

## 📊 Monitoring
- Surveillez la batterie dans l'application
- Vérifiez les logs pour les erreurs
- Utilisez le dashboard pour les statistiques

## 🔗 Liens utiles
- [Documentation officielle](../README.md)
- [Support communautaire](https://github.com/dlnraja/com.tuya.zigbee/issues)
- [Dashboard temps réel](../dashboard/)

---
*Généré automatiquement le 2025-07-24T22:17:19.366Z*
