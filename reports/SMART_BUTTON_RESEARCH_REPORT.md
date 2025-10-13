# SMART BUTTON TUYA - RAPPORT DE RECHERCHE APPROFONDIE

## PROBLÈME FORUM HOMEY IDENTIFIÉ

**Source**: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352?page=8

**Utilisateur**: W_vd_P (Cam)  
**Device**: Bouton Tuya AliExpress item 1005007769107379  
**Problème**: Device ajouté puis disparaît immédiatement, LED bleue clignote longtemps  
**Impact**: Impossible d'interviewer car ne reste pas connecté

## MANUFACTURER IDs CRITIQUES MANQUANTS

### Identifiés depuis Hubitat/Zigbee2MQTT/ZHA:

**TS0041 (1 bouton)**:
- `_TZ3000_4upl1fcj` ✅ DÉJÀ PRÉSENT
- `_TZ3000_xrqsdxq6` ❌ MANQUANT
- `_TZ3000_adkvzooy` ❌ MANQUANT  
- `_TZ3000_peszejy7` ❌ MANQUANT
- `_TZ3000_fa9mlvja` ❌ MANQUANT
- `_TZ3000_s0i14ubi` ❌ MANQUANT
- `_TZ3400_keyjqthh` ❌ MANQUANT
- `_TZ3400_tk3s5tyg` ❌ MANQUANT
- `_TYZB02_key8kk7r` ❌ MANQUANT

**TS0042 (2 boutons)**:
- `_TZ3000_dfgbtub0` ❌ MANQUANT

**TS0044 (4 boutons)**:
- `_TZ3000_wkai4ga5` ❌ MANQUANT

**TS004F (Scene Switch)**:
- `_TZ3000_xabckq1v` ✅ DÉJÀ PRÉSENT
- `_TZ3000_pcqjmcud` ❌ MANQUANT
- `_TZ3000_4fjiwweb` ❌ MANQUANT
- `_TZ3000_uri7ongn` ❌ MANQUANT
- `_TZ3000_ixla93vd` ❌ MANQUANT
- `_TZ3000_qja6nq5z` ❌ MANQUANT
- `_TZ3000_csflgqj2` ❌ MANQUANT
- `_TZ3000_abrsvsou` ❌ MANQUANT

## PROBLÈME TECHNIQUE: PAIRING INSTABLE

### Causes Identifiées:

1. **Batteries Faibles** (Zigbee2MQTT #15749):
   - Bon niveau batteries CRITIQUE pour pairing
   - LED clignotante = souvent batteries faibles
   - Recommandation: batteries neuves obligatoires

2. **Timeout de Pairing**:
   - TS0044: Maintenir bouton bas-gauche 10 secondes jusqu'à 4 LEDs clignotent
   - TS0041: Maintenir bouton reset 3 secondes jusqu'à LED clignote
   - Timeout trop court = device disparaît immédiatement

3. **Mode Switch vs Dimmer** (TS004F):
   - Certains modèles ont 2 modes: scene switch vs dimmer
   - Basculer mode: maintenir boutons 2+4 pendant 6 secondes
   - Mode incorrect = comportement erratique

4. **Manufacturer IDs Incomplets**:
   - Driver Homey ne reconnaît pas certains manufacturer IDs
   - Device ajouté comme "generic" puis disparaît
   - Solution: enrichir manufacturerName array

## CLUSTERS ZIGBEE STANDARDS

**TS0041/TS0042/TS0043/TS0044**:
- Input Clusters: `[0, 1, 6]` (Basic, Power, OnOff)
- Output Clusters: `[25, 10]` (OTA, Time)
- Endpoint: 1 seul pour tous boutons

**TS004F (Advanced)**:
- Input Clusters: `[0, 1, 3, 4, 6, 1000]`
- Output Clusters: `[25, 10, 3, 4, 5, 6, 8, 1000]`
- Support dimmer + scene modes

## SOLUTION RECOMMANDÉE

### 1. Enrichir Driver wireless_switch_1gang_cr2032

Ajouter manufacturer IDs manquants:
```json
{
  "zigbee": {
    "manufacturerName": [
      // Existants...
      // NOUVEAUX TS0041:
      "_TZ3000_xrqsdxq6",
      "_TZ3000_adkvzooy",
      "_TZ3000_peszejy7",
      "_TZ3000_fa9mlvja",
      "_TZ3000_s0i14ubi",
      "_TZ3400_keyjqthh",
      "_TZ3400_tk3s5tyg",
      "_TYZB02_key8kk7r"
    ]
  }
}
```

### 2. Enrichir Driver wireless_switch_2gang_cr2032

Ajouter:
```json
"_TZ3000_dfgbtub0"
```

### 3. Enrichir Driver wireless_switch_4gang_cr2450

Ajouter:
```json
"_TZ3000_wkai4ga5"
```

### 4. Enrichir Scene Controllers (TS004F)

Ajouter à scene_controller_4button_cr2032:
```json
[
  "_TZ3000_pcqjmcud",
  "_TZ3000_4fjiwweb",
  "_TZ3000_uri7ongn",
  "_TZ3000_ixla93vd",
  "_TZ3000_qja6nq5z",
  "_TZ3000_csflgqj2",
  "_TZ3000_abrsvsou"
]
```

### 5. Documentation Pairing Améliorée

Ajouter instructions learnmode plus détaillées:
- Vérifier batteries neuves AVANT pairing
- Durée précise maintien bouton (3s vs 10s)
- LED indicators à surveiller
- Troubleshooting si échec

## SOURCES COMPLÈTES

1. **Zigbee2MQTT Database**: https://www.zigbee2mqtt.io/devices/TS0044.html
2. **Hubitat Driver TS004F**: https://github.com/kkossev/Hubitat (60+ fingerprints)
3. **Home Assistant ZHA**: https://github.com/zigpy/zha-device-handlers
4. **Homey Community Forum**: POST #141 W_vd_P
5. **GitHub Zigbee2MQTT Issues**: #18035, #15749

## CATÉGORISATION UNBRANDED

Conformément à Memory 9f7be57a:
- **Category**: Automation Control (buttons, scene switches, knobs)
- **Driver naming**: Par FONCTION (1-button, 2-button, 4-button)
- **Description**: Focus CAPABILITY pas manufacturer
- **Universal compatibility**: Tous manufacturer IDs dans un seul driver

## PRIORITÉ FIXES

1. ✅ **URGENT**: Ajouter 8 manufacturer IDs TS0041 manquants
2. ✅ **HIGH**: Ajouter 1 manufacturer ID TS0042 manquant  
3. ✅ **HIGH**: Ajouter 7 manufacturer IDs TS004F manquants
4. ✅ **MEDIUM**: Améliorer documentation pairing (batteries)
5. ✅ **LOW**: Support mode switching TS004F

## RÉSULTAT ATTENDU

Après enrichissement:
- Device AliExpress item 1005007769107379 reconnu immédiatement
- Pas de "disappearing device" syndrome
- Pairing stable avec batteries neuves
- Interview device possible
- Utilisateur Cam (W_vd_P) satisfait

---

**Rapport généré**: 2025-10-13  
**Base**: Recherches Google avancées + Zigbee2MQTT + Hubitat + ZHA  
**Status**: PRÊT POUR IMPLÉMENTATION
