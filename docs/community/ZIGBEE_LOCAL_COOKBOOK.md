# 🧑‍🍳 Zigbee Local Cookbook - Universal Tuya Zigbee

**Complete Guide to Local Zigbee Control**

---

## 🎯 Core Principle

**Local-First:** All communication happens directly between Homey and your Zigbee devices. No cloud, no internet dependency, complete privacy.

---

## 📚 Table of Contents

1. [Pairing Propre](#pairing-propre)
2. [Réseau & Stabilité](#réseau--stabilité)
3. [Réparation / Ré-appairage](#réparation--ré-appairage)
4. [Spécificités Tuya (TS0601 / DPs)](#spécificités-tuya-ts0601--dps)
5. [Dépannage Fréquent](#dépannage-fréquent)
6. [Optimisation Mesh](#optimisation-mesh)
7. [Troubleshooting Avancé](#troubleshooting-avancé)

---

## 1. Pairing Propre

### Préparation

**Avant de commencer:**
- ✅ Homey à jour (firmware latest)
- ✅ App Universal Tuya Zigbee installée
- ✅ Pas de saturation réseau (pause autres pairings)
- ✅ Distance idéale: **<2m de Homey**

### Factory Reset Devices

**Smart Plugs / Outlets:**
```
1. Brancher le plug
2. Maintenir bouton 5-10 secondes
3. LED clignote rapidement (mode pairing)
4. Si pas de bouton: ON/OFF 5x rapidement
```

**Sensors (Battery):**
```
1. Retirer batterie 10 secondes
2. Réinsérer batterie
3. Maintenir bouton reset 5 secondes
4. LED clignote (si présente)
```

**Smart Bulbs:**
```
1. ON/OFF 5x rapidement (1 sec interval)
2. Bulb clignote ou change couleur
3. Prête à pairing
```

**Switches / Dimmers:**
```
1. Couper alimentation (disjoncteur)
2. Attendre 10 secondes
3. Rallumer tout en maintenant bouton
4. LED indique mode pairing
```

**Thermostats:**
```
1. Menu settings
2. Factory reset option
3. Confirmer
4. Display indique mode pairing
```

### Processus Pairing Homey

**Étapes:**
```
1. Homey App → Ajouter Device
2. Chercher "Universal Tuya Zigbee"
3. Sélectionner catégorie device:
   - Smart Plug
   - Temperature Sensor
   - Motion Sensor
   - etc.
4. Factory reset device (voir ci-dessus)
5. Placer device <2m Homey
6. Attendre détection (10-60 secondes)
7. Device apparaît → Nommer → Terminer
```

**Timing:**
- Pairing standard: 10-30 secondes
- Battery devices: 30-60 secondes (wake-up cycles)
- Timeout: 2 minutes max

### Après Pairing

**Vérifications immédiates:**
- ✅ Device apparaît dans liste
- ✅ On/Off fonctionne (actuators)
- ✅ Première valeur reçue (sensors)
- ✅ Test offline: débrancher internet → fonctionne?

**Attendre premiers reports:**
- Temperature: 5-10 minutes
- Battery: 1-24 heures (premier cycle)
- Humidity: 5-10 minutes
- Motion: immédiat (après trigger)

---

## 2. Réseau & Stabilité

### Architecture Mesh Zigbee

**Principes:**
```
Coordinator (Homey)
    ↓
Router (Smart Plug AC)
    ↓
End Device (Battery Sensor)
```

**Rôles:**
- **Coordinator:** Homey (1 seul)
- **Routers:** Devices AC power (plugs, bulbs, switches)
- **End Devices:** Battery sensors (motions, doors, temp)

### Multiplier Routers = Meilleur Réseau

**Placement stratégique:**
```
Smart Plug AC = Router automatique

Exemple maison 100m²:
- 2x Smart Plugs salon (répéteurs)
- 1x Smart Plug cuisine
- 1x Smart Plug chambre
- 1x Ampoule couloir
= 5 routers → excellente couverture
```

**Distance idéale:**
- Router ↔ Router: 10-15m max
- End Device ↔ Router: 7-10m max
- Obstacles: murs béton = réduire distance

### Canaux Zigbee vs Wi-Fi

**Interférences à éviter:**

Wi-Fi 2.4GHz vs Zigbee overlap:
```
Wi-Fi Channel 1 (2412 MHz) → Zigbee 11-14
Wi-Fi Channel 6 (2437 MHz) → Zigbee 15-20
Wi-Fi Channel 11 (2462 MHz) → Zigbee 21-26
```

**Meilleurs canaux Zigbee:**
- ✅ Canal 15 (minimal overlap Wi-Fi 1/6)
- ✅ Canal 20 (entre Wi-Fi 6/11)
- ✅ Canal 25 (minimal overlap Wi-Fi 11)

**Changer canal Zigbee Homey:**
```
Settings → Zigbee → Advanced → Channel
Recommandé: 15, 20, ou 25
Note: Re-pairing après changement!
```

### Qualité Signal (LQI)

**Link Quality Indicator:**
```
LQI 255 = Excellent (distance proche)
LQI 200-254 = Très bon
LQI 150-199 = Bon
LQI 100-149 = Acceptable
LQI 50-99 = Faible (instable)
LQI <50 = Critique (déconnexions)
```

**Vérifier LQI:**
```
Homey Developer Tools → Zigbee → Device → LQI
```

**Améliorer LQI faible:**
1. Ajouter router entre device et Homey
2. Réduire distance
3. Retirer obstacles métalliques
4. Changer canal Zigbee
5. Éloigner Wi-Fi routers

---

## 3. Réparation / Ré-appairage

### Quand Ré-appairer?

**Symptômes:**
- ❌ Capabilities manquantes
- ❌ Valeurs figées (battery 0%, temp null)
- ❌ Device offline régulièrement
- ❌ Commands non exécutées
- ❌ Wrong driver detected

### Processus Complet

**Étape par étape:**

```
1. SUPPRIMER proprement:
   Homey → Device → Settings → Remove
   Attendre confirmation complète

2. FACTORY RESET device:
   (voir section 1 selon type)
   IMPORTANT: Reset complet obligatoire!

3. ATTENDRE 30 secondes:
   Permet nettoyage réseau Zigbee
   
4. PAIRING à proximité:
   Distance <2m Homey
   Éviter interférences actives
   
5. LAISSER initialiser:
   Ne pas toucher 2-5 minutes
   Attendre premiers reports
   
6. TESTER offline:
   Débrancher internet
   Vérifier fonctionnement local
```

### Cas Spéciaux

**Battery sensors stuck 0%:**
```
1. Retirer batterie 30 secondes
2. Ré-appairer device
3. Attendre 1-24h premier report
4. Si persiste: changer batterie
```

**Temperature/Humidity null:**
```
1. Vérifier mesh (LQI >100)
2. Attendre 10-15 minutes
3. Trigger manuel (si bouton)
4. Si persiste: ré-appairer
```

**Wrong type detected:**
```
Exemple: Temp sensor → Smoke detector

Fix:
1. Supprimer device
2. Forum: poster diagnostic report
3. Attendre driver overlap fix
4. Re-pairing après fix
```

---

## 4. Spécificités Tuya (TS0601 / DPs)

### Qu'est-ce qu'un DP (Data Point)?

**Tuya proprietary system:**
```
DP = Data Point = Fonction device
Exemple thermostat:
  DP1: Current temperature (°C × 10)
  DP2: Target temperature (°C × 10)
  DP3: Mode (0=off, 1=heat, 2=cool)
  DP15: Battery (0-100%)
```

### Device TS0601

**Identification:**
```
manufacturerName: _TZE200_*, _TZE204_*, _TZ3000_*
modelId: TS0601
Cluster: 0xEF00 (Tuya proprietary)
```

**Notre moteur gère:**
- ✅ Conversion DP → Homey capabilities
- ✅ Scales (×0.1, ×0.5, etc.)
- ✅ Enums (modes, presets)
- ✅ Ranges (0-100, 5-35°C)

### Modes & Presets

**Thermostats:**
```
Homey capability: thermostat_mode
Values: heat, cool, auto, off

DP mapping:
  DP3 = 0 → off
  DP3 = 1 → heat
  DP3 = 2 → cool
  DP3 = 3 → auto
```

**Curtain Controllers:**
```
Homey capability: windowcoverings_state
Values: up, idle, down

DP mapping:
  DP1 = 0 → open
  DP1 = 1 → stop
  DP1 = 2 → close
  
Position:
  DP2 = 0-100 (reversed sometimes)
```

### Scales Fréquentes

**Temperature:**
```
Raw DP value: 235
Scale: ×0.1
Homey value: 23.5°C
```

**Target Temperature:**
```
Raw DP value: 40
Scale: ×0.5
Homey value: 20.0°C
```

**Humidity:**
```
Raw DP value: 65
Scale: 1 (direct)
Homey value: 65%
```

---

## 5. Dépannage Fréquent

### Device Offline

**Causes & Solutions:**

**1. Battery faible:**
```
Symptôme: Offline intermittent
Solution: Changer batterie
Check: Last seen > 24h
```

**2. LQI trop faible:**
```
Symptôme: Offline régulier
Solution: Ajouter router
Check: LQI < 100
```

**3. Interférences:**
```
Symptôme: Tous devices instables
Solution: Changer canal Zigbee
Check: Wi-Fi saturation 2.4GHz
```

**4. Distance excessive:**
```
Symptôme: Edge devices offline
Solution: Réduire distance ou router
Check: >15m sans router
```

### Pairing Échoue

**Checklist:**
```
❌ Factory reset incomplet
   → Ré-essayer reset (10-20 sec)

❌ Distance trop grande
   → Pairing <2m obligatoire

❌ Interférences actives
   → Éteindre micro-ondes, Wi-Fi temporairement

❌ Canal Zigbee saturé
   → Changer canal, réessayer

❌ Device déjà appairé ailleurs
   → Factory reset COMPLET d'abord
```

### Energy Monitoring Absent

**Smart plugs sans measure_power:**

**Causes:**
```
1. Driver générique détecté
2. Product ID inconnu
3. Capability absente driver
```

**Solutions:**
```
1. Vérifier manufacturerName exact
2. GitHub: Device Request (fingerprint)
3. Attendre driver enrichi
4. Ou acheter modèle confirmé
```

### Positions Volets Inversées

**Curtain 0% = fermé, mais device 0% = ouvert:**

**Fix temporaire:**
```
Settings device → Advanced → Invert Position
```

**Fix permanent:**
```
Driver profile: invertPosition: true
GitHub: Report issue avec manufacturerName
```

---

## 6. Optimisation Mesh

### Architecture Idéale

**Maison 100m² (exemple):**

```
Étage 1:
  Salon: 2x Smart Plugs (routers)
  Cuisine: 1x Smart Plug
  Couloir: 1x Ampoule Zigbee
  
Étage 2:
  Chambre 1: 1x Smart Plug
  Chambre 2: 1x Ampoule
  Salle bain: 1x Smart Plug

Total: 7 routers
Coverage: excellente
End devices: 15-20 sensors
```

### Règles d'Or

**1. Router tous les 10-15m:**
```
Murs béton = réduire à 7-10m
```

**2. End devices <10m nearest router:**
```
Battery sensors près routers
```

**3. Éviter obstacles métalliques:**
```
Murs béton armé
Miroirs
Réfrigérateurs
Micro-ondes actifs
```

**4. Pas de router USB:**
```
Smart plugs AC meilleurs que dongles USB
Moins interférences
Plus fiables
```

### Test Mesh Health

**Commandes:**
```
1. Homey Developer Tools
2. Zigbee → Devices
3. Check LQI chaque device
4. Check routing table
5. Identifier weak links
```

**Valeurs targets:**
- All LQI >150: Excellent
- Most LQI >100: Bon
- Any LQI <50: Action requise

---

## 7. Troubleshooting Avancé

### Logs Diagnostiques

**Accéder logs:**
```
Homey → Settings → Apps
→ Universal Tuya Zigbee → View Logs
```

**Chercher:**
```
[Device Name] → Erreurs
Zigbee → Timeouts
Cluster → Failed writes
DP → Conversion errors
```

### Diagnostic Reports

**Générer:**
```
Device Settings → Advanced → Create Diagnostic Report
```

**Partager:**
```
GitHub Issue ou Forum post
Inclure:
- manufacturerName
- modelId
- Symptôme exact
- Steps to reproduce
```

### Interview Device

**Forcer interview complete:**
```
Developer Tools → Zigbee → Device → Interview

Use cases:
- Capabilities manquantes
- Attributes non détectés
- Clusters cachés
- DP discovery
```

### Network Heal

**Quand:**
- Après ajout plusieurs routers
- Après déplacement devices
- Performances dégradées
- Routing suboptimal

**Comment:**
```
Méthode 1: Power cycle
  Éteindre Homey 30 sec
  Rallumer
  Attendre 10 min stabilisation

Méthode 2: Rebuild routes
  Redémarrer routers un par un
  Attendre 2-3 min entre chaque
  Réseau se réorganise
```

---

## 🎯 Checklist Optimisation Complète

### Réseau
- [ ] Canal Zigbee optimal (15, 20, ou 25)
- [ ] 1 router tous les 10-15m
- [ ] LQI tous devices >100
- [ ] Wi-Fi 2.4GHz non saturé
- [ ] Pas d'obstacles métalliques

### Devices
- [ ] Batteries fraîches (<1 an)
- [ ] Factory reset avant pairing
- [ ] Distance <2m pendant pairing
- [ ] Test offline après pairing
- [ ] Capabilities présentes

### Performance
- [ ] No offline devices
- [ ] Latency <50ms (local)
- [ ] Reports réguliers (sensors)
- [ ] Commands instantanées (actuators)
- [ ] Energy monitoring accurate

---

## 📚 Resources

**Documentation:**
- `/docs/v3/LOCAL_FIRST_COMPLETE_V3.md`
- `/docs/forum/IAS_ZONE_ENROLLMENT_FIX_CRITICAL.md`
- `/docs/community/SMART_PLUGS_FAQ.md`

**Support:**
- GitHub Issues (templates disponibles)
- Forum Homey Community
- Device matrix (CI artifacts)

**Tools:**
- Homey Developer Tools
- Zigbee Channel Scanner
- Network Analyzer Apps

---

**🔥 Remember:** Local Zigbee = No internet required. Si ça ne fonctionne pas offline, c'est pas local!

*Last updated: October 16, 2025*
