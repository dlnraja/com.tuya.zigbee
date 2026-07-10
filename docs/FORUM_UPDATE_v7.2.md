# [APP PRO] Universal Tuya Zigbee - v7.2.0 "The Autonomous Awakening" 

Bonjour à tous,

Une mise à jour majeure vient d'être déployée sur le canal de test (v7.2.0). Cette version transforme radicalement la façon dont vos périphériques communiquent et interagissent avec Homey.

###  Nouveautés Majeures :

1. ** Natural Light (Adaptive Lighting)** :
   Vos ampoules (Tuya, Lidl, IKEA, etc.) peuvent maintenant suivre la courbe du soleil. La température de couleur s'ajuste automatiquement du blanc froid à midi au blanc chaud en soirée. Plus besoin de Philips Hue pour avoir cette fonction premium !

2. ** Zigbee Radio Sensing (BETA)** :
   Une révolution. Vos ampoules et prises alimentées agissent maintenant comme des "radars" radio. En analysant les fluctuations du signal (LQI/RSSI), l'app peut détecter une présence humaine dans la pièce même si l'appareil n'a pas de capteur de mouvement physique.

3. ** Smart Gesture Engine** :
   Détection haute fidélité des Single, Double, et Triple Clicks ainsi que des pressions longues (Hold). Fini les déclenchements multiples ou les ratés sur les interrupteurs hybrides.

4. ** Orchestration Hybrid Engine** :
   L'application s'auto-répare désormais chaque nuit. Vos flux corrompus (Flow Cards) et vos capacités manquantes sont automatiquement restaurés par notre agent de maintenance.

5. ** Dé-duplication de Flux** :
   Grâce à une corrélation de séquence temps-réel, les périphériques bavards (qui envoient leur état via plusieurs protocoles en même temps) ne déclenchent plus qu'un seul évènement dans Homey.

###  Sous le capot :
- Intégration profonde des logiques de "Quirks" héritées des travaux de Z2M et ZHA.
- Prise en charge des marques obscures (Ubisys, Bosch, Schneider, Legrand) avec leurs clusters propriétaires.
- Moteur de découverte dynamique : si un appareil rapporte une donnée inconnue, l'app crée la capacité correspondante à la volée.

---
*Cette mise à jour s'inscrit dans notre vision d'un écosystème Tuya totalement autonome et libéré des limitations logicielles des constructeurs originaux.*

[Tester la v7.2.0](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)
# [APP PRO] Universal Tuya Zigbee - v7.2.0 "The Autonomous Awakening" 

Bonjour à tous,

Une mise à jour majeure vient d'être déployée sur le canal de test (v7.2.0). Cette version transforme radicalement la façon dont vos périphériques communiquent et interagissent avec Homey.

###  Nouveautés Majeures :

1. ** Natural Light (Adaptive Lighting)** :
   Vos ampoules (Tuya, Lidl, IKEA, etc.) peuvent maintenant suivre la courbe du soleil. La température de couleur s'ajuste automatiquement du blanc froid à midi au blanc chaud en soirée. Plus besoin de Philips Hue pour avoir cette fonction premium !

2. ** Zigbee Radio Sensing (BETA)** :
   Une révolution. Vos ampoules et prises alimentées agissent maintenant comme des "radars" radio. En analysant les fluctuations du signal (LQI/RSSI), l'app peut détecter une présence humaine dans la pièce même si l'appareil n'a pas de capteur de mouvement physique.

3. ** Smart Gesture Engine** :
   Détection haute fidélité des Single, Double, et Triple Clicks ainsi que des pressions longues (Hold). Fini les déclenchements multiples ou les ratés sur les interrupteurs hybrides.

4. ** Orchestration Hybrid Engine** :
   L'application s'auto-répare désormais chaque nuit. Vos flux corrompus (Flow Cards) et vos capacités manquantes sont automatiquement restaurés par notre agent de maintenance.

5. ** Dé-duplication de Flux** :
   Grâce à une corrélation de séquence temps-réel, les périphériques bavards (qui envoient leur état via plusieurs protocoles en même temps) ne déclenchent plus qu'un seul évènement dans Homey.

6. ** Calcul Technique de Puissance** :
   L'app calcule désormais la consommation nominale de vos appareils (ampoules, prises, moteurs) en fonction de leur composition technique (nombre de LEDs, technologie, etc.). Vos statistiques d'énergie dans Homey sont plus précises que jamais.

###  Sous le capot :
- Intégration profonde des logiques de "Quirks" héritées des travaux de Z2M et ZHA.
- Prise en charge des marques obscures (Ubisys, Bosch, Schneider, Legrand) avec leurs clusters propriétaires.
- Moteur de découverte dynamique : si un appareil rapporte une donnée inconnue, l'app crée la capacité correspondante à la volée.

---
*Cette mise à jour s'inscrit dans notre vision d'un écosystème Tuya totalement autonome et libéré des limitations logicielles des constructeurs originaux.*

[Tester la v7.2.0](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)
