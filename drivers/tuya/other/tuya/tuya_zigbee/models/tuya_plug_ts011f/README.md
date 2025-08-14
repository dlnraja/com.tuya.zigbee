# 🔌 Tuya Smart Plug TS011F Driver

## 📋 Description

Driver Homey pour la prise intelligente Tuya TS011F avec monitoring de puissance et support complet des Data Points Tuya.

## ✨ Fonctionnalités

- **Contrôle On/Off** : Allumage et extinction de la prise
- **Monitoring de Puissance** : Mesure en temps réel de la consommation
- **Compteur d'Énergie** : Suivi de la consommation totale
- **Support Tuya DP** : Contrôle avancé via Data Points Tuya
- **Calibration** : Facteur de calibration configurable
- **Protection Surcharge** : Limites configurables de puissance
- **Flow Cards** : Déclencheurs et actions personnalisables

## 🏷️ Appareils Supportés

- **Modèle** : TS011F, TS011F_plug_1, TS011F_plug_2
- **Fabricant** : Tuya, _TZ3000_*, Generic
- **Type** : Prise intelligente 16A
- **Puissance Max** : 3680W (16A × 230V)

## 🔧 Installation

1. **Ajouter le driver** dans votre app Homey
2. **Apparier l'appareil** via le processus standard Zigbee
3. **Configurer les paramètres** selon vos besoins

## ⚙️ Configuration

### Paramètres Disponibles

| Paramètre | Description | Valeur | Unité |
|-----------|-------------|---------|-------|
| `tuya_dp_log` | Logger les DPs Tuya | Boolean | - |
| `power_calibration` | Facteur de calibration | 0.1 - 10.0 | - |

### Data Points Tuya

| DP ID | Nom | Description | Capability | Confiance |
|-------|-----|-------------|------------|-----------|
| 1 | Power State | État on/off principal | `onoff` | High |
| 2 | Power Monitoring | Activation monitoring | `generic` | Medium |
| 101 | Power Value | Consommation puissance | `measure_power` | High |
| 102 | Energy Value | Consommation énergie | `meter_power` | High |

## 🎯 Capabilities

### OnOff
- **ID** : `onoff`
- **Type** : Boolean
- **Description** : Contrôle principal de l'alimentation

### Measure Power
- **ID** : `measure_power`
- **Type** : Number
- **Unité** : W (Watts)
- **Plage** : 0 - 3680W

### Meter Power
- **ID** : `meter_power`
- **Type** : Number
- **Unité** : kWh
- **Description** : Compteur de consommation d'énergie

## 🔄 Flow Cards

### Déclencheurs

#### Power Changed
- **Déclenché** : Quand la consommation de puissance change
- **Arguments** : `power` (W)
- **Utilisation** : Monitoring, alertes, automatisations

### Actions

#### Send Tuya DP
- **Action** : Envoyer une commande DP Tuya personnalisée
- **Arguments** : `dp_id` (1-65535), `dp_value` (string)
- **Utilisation** : Contrôle avancé, commandes personnalisées

## 📊 Monitoring et Diagnostic

### Informations Disponibles
- Consommation de puissance actuelle
- Utilisation en pourcentage de la capacité
- Statut de surcharge
- Facteurs de calibration appliqués
- Dernière mise à jour

### Protection Surcharge
- Limite configurable : 95% de la puissance maximale
- Alerte automatique en cas de dépassement
- Protection contre les dommages

## 🚨 Dépannage

### Problèmes Courants

1. **Appareil non détecté**
   - Vérifier la compatibilité Zigbee
   - Redémarrer le processus d'appairage

2. **Mesures de puissance incorrectes**
   - Ajuster le facteur de calibration
   - Vérifier la configuration électrique

3. **DPs Tuya non reçus**
   - Activer le logging des DPs
   - Vérifier la configuration du cluster

### Logs et Debug
- Activer `tuya_dp_log` pour tracer les communications
- Vérifier les logs Homey pour les erreurs
- Utiliser les diagnostics intégrés

## 🔗 Ressources

- **Documentation Tuya** : [Tuya IoT Platform](https://developer.tuya.com/)
- **Support Homey** : [Homey Community](https://community.homey.app/)
- **Zigbee2MQTT** : [Device Database](https://www.zigbee2mqtt.io/)

## 📝 Notes Techniques

- **Protocole** : Zigbee + Tuya Data Points
- **Clusters ZCL** : genOnOff, haElectricalMeasurement, seMetering, manuSpecificTuya
- **Endpoints** : 1 (principal)
- **Bindings** : genOnOff, manuSpecificTuya

## 🤝 Contribution

Ce driver est maintenu par la communauté Homey. Pour contribuer :

1. **Signaler des bugs** via les issues GitHub
2. **Proposer des améliorations** via les pull requests
3. **Partager des expériences** sur le forum Homey

## 📄 Licence

MIT License - Voir le fichier LICENSE pour plus de détails.

---

**Version** : 3.3.0  
**Dernière mise à jour** : 2025-08-13  
**Auteur** : dlnraja  
**Support** : [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)
