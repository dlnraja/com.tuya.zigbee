# 🔧 PLAN D'INTÉGRATION - CLICK SMART+ (Scolmore)

**Date:** 16 Octobre 2025  
**Marque:** Click Smart+ by Scolmore  
**Appareils:** 22 Zigbee identifiés (16 confirmés + 6 à tester)  
**Priorité:** MEDIUM-HIGH  
**Durée estimée:** 2-3 heures

---

## 🎯 OBJECTIF

Enrichir l'app **Universal Tuya Zigbee** avec tous les appareils Click Smart+ Zigbee pour que les utilisateurs UK puissent facilement pairer et utiliser ces devices.

**Résultat attendu:**
- ✅ 16 appareils confirmés intégrés (sockets + sensors)
- 🔄 6 modules à tester documentés
- ✅ Pairing guides créés
- ✅ Images ajoutées
- ✅ Documentation utilisateur

---

## 📋 PHASE 1: AUDIT DRIVERS EXISTANTS (30 min)

### 1.1 Vérifier Sockets (CMA300xx, VPSCxx, VPCHxx)

**Action:**
```bash
# Chercher drivers existants pour TS011F
grep -r "TS011F" drivers/
grep -r "CMA300" drivers/
grep -r "Click Smart" drivers/
```

**Drivers potentiels:**
- `drivers/smart_switch_socket_1_gang/` → Pour CMA30035
- `drivers/smart_switch_socket_2_gang/` → Pour CMA30036
- `drivers/smart_socket_tuya/` → Générique
- `drivers/fused_spur/` ou similaire → Pour CMA30651

**Checklist:**
- [ ] Identifier quel driver gère TS011F (1 gang)
- [ ] Identifier quel driver gère TS011F (2 gang)
- [ ] Vérifier si FCU (fused connection unit) a un driver
- [ ] Lister les Product IDs actuels dans ces drivers

### 1.2 Vérifier Sensors (CSP03x)

**Action:**
```bash
# Chercher drivers existants pour sensors
grep -r "door.*window.*sensor" drivers/
grep -r "PIR.*sensor" drivers/
grep -r "temperature.*humidity.*sensor" drivers/
grep -r "CSP03" drivers/
```

**Drivers potentiels:**
- `drivers/door_window_sensor_battery/` → Pour CSP031
- `drivers/motion_sensor_battery/` ou `pir_sensor/` → Pour CSP032
- `drivers/temperature_humidity_sensor_battery/` → Pour CSP033

**Checklist:**
- [ ] Identifier driver pour door/window sensor
- [ ] Identifier driver pour PIR motion sensor
- [ ] Identifier driver pour temp/humidity sensor
- [ ] Vérifier Product IDs existants

---

## 📋 PHASE 2: ENRICHISSEMENT DRIVERS (1h)

### 2.1 Enrichir Smart Sockets

**Fichiers à modifier:**

#### A. Driver 1 Gang Socket (CMA30035 + VPSC/VPCH 1G)
**Fichier:** `drivers/[driver_1gang_socket]/driver.compose.json`

**Ajouter dans `productId`:**
```json
"productId": [
  "...", // IDs existants
  "CMA30035",
  "VPSC30535BK", "VPSC30535WH", "VPSC30535GY",
  "VPCH30535BK", "VPCH30535WH"
]
```

**Ajouter dans `manufacturer names`:**
```json
"manufacturerName": [
  "...", // existants
  "Click Smart+",
  "Scolmore",
  "_TYZB01_hlla45kx"
]
```

#### B. Driver 2 Gang Socket (CMA30036 + VPSC/VPCH 2G)
**Fichier:** `drivers/[driver_2gang_socket]/driver.compose.json`

**Ajouter dans `productId`:**
```json
"productId": [
  "...", // IDs existants
  "CMA30036",
  "VPSC30536BK", "VPSC30536WH", "VPSC30536GY",
  "VPCH30536BK", "VPCH30536WH"
]
```

**Ajouter dans `manufacturer names`:**
```json
"manufacturerName": [
  "...", // existants
  "Click Smart+",
  "Scolmore",
  "_TYZB01_hlla45kx"
]
```

#### C. Driver Fused Connection Unit (CMA30651)
**Option 1:** Si driver FCU existe
- Ajouter CMA30651 dans productId

