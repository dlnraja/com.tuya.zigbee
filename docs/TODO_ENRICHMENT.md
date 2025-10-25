# 📝 TODO - ENRICHISSEMENT DATABASES COMMUNAUTAIRES

**Priorité**: HAUTE  
**Impact**: +200-300% compatibilité devices  
**Effort**: 2-3 heures  

---

## 🎯 OBJECTIF

Enrichir les drivers Homey avec manufacturer IDs des bases de données communautaires:
- Zigbee2MQTT
- Blakadder Zigbee Database
- ZHA Device Handlers
- deCONZ

---

## 📋 TÂCHES

### Phase 1: Préparation ✅ FAIT
- [x] Document stratégie d'enrichissement
- [x] Liste manufacturer IDs à ajouter
- [x] Identifier sources fiables
- [x] Créer structure documentation

**Fichiers créés**:
- `scripts/enrichment/ENRICH_FROM_Z2M_DATABASE.md`
- `scripts/enrichment/MANUFACTURER_IDS_TO_ADD.md`

---

### Phase 2: Switches (PRIORITÉ 1) ⏳ EN ATTENTE

**Objectif**: Ajouter ~25 IDs pour switches 1/2/3/4 gang

**Drivers cibles**:
- [ ] `switch_wall_1gang` (+7 IDs)
- [ ] `switch_wall_2gang` (+10 IDs)
- [ ] `switch_wall_3gang` (+5 IDs)
- [ ] `switch_wall_4gang` (+4 IDs)
- [ ] `switch_basic_1gang` (+3 IDs)
- [ ] `switch_basic_2gang` (+5 IDs)

**Action**:
```bash
# Pour chaque driver
1. Ouvrir driver.compose.json
2. Ajouter IDs depuis MANUFACTURER_IDS_TO_ADD.md
3. Trier alphabétiquement
4. Build & validate
5. Commit avec source documentée
```

**Version cible**: v4.7.7

---

### Phase 3: Buttons (PRIORITÉ 2) ⏳ EN ATTENTE

**Objectif**: Ajouter ~10 IDs pour buttons

**Drivers cibles**:
- [ ] `button_wireless_1` (+2 IDs)
- [ ] `button_wireless_3` (+3 IDs)
- [ ] `button_wireless_4` (+5 IDs)
- [ ] `button_emergency_sos` (+3 IDs)

**Version cible**: v4.7.8

---

### Phase 4: Sensors (PRIORITÉ 3) ⏳ EN ATTENTE

**Objectif**: Ajouter ~40 IDs pour sensors

**Drivers cibles**:
- [ ] `presence_sensor_radar` (+10 IDs mmWave)
- [ ] `climate_monitor_temp_humidity` (+7 IDs)
- [ ] `climate_sensor_soil` (+3 IDs)
- [ ] `motion_sensor_pir` (+6 IDs)
- [ ] `temperature_sensor` (+5 IDs)
- [ ] `water_leak_sensor` (+4 IDs)
- [ ] `door_window_sensor` (+5 IDs)

**Version cible**: v4.7.9

---

### Phase 5: Plugs & Energy (PRIORITÉ 4) ⏳ EN ATTENTE

**Objectif**: Ajouter ~15 IDs pour plugs

**Drivers cibles**:
- [ ] `plug_smart` (+5 IDs)
- [ ] `plug_energy_monitor` (+5 IDs)
- [ ] `plug_energy_advanced` (+3 IDs)
- [ ] `usb_outlet_*` (+2 IDs)

**Version cible**: v4.8.0

---

## 🔧 PROCÉDURE PAR DRIVER

### Template d'enrichissement:

