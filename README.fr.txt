Unified Smart Home Engine pour Homey — Contrôle local Tuya Zigbee

Cette application offre un support Zigbee unifié et local pour Tuya, eWeLink et des centaines de marques domotiques compatibles — sans cloud, sans dépendance internet. C'est la collection de drivers Tuya Zigbee la plus complète disponible pour Homey Pro.

Avec plus de 412 pilotes et 33 235+ empreintes d'appareils dans toutes les familles Tuya, elle couvre :

PRISES ET ENERGIE :
- Prises intelligentes (1 et 2 sorties), multiprises, compteurs d'énergie, pinces ampèremétriques
- Prises de mesure avec suivi en temps réel : puissance, tension, courant et kWh

INTERRUPTEURS ET VARIATEURS :
- Interrupteurs muraux : 1 à 6 boutons (TS0001 à TS0006, TS0011 à TS0015)
- Variateurs : frontal, de phase, TRIAC (TS110E, TS110F)
- Interrupteurs de scène, télécommandes murales, mini-télécommandes et manettes

CAPTEURS :
- Détecteurs de présence : PIR, radar mmWave (24GHz, 5.8GHz), dual-tech
- Capteurs d'ouverture de portes et fenêtres (magnétiques)
- Détecteurs de fumée, CO, CO2, gaz
- Capteurs de température et d'humidité (variantes avec affichage LCD)
- Capteurs d'humidité du sol, de fuite d'eau, de pluie, de pression et d'occupation de lit
- Capteurs d'illuminance et qualité d'air (PM2.5, COV, formaldéhyde)

CLIMATISATION :
- Thermostats (chauffage au sol, électrique, chaudière)
- Vannes de radiateur (TRV) avec support de planification
- Contrôleurs d'humidité, déshumidificateurs et purificateurs d'air

ECLAIRAGE :
- Ampoules intelligentes : E27, E14, GU10, MR16 — RGBW, CCT, blanc gradable
- Contrôleurs de rubans LED : monochrome, RGB, RGBW, RGBCCT
- Plafonniers, panneaux lumineux et bougies connectées

VOLETS ET MOTEURS :
- Moteurs de rideaux, de stores, contrôleurs de volets vénitiens
- Ouvre-portes de garage, contrôleurs de portails et moteurs de stores banne

SECURITE :
- Serrures intelligentes (code PIN, empreinte digitale, carte)
- Sirènes d'alarme, boutons panique, interrupteurs d'urgence

MARQUES SUPPORTEES (liste partielle) :
Nedis, Silvercrest, Lidl, compatible Ikea Tradfri, Zemismart, Lonsonho, Samotech, Malmbergs,
Alecto, Smart9, BlitzWolf, Neo, Ejlink, NOUS, GIRIER, MOES, TUYA, Loratap, Woox, Mercator,
Aubess, BRT-100 Beok, Avatto, Tongou, Koogeek, Owon, Sunricher, Lumiax, compatible OSRAM,
compatible Schneider, compatible Legrand, compatible Hager, compatible Ajax Systems et bien d'autres.

COMPATIBILITE :
- Requiert : Homey Pro 2019 ou 2023 (Zigbee SDK3)
- Firmware Homey : 10.x ou supérieur recommandé
- NE supporte PAS Homey Bridge (support Zigbee limité)

DEPANNAGE :
- Appareil introuvable ? Vérifiez que votre appareil est à portée Zigbee de Homey
- Appareil appairé mais mauvaises capacités ? Ouvrez un ticket GitHub avec l'empreinte de l'appareil
- Pour obtenir l'empreinte : App Homey > Zigbee > votre appareil > faire défiler vers le bas
- AggregateError lors de l'installation ? Mettez à jour vers la dernière version de l'app et réessayez

DEMARRAGE :
1. Installez cette application depuis le Homey App Store
2. Allez dans Appareils > Ajouter un appareil > Tuya Unified (ou cherchez votre marque)
3. Mettez votre appareil en mode appairage (en général, maintenez le bouton 5 à 10 secondes jusqu'au clignotement de la LED)
4. Homey détectera automatiquement le type d'appareil et appliquera le bon pilote

CREDITS ET ATTRIBUTION :
- Basé sur le travail original de Johan Bendz (github.com/JohanBendz/com.tuya.zigbee)
- Contributeurs communautaires : voir github.com/dlnraja/com.tuya.zigbee/graphs/contributors
- Projet Zigbee2MQTT pour la documentation des protocoles
- Tuya Open API pour la référence des empreintes d'appareils

COMMUNAUTE ET SUPPORT :
- Forum : https://community.homey.app/t/140352
- Problèmes et demandes de fonctionnalités : https://github.com/dlnraja/com.tuya.zigbee/issues
- Code source : https://github.com/dlnraja/com.tuya.zigbee
- Canal test (dernières fonctionnalités) : https://homey.app/a/com.dlnraja.tuya.zigbee/test/