**Option 2:** Si pas de driver FCU
- Créer nouveau driver basé sur smart socket
- Ou ajouter CMA30651 dans driver socket existant

### 2.2 Enrichir Sensors

#### A. Door/Window Sensor (CSP031)
**Fichier:** `drivers/door_window_sensor_battery/driver.compose.json`

**Ajouter:**
```json
"productId": [
  "...",
  "CSP031"
],
"manufacturerName": [
  "...",
  "Click Smart+",
  "Scolmore"
]
```

#### B. PIR Motion Sensor (CSP032)
**Fichier:** `drivers/motion_sensor_battery/driver.compose.json` ou `pir_sensor/`

**Ajouter:**
```json
"productId": [
  "...",
  "CSP032"
],
"manufacturerName": [
  "...",
  "Click Smart+",
  "Scolmore"
]
```

#### C. Temperature/Humidity Sensor (CSP033)
**Fichier:** `drivers/temperature_humidity_sensor_battery/driver.compose.json`

**Ajouter:**
```json
"productId": [
  "...",
  "CSP033"
],
"manufacturerName": [
  "...",
  "Click Smart+",
  "Scolmore"
]
```

---

## 📋 PHASE 3: IMAGES (30 min)

### 3.1 Télécharger Images Produits

**Sources:**
- Site Scolmore: https://scolmore.com/products/click-smart
- Distributeurs: https://www.click4electrics.co.uk/
- Amazon UK listings

**Images requises (résolution 500x500 minimum):**

**Sockets:**
- CMA30035 (blanc 1G)
- CMA30036 (blanc 2G) ⭐ Priorité
- CMA30651 (FCU)
- VPSC30536 (chrome 2G) - optionnel si même que CMA30036

**Sensors:**
- CSP031 (door/window)
- CSP032 (PIR)
- CSP033 (temp/humidity)

### 3.2 Créer/Adapter Images

**Format:**
- Format: PNG ou JPG
- Résolution: 500x500px minimum
- Fond: Transparent ou blanc
- Nom: `[model_number].png` ou selon convention app

**Placement:**
- `.homeycompose/assets/images/[driver_id]/`
- Ou selon structure existante

---

## 📋 PHASE 4: DOCUMENTATION (30 min)

### 4.1 Créer Guide Utilisateur

**Fichier:** `docs/devices/click-smart-plus-guide.md`

**Contenu:**
- Présentation Click Smart+
- Liste appareils supportés avec photos
- Guide pairing par type (socket, sensor)
- Troubleshooting
- FAQ

### 4.2 Mettre à jour README

**Ajouter section:**
```markdown
### Click Smart+ (Scolmore) - UK Brand

**Supported Devices:**
- Smart Sockets 1G/2G (CMA30035/36, premium variants)
- Door/Window Sensor (CSP031)
- PIR Motion Sensor (CSP032)
- Temperature/Humidity Sensor (CSP033)
- And more...

**Note:** Click Smart+ uses Tuya Zigbee chipset. 
No Click hub required - works directly with Homey!
```

### 4.3 Notes de Version

**Fichier:** `CHANGELOG.md`

**Ajouter pour v3.0.14:**
```markdown
## [3.0.14] - 2025-10-XX

### Added
- ✨ Click Smart+ (Scolmore) brand support
  - 13 smart socket variants (1G/2G, standard & premium finishes)
  - 3 smart sensors (door/window, PIR motion, temp/humidity)
  - UK market leading smart home brand
- 📝 Click Smart+ user guide
- 🖼️ Product images for Click devices

### Changed
- 📚 Updated README with Click Smart+ section
```

---

## 📋 PHASE 5: TESTS (30 min - si devices disponibles)

### 5.1 Tests Pairing

**Si devices disponibles:**
- [ ] Test pairing CMA30036 (2 gang socket)
- [ ] Test pairing CSP033 (temp/humidity)
- [ ] Test pairing CSP031 (door/window)
- [ ] Vérifier toutes capabilities fonctionnent
- [ ] Tester mesh network (router function)

**Si pas de devices:**
- [ ] Validation théorique basée sur Zigbee2MQTT
- [ ] Validation specs techniques
- [ ] Marquer comme "Community tested" si confirmations users

### 5.2 Tests Fonctionnels

**Sockets:**
- [ ] On/Off switching
- [ ] Power on behaviour
- [ ] LED indicators
- [ ] Mesh routing

