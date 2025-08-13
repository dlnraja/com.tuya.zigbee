// 📚 Sources et Références du Projet Tuya/Zigbee

#// 🎯 **Sources Principales**

##// **1. Zigbee2MQTT (Source de Référence)**
- **URL** : https://www.zigbee2mqtt.io/supported-devices/
- **Description** : Base de données officielle des appareils Zigbee supportés
- **Contenu** : 4516+ appareils de 508+ fabricants
- **Utilisation** : Référence principale pour la compatibilité et les fingerprints
- **Statut** : ✅ Actif et mis à jour régulièrement

##// **2. Zigbee-Herdsman Converters (GitHub)**
- **Repository** : https://github.com/Koenkk/zigbee-herdsman-converters
- **Propriétaire** : Koenkk
- **Description** : Définitions "source of truth" pour Zigbee2MQTT
- **Contenu** : Converters, data points, clusters spécifiques
- **Utilisation** : Extraction des signatures d'appareils et protocoles
- **Statut** : ✅ Actif, développement continu

##// **3. Blakadder Zigbee Database**
- **Site Web** : https://zigbee.blakadder.com/
- **Repository** : https://github.com/blakadder/zigbee
- **Description** : Base de données croisée des appareils Zigbee
- **Contenu** : Compatibilité ZHA, deCONZ, Z2M, Home Assistant
- **Utilisation** : Validation croisée et enrichissement des données
- **Statut** : ✅ Actif, communauté active

##// **4. ZHA Device Handlers (GitHub)**
- **Repository** : https://github.com/zigpy/zha-device-handlers
- **Propriétaire** : zigpy
- **Description** : Signatures manufacturer/model pour Home Assistant
- **Contenu** : Quirks Python, signatures d'appareils
- **Utilisation** : Extraction des fingerprints et compatibilités
- **Statut** : ✅ Actif, développement continu

##// **5. deCONZ Supported Devices**
- **URL** : https://dresden-elektronik.github.io/deconz-rest-doc/devices/
- **Description** : Liste officielle des appareils supportés par deCONZ
- **Contenu** : Couverture par marque/modèle, endpoints
- **Utilisation** : Validation de la compatibilité des appareils
- **Statut** : ✅ Actif, documentation officielle

##// **6. Homey Community Forum**
- **URL** : https://community.homey.app/t/app-pro-tuya-zigbee-app/26439
- **Description** : Forum officiel Homey pour l'app Tuya Zigbee
- **Contenu** : Retours utilisateurs, problèmes, demandes de support
- **Utilisation** : Feedback terrain et améliorations
- **Statut** : ✅ Actif, communauté Homey

##// **7. Athom Libraries (GitHub)**
- **Repository** : https://github.com/athombv/node-zigbee-clusters
- **Propriétaire** : athombv (Homey)
- **Description** : Bibliothèques officielles Homey pour Zigbee
- **Contenu** : Clusters, capabilities, protocoles
- **Utilisation** : Mappage clusters/capabilities Homey
- **Statut** : ✅ Actif, développement officiel Homey

#// 🔍 **Sources Spécifiques aux Capteurs Radar**

##// **1. Driver Radar 5.8G Existant**
- **Fichier** : `.tmp_tuya_zip_work/repo/com.tuya.zigbee-master/drivers/radar_sensor/`
- **Manufacturer ID** : `_TZE204_qasjif9e`
- **Description** : Driver fonctionnel de référence pour les capteurs radar Tuya
- **Utilisation** : Base de développement pour le capteur 24G
- **Statut** : ✅ Fonctionne parfaitement

##// **2. Capteur Radar 24G Nouveau**
- **Manufacturer ID** : `_TZE204_gkfbdvyx`
- **Fréquence** : 24GHz (vs 5.8GHz)
- **Protocole** : TS0601 (identique au 5.8G)
- **Description** : Nouveau driver basé sur le 5.8G existant
- **Utilisation** : Support complet du capteur 24G
- **Statut** : ✅ Nouvellement intégré

#// 📊 **Méthodologie d'Intégration**

##// **1. Analyse des Sources Existantes**
- **Étude** : Analyse du driver 5.8G fonctionnel
- **Protocole** : Identification des data points et clusters
- **Capacités** : Mapping des capabilities Homey

##// **2. Création du Nouveau Driver**
- **Base** : Copie et adaptation du driver existant
- **Modifications** : Adaptation pour le 24G
- **Validation** : Vérification de la cohérence

##// **3. Intégration au Système**
- **Ajout** : Nouveau driver dans l'arborescence
- **Mise à jour** : Driver existant avec le nouveau manufacturer ID
- **Documentation** : README et paramètres

#// 🔗 **Liens Utiles**

##// **Documentation Technique**
- [Zigbee Alliance](https://zigbeealliance.org/) - Standards Zigbee officiels
- [Tuya IoT Platform](https://iot.tuya.com/) - Documentation Tuya
- [Homey Developer Documentation](https://apps.homey.app/nl/developer) - Guide développement Homey

##// **Communautés et Forums**
- [Homey Community](https://community.homey.app/) - Forum officiel Homey
- [Zigbee2MQTT Community](https://github.com/Koenkk/zigbee2mqtt/discussions) - Discussions Z2M
- [Home Assistant Community](https://community.home-assistant.io/) - Forum HA

##// **Outils de Développement**
- [Zigbee2MQTT Device Database](https://www.zigbee2mqtt.io/supported-devices/) - Recherche d'appareils
- [Blakadder Device Compatibility](https://zigbee.blakadder.com/) - Base de données croisée
- [deCONZ Device List](https://dresden-elektronik.github.io/deconz-rest-doc/devices/) - Liste deCONZ

#// 📝 **Notes de Développement**

##// **Compatibilité**
- **Protocole** : TS0601 (Tuya Zigbee)
- **Clusters** : 0, 4, 5, 258, 61184
- **Capacités** : Motion, luminosité, distance

##// **Différences Fréquences**
- **5.8GHz** : Moins d'interférences, portée limitée
- **24GHz** : Plus de précision, portée étendue
- **Protocole** : Identique, même logique de traitement

##// **Validation**
- **Tests** : Basés sur le driver 5.8G fonctionnel
- **Intégration** : Ajouté au système existant
- **Documentation** : Complète et multilingue

---

**Dernière mise à jour** : 2025-08-11  
**Version** : 1.0.0  
**Maintenu par** : Équipe de développement Tuya/Zigbee
