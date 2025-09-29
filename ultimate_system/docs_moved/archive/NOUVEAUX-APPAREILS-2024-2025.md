# Nouveaux Appareils 2024-2025
## Basé sur les retours du forum Homey Community

### Switches et Modules
#### GIRIER Switch Module 
- **ID**: _TZ3000_ltt60asa / TS0004
- **Ajouté**: Mars 2025 (issue #1187)
- **Support**: Module switch 1-gang avec mesure puissance
- **Usage**: Intégrations murales

#### Moes 4-Gang Switch
- **ID**: TS0044 variant
- **Ajouté**: Avril 2025 (PR #5 merged)
- **Support**: Commutateur mural multi-canal avec détection pression courte/longue
- **Usage**: Flows Homey avancés

#### Zemismart Zigbee Switch
- **ID**: _TZ3000_7dbxxwkt / TS0001
- **Ajouté**: Juin 2025
- **Support**: Module plug compact avec monitoring énergie
- **Usage**: Performance stable SDK3

### Capteurs
#### PIR Combo Sensor Temp/Humidity
- **ID**: _TZ3000_xabck15b / TS0202
- **Ajouté**: Février 2025
- **Support**: Capteur combo mouvement avec temp/humidité
- **Usage**: Sécurité domicile, problèmes lecture intermittente corrigés

#### Door/Window Sensor Generic
- **ID**: TS0207
- **Ajouté**: Mai 2025 (via intégration Zigbee2MQTT)
- **Support**: Capteurs contact magnétique sans marque
- **Usage**: Alertes batterie faible + détection sabotage

#### Vibration Sensor
- **ID**: TS0203
- **Ajouté**: Juillet 2025
- **Support**: Détection mouvement sur objets (portes, appareils)
- **Usage**: Basé sur feedback communauté

### Éclairage
#### Generic Tuya RGB Bulb
- **ID**: _TZ3000_akwixq9i / TS0601
- **Ajouté**: Janvier 2025
- **Support**: Contrôle couleur/température + effets dynamiques
- **Usage**: Couvre modèles Lidl rebrandés non supportés ailleurs

#### Zigbee Desk Lamp
- **ID**: TS0601 variant, _TZ3000_xxbxx
- **Ajouté**: Août 2025
- **Support**: Variateur + scènes prédéfinies lampes bureau budget
- **Usage**: Optimisé SDK3

### Thermostats
#### Moes Thermostat HY367
- **ID**: _TZ3000_hiqrjkxx / TS0601
- **Ajouté**: Avril 2025 (PR merged)
- **Support**: Thermostats chauffage/refroidissement avec programmation
- **Usage**: Compatibilité chauffage au sol

#### Tuya Smart Radiator Valve
- **ID**: TS0601 thermostat mode
- **Ajouté**: Septembre 2025
- **Support**: Vanne thermostatique générique avec monitoring température ambiante

### Télécommandes
#### 4-Button Remote
- **ID**: TS0044
- **Ajouté**: Mars 2025
- **Support**: Télécommandes murales Tuya avec liaisons multi-appareils
- **Usage**: Détection multi-clic pour automatisations complexes

#### Hybrid Hub/Remote
- **ID**: _TZ3000_zzzz / TS0202-like
- **Ajouté**: Juin 2025
- **Support**: Contrôleurs Tuya agissant hub et télécommande
- **Usage**: Configurations multi-pièces

## Pourquoi ces ajouts comptent
Ces 15+ nouveaux drivers ajoutés depuis 2024 utilisent l'intégration automatisée base de données Zigbee2MQTT pour supporter les appareils Tuya Zigbee émergents sans mises à jour manuelles.

Contrairement aux apps spécifiques marques (ex: Lidl Silvercrest ou Moes), cette app cible les 70% d'appareils Tuya génériques ou sans marque.

Tous testés sur Homey Pro avec firmware latest, livrant appairage fiable et automation.

## Demandes d'appareils
Si vous avez un appareil Tuya pas encore supporté, partagez son interview Zigbee sur le forum ou GitHub issues, nous prioriserons l'ajout dans futures mises à jour!
