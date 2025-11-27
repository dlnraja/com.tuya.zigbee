# 🎯 CURSOR GUIDES - PLAN D'IMPLÉMENTATION COMPLET

**Date:** 23 Novembre 2025
**Target:** Implémenter 100% des guides Cursor
**Status:** 🔄 EN COURS

---

## 📋 CHECKLIST PHASES (Part 1)

### **PHASE 1: Wireless Remotes**
- [x] button_ts0041 - ✅ Déjà correct
- [x] button_ts0043 - ✅ Déjà correct
- [x] button_ts0044 - ✅ Déjà correct
- [ ] button_wireless_1 - ❓ À vérifier
- [ ] button_wireless_3 - ❓ À vérifier
- [ ] button_wireless_4 - ❓ À vérifier
- [ ] switch_wireless_1gang - ❌ À CORRIGER (class socket → button?)
- [ ] button_wireless - ❓ À vérifier

**Actions:**
1. Vérifier classe de chaque driver
2. Corriger capabilities (remove onoff/dim)
3. Ajouter energy.batteries

### **PHASE 2: Battery Pipeline**
- [x] BatteryManagerV4 - ✅ Logs enhanced
- [ ] Vérifier tous drivers avec BatteryManager
- [ ] Static capability declaration check (50 drivers)
- [ ] Find missing measure_battery declarations

**Actions:**
1. Grep tous les drivers utilisant BatteryManager
2. Vérifier driver.compose.json pour chacun
3. Ajouter measure_battery + alarm_battery statiques

### **PHASE 3: TS0601 Climate Monitor**
- [x] DP Database profile - ✅ Fait
- [x] dataQuery fix - ✅ Fait
- [x] TuyaDPMapper integration - ✅ Fait
- [x] BatteryManagerV4 - ✅ Fait
- [x] TimeSync - ✅ Fait

**Status:** ✅ COMPLET

### **PHASE 4: TS0601 Soil Sensor**
- [x] DP Database profile - ✅ Fait Vague 1
- [x] TuyaDPMapper integration - ✅ Fait Vague 2
- [x] BatteryManagerV4 - ✅ Fait Vague 2

**Status:** ✅ COMPLET (need verification)

### **PHASE 5: TS0601 Radar PIR**
- [x] DP Database profile - ✅ Fait Vague 1
- [x] TuyaDPMapper integration - ✅ Fait Vague 2
- [x] BatteryManagerV4 - ✅ Fait Vague 2
- [ ] DP Discovery Mode setting - ❓ À ajouter

**Actions:**
1. Ajouter dp_discovery_mode setting
2. Vérifier integration

### **PHASE 6: Separate Tuya DP vs Standard Zigbee**
- [ ] Ajouter isTuyaDPDevice() method
- [ ] Skip standard cluster config for TS0601
- [ ] Logs appropriés

**Actions:**
1. Créer helper isTuyaDPDevice()
2. Modifier setupClusters() logic
3. Tester avec Climate/Soil/Radar

---

## 📋 CHECKLIST PHASES (Part 2)

### **PHASE 7: Documentation**
- [ ] Update MIGRATION_V4_GUIDE.md
- [ ] Update CHANGELOG.md
- [ ] Update README.md

### **FINAL CHECKLIST**
- [ ] All wireless remotes fixed
- [ ] BatteryManagerV4 always calls setCapabilityValue
- [ ] TS0601 uses Tuya DP mapping
- [ ] Soil reports temp/humidity
- [ ] Radar reports motion/luminance
- [ ] No timeout errors on TS0601
- [ ] Documentation updated

---

## 🔍 QUICK PATTERNS (Part 3)

### **Search & Replace Needed:**
1. Find buttons with wrong class
2. Remove onoff from buttons
3. Add alarm_battery after measure_battery
4. Add energy.batteries section

---

## 🚀 PLAN D'EXÉCUTION

### **Étape 1: Audit complet** (5 min)
- Grep all wireless/button drivers
- Grep all BatteryManager users
- List files to modify

### **Étape 2: Phase 1 Fixes** (10 min)
- Fix switch_wireless_1gang si nécessaire
- Verify button_wireless_*
- Update driver.compose.json

### **Étape 3: Phase 2 Battery** (15 min)
- Find 50 battery drivers
- Add static declarations
- Verify integration

### **Étape 4: Phase 6 Tuya DP** (10 min)
- Add isTuyaDPDevice()
- Modify cluster setup
- Test logs

### **Étape 5: Documentation** (10 min)
- Update guides
- Update changelog
- Commit & push

---

**TOTAL TEMPS ESTIMÉ: 50 minutes**

**GO! 🚀**
