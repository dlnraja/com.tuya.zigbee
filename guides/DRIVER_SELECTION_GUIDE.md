# 📖 Guide de Sélection de Driver - Universal Tuya Zigbee

**Version:** v2.15.55+  
**Drivers:** 183 drivers disponibles  
**Pour:** Homey Pro utilisateurs

---

## 🔍 COMMENT TROUVER VOTRE DRIVER

### Méthode 1: Par Type de Device

#### 🚨 **Capteurs de Mouvement (Motion Sensors)**

| Votre Device | Driver à Choisir | Rechercher |
|--------------|------------------|------------|
| Capteur mouvement + lumière + température | **Multi-Sensor (Motion + Lux + Temp) (Battery)** | "Multi" ou "Lux" |
| Capteur mouvement PIR basique | **PIR Motion Sensor (Battery)** | "PIR" |
| Capteur mouvement avec lumière | **Motion Sensor with Illuminance (Battery)** | "Illuminance" |
| Capteur mouvement mmWave/Radar | **Smart Motion Sensor (mmWave) (Battery)** | "mmWave" |
| Capteur présence Radar | **Radar Presence Sensor (mmWave) (Battery)** | "Presence" |

**Exemples de devices:**
- HOBEIAN ZG-204ZL → Multi-Sensor (Motion + Lux + Temp) (Battery)
- Tuya PIR basique → PIR Motion Sensor (Battery)

---

#### 🎛️ **Boutons & Télécommandes (Buttons/Remotes)**

| Votre Device | Driver à Choisir | Rechercher |
|--------------|------------------|------------|
| 1 bouton | **1-Button Remote (Battery)** | "1-Button" |
| 2 boutons | **2-Button Remote (Battery)** | "2-Button" |
| 3 boutons | **3-Button Remote (Battery)** | "3-Button" |
| 4 boutons | **4-Button Remote (Battery)** | "4-Button" |
| Bouton SOS | **SOS Emergency Button (Battery)** | "SOS" |

**Exemples de devices:**
- TS0041 (_TZ3000_5bpeda8u) → 4-Button Remote (Battery)
- Aqara button → 1-Button Remote (Battery)

---

#### 💡 **Interrupteurs Muraux (Wall Switches)**

| Votre Device | Driver à Choisir | Rechercher |
|--------------|------------------|------------|
| Interrupteur 1 bouton (secteur) | **1-Gang Wall Switch (AC)** | "1-Gang" |
| Interrupteur 2 boutons (secteur) | **2-Gang Wall Switch (AC)** | "2-Gang" |
| Interrupteur 3 boutons (secteur) | **3-Gang Wall Switch (AC)** | "3-Gang" |

**Note:** AC = Alimenté secteur (pas de batterie)

---

#### 🌡️ **Capteurs Température & Humidité**

| Votre Device | Driver à Choisir | Rechercher |
|--------------|------------------|------------|
| Température + Humidité (batterie) | **Temperature & Humidity Sensor (Battery)** | "Humidity" |
| Température seule | **Temperature Sensor** | "Temperature" |
| Multi-capteur air (temp/humid/pression) | **Air Quality Monitor** | "Air Quality" |

---

#### 🚪 **Capteurs de Contact (Door/Window)**

| Votre Device | Driver à Choisir | Rechercher |
|--------------|------------------|------------|
| Capteur porte/fenêtre | **Door/Window Sensor (Battery)** | "Door" ou "Window" |
| Capteur fuite d'eau | **Water Leak Sensor (Battery)** | "Leak" |
| Capteur vibration | **Vibration Sensor (Battery)** | "Vibration" |

---

#### 💡 **Ampoules (Bulbs)**

| Votre Device | Driver à Choisir | Rechercher |
|--------------|------------------|------------|
| Ampoule RGB + blanc froid/chaud | **RGB+CCT Smart Bulb (AC)** | "RGB" ou "CCT" |
| Ampoule RGB seulement | **RGB Smart Bulb (AC)** | "RGB" |
| Ampoule blanc variable | **CCT Smart Bulb (AC)** | "CCT" |
| Ampoule dimmable simple | **Dimmable Bulb (AC)** | "Dimmable" |

---

#### 🔌 **Prises & Plugs**

| Votre Device | Driver à Choisir | Rechercher |
|--------------|------------------|------------|
| Prise intelligente simple | **Smart Plug (AC)** | "Plug" |
| Prise avec mesure énergie | **Smart Plug with Energy Monitor (AC)** | "Energy" |
| Multiprise | **Power Strip (AC)** | "Strip" |

