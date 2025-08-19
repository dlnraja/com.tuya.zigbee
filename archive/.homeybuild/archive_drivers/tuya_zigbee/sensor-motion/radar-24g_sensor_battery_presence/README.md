// Tuya Radar Sensor 24G

#// 📡 Description

Capteur de présence radar Tuya 24GHz avec détection de mouvement, mesure de luminosité et mesure de distance.

#// 🔧 Caractéristiques

- **Fréquence** : 24GHz (différente du 5.8GHz)
- **Modèle** : `_TZE204_gkfbdvyx`
- **Capabilities** :
  - `alarm_motion` : Détection de mouvement
  - `measure_luminance` : Mesure de luminosité (0-1000 lux)
  - \target_distance` : Mesure de distance (0-12 mètres)

#// ⚙️ Configuration

##// Paramètres disponibles :
- **Sensibilité du mouvement** : 1-10 (défaut: 5)
- **Distance de détection** : 1-12 mètres (défaut: 8m)

#// 🚀 Installation

1. Ajouter le driver à votre projet Homey
2. Appairer le capteur via l'interface Tuya
3. Configurer les paramètres selon vos besoins

#// 📊 Données

Le capteur envoie des données toutes les 30 secondes :
- **Luminosité** : Valeur en lux
- **Distance** : Distance en mètres
- **Mouvement** : Booléen (mouvement détecté ou non)

#// 🔍 Dépannage

- **Pas de détection** : Vérifier la sensibilité et la distance
- **Données manquantes** : Vérifier la connexion Tuya
- **Faux positifs** : Réduire la sensibilité

#// 📝 Notes

- Basé sur le capteur radar 5.8GHz existant
- Compatible Homey 5.0+
- Support multilingue (EN, FR, NL)

#// 👨‍💻 Développement

- **Auteur** : dlnraja
- **Repository** : [homey-tuya-zigbee](https://github.com/dlnraja/homey-tuya-zigbee)
- **Licence** : MIT

---

**Source** : [Forum Homey Community](https://community.homey.app/t/app-pro-tuya-zigbee-app/26439/5313)
**Demande** : Intégration du capteur 24G par Erno_Almassy
