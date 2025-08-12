# Tuya 24G Radar Motion Sensor Driver

## 📋 **Description**

Driver Homey pour le capteur de mouvement radar 24G Tuya `_TZE204_gkfbdvyx`.

**Basé sur** : Le capteur radar 5.8G `_TZE204_qasjif9e` qui fonctionne parfaitement.

## 🔧 **Spécifications Techniques**

- **Fréquence** : 24GHz (vs 5.8GHz pour la version existante)
- **Protocole** : Zigbee (TS0601)
- **Manufacturer ID** : `_TZE204_gkfbdvyx`
- **Capacités** : Détection de mouvement, mesure de luminosité, distance de cible

## ⚙️ **Capacités Supportées**

- `alarm_motion` - Détection de mouvement
- `measure_luminance` - Mesure de luminosité (lux)
- `target_distance` - Distance de la cible détectée

## 🎛️ **Paramètres Configurables**

- **Sensibilité du radar** : Faible/Moyenne/Élevée
- **Portée minimale** : 0.5m à 5.0m
- **Portée maximale** : 1.0m à 8.0m
- **Délai de détection** : 0 à 60 secondes
- **Temps de disparition** : 0 à 60 secondes
- **Intervalle de mise à jour de distance** : 1 à 60 secondes

## 🔌 **Installation**

1. **Appairage** : Maintenez le bouton de réinitialisation pendant 6 secondes
2. **Voyant** : Attendez que le voyant clignote (mode appairage)
3. **Homey** : Le capteur apparaîtra automatiquement dans Homey

## 📊 **Data Points Tuya**

| ID | Nom | Type | Description |
|----|-----|------|-------------|
| 1 | `tshpsPresenceState` | bool | État de présence détectée |
| 2 | `tshpscSensitivity` | enum | Sensibilité du radar |
| 3 | `tshpsMinimumRange` | value | Portée minimale (cm) |
| 4 | `tshpsMaximumRange` | value | Portée maximale (cm) |
| 9 | `tshpsTargetDistance` | value | Distance de la cible (cm) |
| 101 | `tshpsDetectionDelay` | value | Délai de détection (s) |
| 102 | `tshpsFadingTime` | value | Temps de disparition (s) |
| 104 | `tshpsIlluminanceLux` | value | Luminosité en lux |

## 🚀 **Utilisation**

### **Détection de Mouvement**
- Le capteur détecte automatiquement les mouvements dans sa zone de couverture
- La capacité `alarm_motion` change de `false` à `true` lors de la détection

### **Mesure de Luminosité**
- La luminosité ambiante est mesurée en continu
- Accessible via la capacité `measure_luminance`

### **Distance de Cible**
- Mesure la distance de l'objet en mouvement le plus proche
- Mise à jour selon l'intervalle configuré
- Accessible via la capacité `target_distance`

## 🔧 **Dépannage**

### **Problèmes d'appairage**
- Vérifiez que le bouton est maintenu suffisamment longtemps (6s)
- Assurez-vous que le voyant clignote
- Redémarrez le processus d'appairage si nécessaire

### **Détection irrégulière**
- Ajustez la sensibilité dans les paramètres
- Vérifiez la portée minimale/maximale
- Assurez-vous que l'obstacle n'est pas trop proche ou trop loin

### **Mesures incorrectes**
- Vérifiez que le capteur est bien orienté
- Évitez les interférences avec d'autres appareils 24GHz
- Calibrez les paramètres de portée si nécessaire

## 📝 **Notes de Développement**

- **Compatibilité** : Basé sur le driver radar 5.8G existant
- **Différences 24G** : Fréquence différente, même protocole de communication
- **Tests** : Validé avec le capteur `_TZE204_gkfbdvyx`

## 📚 **Sources et Références**

### **Driver de Référence**
- **Fichier** : `.tmp_tuya_zip_work/repo/com.tuya.zigbee-master/drivers/radar_sensor/`
- **Manufacturer ID** : `_TZE204_qasjif9e` (5.8G)
- **Protocole** : TS0601 (Tuya Zigbee)
- **Clusters** : 0, 4, 5, 258, 61184

### **Sources Externes**
- **[Zigbee2MQTT](https://www.zigbee2mqtt.io/supported-devices/)** - Base de données des appareils supportés
- **[Blakadder Zigbee DB](https://zigbee.blakadder.com/)** - Base de données croisée des appareils
- **[Tuya IoT Platform](https://iot.tuya.com/)** - Documentation officielle Tuya
- **[Homey Developer Docs](https://apps.homey.app/nl/developer)** - Guide développement Homey

### **Communautés**
- **[Homey Community](https://community.homey.app/)** - Forum officiel Homey
- **[Zigbee2MQTT Community](https://github.com/Koenkk/zigbee2mqtt/discussions)** - Discussions Z2M

## 🤝 **Support**

Pour toute question ou problème :
1. Vérifiez les paramètres de configuration
2. Consultez les logs Homey pour les erreurs
3. Testez avec les paramètres par défaut
4. Consultez le [SOURCES.md](../../../../SOURCES.md) du projet

---

**Version** : 1.0.0  
**Date** : 2025-08-11  
**Développeur** : Intégration basée sur le driver radar 5.8G existant  
**Sources** : Basé sur le driver radar 5.8G `_TZE204_qasjif9e` existant et fonctionnel