---

#### 🪟 **Rideaux & Volets (Curtains)**

| Votre Device | Driver à Choisir | Rechercher |
|--------------|------------------|------------|
| Moteur rideau (batterie) | **Curtain/Blind Motor (Battery)** | "Curtain" |
| Moteur rideau (secteur) | **Curtain Motor (AC)** | "Curtain" |

---

### Méthode 2: Par Recherche dans l'App

**Étapes:**
1. Ouvrir Homey app
2. Aller dans "Ajouter un appareil"
3. Chercher "Universal Tuya Zigbee"
4. **Utiliser la barre de recherche**

**Mots-clés efficaces:**
- "Motion" → Capteurs mouvement
- "Multi" → Multi-capteurs
- "Button" → Boutons/Télécommandes
- "Gang" → Interrupteurs muraux
- "Sensor" → Tous capteurs
- "Bulb" → Ampoules
- "Plug" → Prises
- "Battery" → Appareils à batterie
- "AC" → Appareils secteur

---

### Méthode 3: Par Manufacturer ID

**Si vous connaissez le Manufacturer ID de votre device:**

#### Tuya Motion Sensors:
- `_TZ3000_mmtwjmaq` → Multi-Sensor (Motion + Lux + Temp)
- `_TZ3000_kmh5qpmb` → PIR Motion Sensor

#### Tuya Buttons:
- `_TZ3000_5bpeda8u` → 4-Button Remote
- `_TZ3000_tk3s5tyg` → 1-Button Remote

#### Tuya Switches:
- `TS0001` → 1-Gang Wall Switch
- `TS0002` → 2-Gang Wall Switch
- `TS0003` → 3-Gang Wall Switch

**Comment trouver votre Manufacturer ID:**
1. Essayer de pairer le device
2. Regarder dans "Zigbee Info" ou logs
3. Chercher "_TZ" ou "TS" dans le nom

---

## 🎯 CAS D'USAGE SPÉCIFIQUES

### HOBEIAN ZG-204ZL (Motion + Lux)
```
✅ Driver: Multi-Sensor (Motion + Lux + Temp) (Battery)
📦 Manufacturer: HOBEIAN
🔢 Model: ZG-204ZL
🛒 AliExpress: 1005006918768626

Fonctionnalités:
- Détection mouvement PIR
- Mesure luminosité (lux)
- Mesure température
- Mesure humidité
- Batterie
```

### TS0041 4-Gang Button
```
✅ Driver: 4-Button Remote (Battery)
📦 Manufacturer: _TZ3000_5bpeda8u
🔢 Model: TS0041
🛒 AliExpress: 1005008942665186

Fonctionnalités:
- 4 boutons indépendants
- Flow cards par bouton
- Batterie CR2032
```

---

## 🔧 TROUBLESHOOTING

### "Mon device ne se pair pas"

**Solutions:**
1. **Vérifier le bon driver:**
   - Motion sensor → Chercher "Motion" ou "Multi"
   - Button → Chercher "[nombre]-Button"
   - Switch → Chercher "[nombre]-Gang"

2. **Mode pairing:**
   - Presser bouton pairing 3-5 secondes
   - LED doit clignoter rapidement
   - Réessayer si échec

3. **Version app:**
   - Vérifier vous avez v2.15.55+
   - Updates GitHub Issues #1267 & #1268 intégrés

4. **Distance:**
   - Appareil à < 2m du Homey
   - Pas d'interférences métalliques

---

### "Mauvais driver sélectionné"

**Si vous avez déjà pairé avec mauvais driver:**

1. **Supprimer le device** dans Homey app
2. **Réinitialiser le device:**
   - Presser reset 10+ secondes
   - LED clignote → device reset
3. **Re-pairer** avec bon driver
4. **Tester fonctionnalités**

---

### "Toutes les fonctions ne marchent pas"

**Exemples:**

**Multi-Sensor (Motion + Lux + Temp):**
- ✅ Motion toujours fonctionne
- ✅ Lux toujours fonctionne
- ⚠️ Temperature: Dépend du modèle exact
- ⚠️ Humidity: Dépend du modèle exact

**Solution:** C'est normal, certains variants n'ont pas toutes les fonctions.

---

## 📊 DRIVERS PAR CATÉGORIE

### Total: 183 Drivers