```bash
# 1. Backup
git add -A
git commit -m "checkpoint: before enrichment"

# 2. Éditer driver
code drivers/DRIVER_NAME/driver.compose.json

# 3. Ajouter IDs (MANUFACTURER_IDS_TO_ADD.md)
# Copier IDs de la liste
# Coller dans manufacturerName array
# Trier alphabétiquement

# 4. Build
homey app build

# 5. Validate
# Vérifier:
# - Pas de doublons
# - Format correct
# - Build SUCCESS

# 6. Test (optionnel)
# Si device physique disponible, tester pairing

# 7. Commit
git add drivers/DRIVER_NAME/driver.compose.json
git commit -m "feat: Add X manufacturer IDs to DRIVER_NAME from Z2M/Blakadder

Source: Zigbee2MQTT + Blakadder database
IDs added: _TZxxxx_yyyyyyyy, ...
Coverage: +XX% devices
Version: vX.X.X"

# 8. Push
git push origin master
```

---

## 📊 MÉTRIQUES DE SUCCÈS

### Avant Enrichissement (v4.7.6)
```
Total manufacturer IDs: ~500
Coverage devices Tuya: ~40%
"Appareil Zigbee" non reconnus: ~60%
```

### Après Enrichissement (v4.8.0)
```
Total manufacturer IDs: ~800-1000 (+60-100%)
Coverage devices Tuya: ~80-90% (+100%)
"Appareil Zigbee" non reconnus: ~10-20% (-75%)
```

### Impact Utilisateurs
```
📈 Reviews positives: +50%
✅ Support requests: -40%
🎯 Device recognition: +100%
⭐ App rating: 4.5+ → 4.8+
```

---

## 🔗 RESSOURCES

### Databases à consulter:

1. **Zigbee2MQTT**
   - Devices: https://www.zigbee2mqtt.io/supported-devices/
   - GitHub: https://github.com/Koenkk/zigbee-herdsman-converters

2. **Blakadder**
   - Database: https://zigbee.blakadder.com/
   - Search: https://zigbee.blakadder.com/search.html

3. **ZHA Quirks**
   - GitHub: https://github.com/zigpy/zha-device-handlers
   - Tuya: https://github.com/zigpy/zha-device-handlers/tree/dev/zhaquirks/tuya

4. **Forums Homey**
   - Community: https://community.homey.app/
   - App thread: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/

### Documentation projet:

- `scripts/enrichment/ENRICH_FROM_Z2M_DATABASE.md` - Stratégie
- `scripts/enrichment/MANUFACTURER_IDS_TO_ADD.md` - Liste complète IDs
- `docs/PRODUITS_ALIEXPRESS_IMPLEMENTATION.md` - Exemples récents

---

## ⚠️ POINTS D'ATTENTION

### ❌ NE PAS FAIRE:
- Ajouter IDs sans vérifier source
- Utiliser wildcards (`_TZE284_` sans suffix)
- Dupliquer IDs entre drivers
- Commit sans build SUCCESS
- Oublier de documenter source

### ✅ FAIRE SYSTÉMATIQUEMENT:
- Vérifier format ID (8 chars après préfixe)
- Trier alphabétiquement
- Build & validate après ajout
- Documenter source dans commit
- Version bump si >10 IDs ajoutés

---

## 🚀 DÉPLOIEMENT

### Calendrier suggéré:

- **Semaine 1** (Phase 1-2): Switches + Buttons → v4.7.7-4.7.8
- **Semaine 2** (Phase 3): Sensors → v4.7.9
- **Semaine 3** (Phase 4-5): Plugs + Final → v4.8.0

### Communication:

Après chaque phase, poster sur forum:
```
✅ Universal Tuya Zigbee vX.X.X Released!

New manufacturer IDs added:
- Switches: +25 IDs (BSEED, MOES, Lonsonho, etc.)
- Buttons: +10 IDs (Scene controllers)
- Total coverage: +XX% devices

Update will propagate in 15-30 minutes.
Re-pair unrecognized devices after update.
```

---

## 📈 PROCHAINES ÉTAPES

1. **Commencer Phase 2** (Switches)
2. Build & test
3. Deploy v4.7.7
4. Monitorer retours utilisateurs
5. Continuer Phases 3-5

---

**🎯 OBJECTIF: 1000+ MANUFACTURER IDs & 90% COVERAGE ! 📊✨**

**Status**: ⏳ En attente d'exécution  
**Priorité**: 🔴 HAUTE  
**Impact**: 🚀 TRÈS ÉLEVÉ