**Sensors:**
- [ ] Battery reporting
- [ ] Temperature/Humidity accuracy
- [ ] Motion detection
- [ ] Contact open/close

---

## 📋 PHASE 6: PUBLICATION (15 min)

### 6.1 Commit & Push

```bash
git add drivers/
git add docs/enrichment/CLICK_SMART_PLUS_*.md
git add .homeycompose/assets/images/
git add CHANGELOG.md
git add README.md

git commit -m "feat: Add Click Smart+ (Scolmore) Zigbee devices support

- Added 13 smart socket variants (CMA300xx, VPSCxx, VPCHxx)
- Added 3 smart sensors (CSP031/032/033)
- Added Click Smart+ user guide
- Added product images
- Updated README with Click Smart+ section

UK market leading brand, Tuya chipset compatible.
Works without Click hub - directly with Homey.

Devices: 16 confirmed compatible"

git push origin master
```

### 6.2 Release Notes

**Créer draft release v3.0.14:**
- Highlight Click Smart+ support
- Liste appareils ajoutés
- Photos des nouveaux devices
- Note pour utilisateurs UK

---

## 🎯 CHECKLIST COMPLET

### Recherche ✅
- [x] Identifier tous appareils Click Smart+ Zigbee
- [x] Vérifier compatibilité Tuya chipset
- [x] Documenter specs techniques
- [x] Créer liste complète

### Intégration 🔄
- [ ] Audit drivers existants
- [ ] Enrichir productIds sockets (13 variantes)
- [ ] Enrichir productIds sensors (3 modèles)
- [ ] Ajouter manufacturer names "Click Smart+", "Scolmore"
- [ ] Vérifier FCU driver (CMA30651)

### Assets 🔄
- [ ] Télécharger images produits
- [ ] Créer/adapter images (format correct)
- [ ] Placer dans structure app

### Documentation 🔄
- [ ] Guide utilisateur Click Smart+
- [ ] Section README
- [ ] Notes de version CHANGELOG
- [ ] Troubleshooting tips

### Tests 🔄
- [ ] Test pairing (si devices dispo)
- [ ] Validation fonctionnelle
- [ ] Community feedback

### Publication 🔄
- [ ] Commit changes
- [ ] Push to GitHub
- [ ] Draft release v3.0.14
- [ ] Announce on forum

---

## 📊 IMPACT ATTENDU

### Utilisateurs
✅ **Utilisateurs UK** peuvent maintenant utiliser Click Smart+ avec Homey  
✅ **16 devices** immédiatement supportés  
✅ **Guide complet** pour installation  
✅ **Pas besoin du hub Click** - économie £42  

### App
✅ **Couverture UK** améliorée (Click = marque leader UK)  
✅ **+16 devices** supportés  
✅ **Qualité** - fabricant réputé 30+ ans  
✅ **Fiabilité** - chipset Tuya standard  

### Communauté
✅ **Demandes UK** satisfaites  
✅ **Reviews positives** attendues  
✅ **Marketplace UK** mieux couvert  

---

## 💰 COÛT/BÉNÉFICE

### Coût
⏱️ **Temps:** 2-3 heures  
💰 **Devices pour tests:** £0 (validation communauté) ou ~£75 (socket + sensor)  

### Bénéfice
📈 **Nouveaux utilisateurs UK:** +50-100 estimé  
⭐ **Rating app:** Amélioration attendue  
🌍 **Couverture marché:** UK market leader  
✅ **Qualité:** Devices certifiés, garantie 3 ans  

**ROI:** EXCELLENT - Effort minimal, impact UK important

---

## 🚀 NEXT STEPS APRÈS INTÉGRATION

### Court terme
1. Monitor user feedback
2. Répondre questions forum
3. Collecter diagnostics si issues
4. Ajuster drivers si nécessaire

### Moyen terme
1. Tester modules CSP041/051/071 (switching/dimming)
2. Créer drivers spécialisés si requis
3. Enrichir avec plus de Product IDs si découverts

### Long terme
1. Contact Scolmore pour partnership?
2. Featured dans marketing Click Smart+?
3. UK electricians awareness

---

*Plan créé: 16 Octobre 2025*  
*Durée estimée: 2-3 heures*  
*Priorité: MEDIUM-HIGH*  
*Impact: UK market coverage +significatif*  
*Status: PRÊT À EXÉCUTER*
