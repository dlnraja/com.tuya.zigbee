═══════════════════════════════════════════════════════════════════════════
  UNIVERSAL TUYA ZIGBEE - HOMEY APP v4.6.1
  Community-Maintained Universal Zigbee Driver Collection
═══════════════════════════════════════════════════════════════════════════

📱 DESCRIPTION
--------------
Application Zigbee universelle avec 189 drivers hybrides unifiés supportant 
plus de 18,000+ manufacturer IDs différents.

✨ CARACTÉRISTIQUES
-------------------
✅ 100% Contrôle Local (pas de cloud requis)
✅ 189 Drivers Hybrides Unifiés
✅ 18,000+ Manufacturer IDs supportés
✅ Détection Automatique Source d'Alimentation
✅ Détection Automatique Type de Batterie
✅ Gestion Énergétique Avancée
✅ Flow Cards Complets
✅ SDK3 Compliant
✅ Multi-langues (EN, FR, NL, DE, IT, ES, SV, NO, DA)

📦 CATÉGORIES DE DEVICES SUPPORTÉS
-----------------------------------
1. Motion & Presence Detection (PIR, radar, mmWave)
2. Contact & Security (door/window sensors, locks)
3. Temperature & Climate (sensors, thermostats)
4. Smart Lighting (bulbs, switches, dimmers, RGB/RGBW LED strips)
5. Power & Energy (plugs, outlets, energy monitoring)
6. Safety & Detection (smoke, water leak, CO detectors)
7. Automation Control (buttons, scene switches, remotes)
8. Covers (curtains, blinds, shutters)
9. Appliances (fans, valves, controllers)

🔧 INSTALLATION
---------------
1. Ouvrir Homey App Store
2. Chercher "Universal Tuya Zigbee"
3. Installer l'application
4. Ajouter vos devices Zigbee

⚙️ PAIRING INTELLIGENT
-----------------------
L'application utilise un système de pairing multi-critères:
• manufacturerName (ID fabricant)
• productId (modèle du produit)
• endpoints (configuration Zigbee)
• clusters (fonctionnalités)

Cela garantit que chaque device paire avec le BON driver, même si plusieurs
drivers partagent certains manufacturer IDs.

🔋 DÉTECTION AUTOMATIQUE
-------------------------
✅ Source d'Alimentation (AC/DC/Batterie)
   L'app détecte automatiquement si votre device est:
   - Alimenté secteur (AC)
   - Alimenté DC
   - Sur batterie

✅ Type de Batterie
   Détection automatique du type:
   - CR2032 (pile bouton 3V)
   - CR2450 (pile bouton 3V) 
   - AAA (1.5V)
   - AA (1.5V)
   - CR123A (3V)

💡 MODES D'OPTIMISATION
-----------------------
Trois modes disponibles pour chaque device:
• Performance: Plus réactif, consomme plus
• Balanced: Équilibre optimal (par défaut)
• Power Saving: Économie batterie maximale

📊 ENERGY MANAGEMENT
--------------------
✅ Monitoring consommation en temps réel
✅ Estimation intelligente si pas de mesure directe
✅ Historiques de consommation
✅ Alertes seuil batterie (Low/Critical)
✅ Notifications batterie faible
✅ Rapports automatiques

🎛️ FLOW CARDS
--------------
Chaque driver inclut des flow cards pour:
• WHEN (triggers): changements d'état, alarmes, mesures
• AND (conditions): vérifications d'état
• THEN (actions): contrôles, configurations

📱 DEVICES POPULAIRES SUPPORTÉS
--------------------------------
✅ Tuya Zigbee devices (18,000+ models)
✅ MOES switches & sensors
✅ BSEED wall switches
✅ Lonsonho devices
✅ Aqara sensors (Lumi)
✅ Neo Coolcam devices
✅ Et beaucoup d'autres marques compatibles Tuya!

🆘 SUPPORT & FORUM
------------------
Forum Homey Community:
https://community.homey.app/

GitHub Repository:
https://github.com/dlnraja/com.tuya.zigbee

Issues & Feature Requests:
https://github.com/dlnraja/com.tuya.zigbee/issues

📝 NOTES IMPORTANTES
--------------------
• Cette app est maintenue par la communauté
• 100% local, pas de connexion cloud requise
• Compatible avec tous les devices Tuya Zigbee standards
• Mises à jour régulières avec nouveaux devices
• Respect de la vie privée (aucune donnée transmise)

🔐 CONFIDENTIALITÉ
------------------
✅ Aucune donnée collectée
✅ Aucune connexion internet requise
✅ 100% local sur votre Homey
✅ Aucun tracking
✅ Open source (communauté)

⚡ QUICK START
--------------
1. Installer l'app depuis Homey App Store
2. Aller dans Devices → Ajouter Device
3. Sélectionner "Universal Tuya Zigbee"
4. Choisir la catégorie de votre device
5. Mettre le device en mode pairing
6. Homey détectera automatiquement le bon driver!

💻 DÉVELOPPEURS
----------------
SDK: Homey SDK3
Language: JavaScript (Node.js)
Repository: GitHub (dlnraja/com.tuya.zigbee)
Contributions: Bienvenues via Pull Requests

📜 LICENCE
----------
Licence Open Source
Copyright (c) 2025 Community Contributors

🎯 VERSION ACTUELLE: v4.6.1
----------------------------
✅ 189 drivers unifiés
✅ 18,000+ manufacturer IDs
✅ 567 icônes SVG personnalisées
✅ 0 conflits de pairing
✅ Support forum users priority
✅ Validation SDK3 complète

🔄 DERNIÈRES MISES À JOUR
--------------------------
v4.6.1 (24/10/2025):
• Optimisation pairing multi-critères
• Ajout IDs génériques SAFE
• README.txt complet
• Documentation complète

v4.6.0 (24/10/2025):
• 567 images SVG personnalisées
• Priorité forum users (47 IDs)
• Nettoyage organisation projet
• Scripts diagnostiques

v4.5.9 (23/10/2025):
• Wildcard cleanup
• Emergency fixes
• Validation complète

═══════════════════════════════════════════════════════════════════════════
  MERCI D'UTILISER UNIVERSAL TUYA ZIGBEE!
  Support: https://community.homey.app/
═══════════════════════════════════════════════════════════════════════════
