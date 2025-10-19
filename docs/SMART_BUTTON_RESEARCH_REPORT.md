# 📱 SMART BUTTON TUYA - RAPPORT DE RECHERCHE AVANCÉE

## 🎯 Contexte - Problème Forum Homey Community

**Post #141 - W_vd_P (fcam):**
- **Device**: Bouton Tuya AliExpress (item 1005007769107379)
- **Symptôme**: Device ajouté puis disparaît immédiatement, LED bleue clignote longtemps
- **Impact**: Impossible d'interviewer le device car ne reste pas connecté
- **Besoin**: Améliorer stabilité connexion Zigbee pour boutons/switches

---

## 🔍 Résultats Recherches Google Avancées

### 1. Manufacturer IDs Identifiés - Boutons Scene Switch

#### TS0041 (1 Bouton)
- `_TZ3000_adndolvx` ✅
- `_TZ3000_mrpevh8p` ✅
- `_TZ3000_tk3s5tyg` ✅
- `_TZ3000_vp6clf9d` ✅
- `_TZ3000_itb0omhv` ✅ (Forum deCONZ)
- `_TYZB02_keyjhapk` ✅ (ZHA Issue #663)

#### TS0042 (2 Boutons)
- `_TZ3000_xabckq1v` ✅
- `_TZ3000_w8jwkczz` ✅ (GitHub Dresden)
- `_TZ3000_an5rjiwd` ✅
- `_TYZB02_keyjhapk` ✅ (Confirmed ZHA)
- `_TZ3000_fvh3pjaz` ✅

#### TS0043 (3 Boutons)
- `_TZ3000_w8jwkczz` ✅ (Confirmed GitHub #5552)
- `_TYZB02_key8kk7r` ✅ (ZHA Issue #663)
- `_TZ3000_0ghwhypc` ✅
- `_TZ3000_0ht8dnxj` ✅

#### TS0044 / TS004F (4 Boutons)
- `_TZ3000_xabckq1v` ✅ (Confirmed multiple forums)
- `_TZ3000_01gpyda5` ✅
- `_TZ3000_0dumfk2z` ✅
- `_TZ3000_0s1izerx` ✅
- `_TZ3000_ji4araar` ✅
- `_TZ3000_qzjcsmar` ✅
- `_TZE200_81isopgh` ✅
- `_TZE200_m9skfctm` ✅
- `_TZE200_wfxuhoea` ✅

---

## 📊 Structure Zigbee - Boutons Tuya

### Endpoints Configuration
**Basé sur ZHA Device Handlers Issue #663:**

```json
{
  "TS0042": {
    "endpoints": {
      "1": {
        "profile_id": 260,
        "device_type": "0x0000",
        "in_clusters": ["0x0000", "0x0001", "0x0006"],
        "out_clusters": ["0x0019"]
      },
      "2": {
        "profile_id": 260,
        "device_type": "0x0000",
        "in_clusters": ["0x0000", "0x0001", "0x0006"],
        "out_clusters": ["0x0019"]
      }
    }
  },
  "TS0043": {
    "endpoints": {
      "1": { "in_clusters": ["0x0000", "0x0001", "0x0006"], "out_clusters": ["0x0019"] },
      "2": { "in_clusters": ["0x0000", "0x0001", "0x0006"], "out_clusters": ["0x0019"] },
      "3": { "in_clusters": ["0x0000", "0x0001", "0x0006"], "out_clusters": ["0x0019"] }
    }
  }
}
```

### Clusters Homey SDK3 (Numériques)
- **basic**: 0
- **powerConfiguration**: 1
- **identify**: 3
- **onOff**: 6
- **ota**: 25 (0x0019)

---

## 🐛 Problèmes Identifiés

### 1. Connexion Instable
- **Symptôme**: LED bleue clignote continuellement après pairing
- **Cause**: Manufacturer ID non reconnu ou quirks manquants
- **Solutions**:
  - Ajouter tous les manufacturer IDs découverts
  - Configurer endpoints multiples correctement
  - Bindings appropriés sur cluster powerConfiguration (1)

### 2. Actions Non Détectées
**Forum Home Assistant - Post 741195:**
- Single click ✅
- Double click ❌ (non détecté)
- Long click ❌ (non détecté)

**Cause**: Manque de traduction ZCL command 253 (custom Tuya command)

### 3. Compatibilité Multi-Plateformes
**Tuya Hub**: Fonctionne parfaitement (3 actions par bouton)
**Zigbee Coordinators**: Fonctionnalité partielle ou inexistante

---

## ✅ Solutions Recommandées

### 1. Enrichissement Manufacturer IDs
Ajouter TOUS les IDs découverts dans les drivers existants:
- `scene_controller_2button_cr2032`
- `scene_controller_4button_cr2032`
- `wireless_switch_1gang_cr2032`
- Créer `scene_controller_1button_cr2032` si manquant

### 2. Configuration Endpoints
**Multi-gang buttons doivent avoir endpoints séparés:**
```json
{
  "1gang": { "endpoints": { "1": {...} } },
  "2gang": { "endpoints": { "1": {...}, "2": {...} } },
  "3gang": { "endpoints": { "1": {...}, "2": {...}, "3": {...} } },
  "4gang": { "endpoints": { "1": {...}, "2": {...}, "3": {...}, "4": {...} } }
}
```

### 3. Driver Class
**Utiliser `"button"` class** (valide SDK3, pas `"switch"`):
```json
{
  "class": "button",
  "capabilities": ["onoff", "button.2", "button.3", "button.4", "measure_battery"],
  "energy": { "batteries": ["CR2032"] }
}
```

### 4. Amélioration Pairing
**Instructions de pairing optimisées:**
```
"Press and hold the button for 5 seconds until LED flashes rapidly (3-5 times per second).
If pairing fails, remove battery, wait 10 seconds, reinsert and try again."
```

---

## 📋 Sources Références

### GitHub Issues & PRs
- **ZHA Device Handlers #663**: TS0042/TS0043 manufacturer differences
- **Dresden deCONZ #5552**: TS0043 `_TZ3000_w8jwkczz`
- **OpenHAB Community**: TS0041/TS0042/TS0043 ZS3L support

### Documentation Technique
- **Zigbee2MQTT**: Support new Tuya devices guide
- **Zigbee Blakadder Database**: Comprehensive device listing
- **Home Assistant Community**: Wireless button support issues

### Forums
- **Homey Community #141**: Connection stability problem (fcam/W_vd_P)
- **Home Assistant #741195**: Tuya button functionality issues
- **Reddit r/homeassistant**: Button pairing problems

---

## 🎨 Design Standards (Memory 4c104af8)

**Boutons = Automation Category:**
- **Couleur**: Gray/blue (#607D8B, #455A64)
- **Icône**: Boutons reconnaissables (1, 2, 3, 4 boutons visibles)
- **Background**: Clean gradient professionnel
- **Taille**: 75x75 (small), 500x500 (large) PNG

---

## 🚀 Actions Immédiates

1. ✅ Créer driver `scene_controller_1button_cr2032` si manquant
2. ✅ Enrichir tous les drivers boutons avec manufacturer IDs découverts
3. ✅ Configurer endpoints multiples pour 2gang/3gang/4gang
4. ✅ Vérifier class "button" (SDK3 compliant)
5. ✅ Améliorer instructions pairing
6. ✅ Tester avec AliExpress item 1005007769107379 spécifique
7. ✅ Commit + push pour déclencher GitHub Actions

---

## 📝 Notes Techniques

### Tuya Custom Commands
- **Command 253 (0xFD)**: Custom Tuya command for multi-press detection
- **Datapoints**: DP1=action, DP101=battery
- **Actions**: 0=single, 1=double, 2=long

### Battery Management
- **Type**: CR2032 (most common), CR2450 (some 4-gang)
- **Reporting**: Cluster 1 (powerConfiguration)
- **Binding**: Essential pour battery updates

### Stability Tips
- Always include cluster 3 (identify) for interview process
- Bindings sur cluster 1 pour battery reporting
- Multiple manufacturer IDs augmentent compatibilité

---

**Date**: 2025-10-13
**Version**: 1.0
**Auteur**: Research Google Avancée + Analyse Multi-Sources