**Sensors (Capteurs):** ~80 drivers
- Motion sensors: 10
- Temperature/Humidity: 15
- Door/Window: 8
- Air Quality: 12
- Multi-sensors: 10
- Autres: 25

**Switches (Interrupteurs):** ~30 drivers
- Wall switches: 15
- Button remotes: 8
- Dimmer switches: 7

**Lighting (Éclairage):** ~25 drivers
- Bulbs RGB/CCT: 10
- LED strips: 8
- Controllers: 7

**Power (Alimentation):** ~20 drivers
- Smart plugs: 12
- Power strips: 5
- Energy monitors: 3

**Curtains/Covers:** ~10 drivers
- Curtain motors: 6
- Blind motors: 4

**Other (Autres):** ~18 drivers
- Sirens/Alarms: 5
- Locks: 3
- Thermostats: 5
- Valves: 5

---

## 🆕 NOUVEAUTÉS v2.15.55

### Drivers Renommés (Plus Clairs):
✅ Motion Temp Humidity Illumination Multi → **Multi-Sensor (Motion + Lux + Temp)**  
✅ Wireless Switch 4gang → **4-Button Remote**  
✅ Wall Switch Double Gang → **2-Gang Wall Switch**

### Devices Ajoutés:
✅ HOBEIAN ZG-204ZL (productId ajouté)  
✅ _TZ3000_5bpeda8u (4-gang variant)

### Fixes:
✅ IAS Zone enrollment (motion sensors)  
✅ 4-gang endpoints configuration  
✅ GitHub Actions workflow

---

## 💡 CONSEILS

### Avant de Pairer:

1. **Lire la description du driver**
2. **Vérifier les capabilities:**
   - Motion? Temperature? Humidity?
   - Combien de boutons/gangs?
3. **Vérifier power mode:**
   - (Battery) = Batterie
   - (AC) = Secteur
4. **Préparer le device:**
   - Batterie chargée/installée
   - À portée Zigbee
   - Mode pairing activé

### Pendant le Pairing:

1. **Suivre les instructions**
2. **Attendre LED confirmation**
3. **Ne pas bouger le device**
4. **Patience:** Peut prendre 30-60 secondes

### Après le Pairing:

1. **Tester toutes les fonctions**
2. **Créer flows si besoin**
3. **Nommer le device clairement**
4. **Vérifier battery reporting**

---

## 🔗 RESSOURCES

**Documentation:**
- README.md - Introduction app
- CONTRIBUTING.md - Comment contribuer
- UX_IMPROVEMENT_PLAN.md - Améliorations futures

**Support:**
- Forum: https://community.homey.app/t/140352
- GitHub Issues: https://github.com/JohanBendz/com.tuya.zigbee/issues
- Diagnostic: Générer rapport dans Homey app

**Updates:**
- GitHub: https://github.com/dlnraja/com.tuya.zigbee
- Homey App Store: Automatic updates

---

## ❓ FAQ

**Q: Combien de drivers dois-je installer?**  
A: Un seul! L'app contient TOUS les 183 drivers.

**Q: Mon device n'est pas dans la liste?**  
A: Essayez un driver similaire. Exemple: Motion sensor inconnu → PIR Motion Sensor

**Q: Différence (Battery) vs (AC)?**  
A: (Battery) = Alimenté par piles. (AC) = Branché secteur.

**Q: Puis-je changer de driver après pairing?**  
A: Non. Il faut supprimer device et re-pairer avec bon driver.

**Q: Quel driver pour Aqara/Xiaomi?**  
A: Cette app supporte Tuya principalement. Aqara → App officielle Aqara.

**Q: Support Thread/Matter?**  
A: En développement. Actuellement Zigbee seulement.

---

## 📞 OBTENIR DE L'AIDE

### Si Vous Êtes Bloqué:

1. **Générer diagnostic report** dans Homey app
2. **Poster sur forum** avec:
   - Model ID du device
   - Manufacturer name
   - Driver essayé
   - Diagnostic report ID
3. **GitHub Issue** si c'est un bug

### Informations Utiles à Fournir:

- ✅ Model ID (ex: ZG-204ZL)
- ✅ Manufacturer (ex: HOBEIAN, _TZ3000_xxx)
- ✅ Lien AliExpress/Amazon du produit
- ✅ Version app (ex: v2.15.55)
- ✅ Diagnostic report ID

---

**Dernière mise à jour:** 2025-10-13  
**Version app:** v2.15.55+  
**Auteur:** Dylan Rajasekaram

---

**Bon pairing! 🎉**
