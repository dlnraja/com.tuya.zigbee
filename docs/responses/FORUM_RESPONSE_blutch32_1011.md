# Forum Response - blutch32 #1011

##  Copier/Coller pour le Forum

---

@blutch32 

Merci pour les interviews ! Voici mon analyse :

### 1 HOBEIAN ZG-303Z - Ce n'est PAS un contact sensor !

Ton interview montre :
```
inputClusters: [0, 3, 61184, 1026, 1029, 1]
```

Ça signifie :
-  Tuya DP (61184)
-  temperatureMeasurement (1026)  **Température**
-  relativeHumidity (1029)  **Humidité**
-  powerConfiguration (1)  **Batterie**
-  PAS de IAS Zone (1280) = **PAS de capacité alarm_contact !**

**Le ZG-303Z est un capteur de SOL/CLIMAT (température + humidité), PAS un contact sensor !**

Il est déjà supporté dans le driver `soil_sensor`. Si tu as besoin d'un contact sensor, tu as le mauvais appareil.

**Question :** As-tu un AUTRE appareil qui est le vrai contact sensor ? Si oui, partage son interview.

### 2 `_TZE284_81yrt3lo` - Déjà Supporté !

C'est en fait un **compteur d'énergie 2 canaux CT** (pince ampèremétrique), déjà supporté dans le driver `power_clamp_meter`.

Quand tu l'appairies :
- Il devrait afficher les mesures de puissance pour 2 canaux
- Capacités : `measure_power`, `meter_power`, `measure_voltage`, `measure_current`

### 3 Energy Meter

Si tu as un compteur d'énergie différent du `_TZE284_81yrt3lo`, partage son interview aussi.

---

**Résumé :**

| Appareil | Status | Driver |
|----------|--------|--------|
| ZG-303Z |  Supporté | `soil_sensor` (temp/humidity) |
| _TZE284_81yrt3lo |  Supporté | `power_clamp_meter` |

**Actions :**
1. Mets à jour vers la dernière version
2. Supprime et ré-appaire les appareils
3. Si tu as un VRAI contact sensor, partage son interview (texte, pas vidéo) 

---

