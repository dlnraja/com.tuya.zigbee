# 📖 Cookbook Zigbee Local - Guide Pratique

**Version:** 1.0.0  
**Date:** 16 Octobre 2025  
**App:** Universal Tuya Zigbee

---

## 🎯 **OBJECTIF**

Ce cookbook répond aux questions récurrentes sur le contrôle Zigbee local avec Homey. Il explique comment configurer, dépanner et optimiser vos devices Tuya Zigbee sans cloud.

---

## 📋 **TABLE DES MATIÈRES**

1. [Pairing Initial](#pairing-initial)
2. [Problèmes de Pairing](#problemes-pairing)
3. [IAS Zone (Motion/Contact/SOS)](#ias-zone)
4. [Énergie & Batterie](#energie-batterie)
5. [Optimisation Mesh](#optimisation-mesh)
6. [Diagnostic & Debug](#diagnostic-debug)
7. [FAQ](#faq)

---

## 🔌 **PAIRING INITIAL**

### Préparation

**1. Vérifier le Mode**
```
✅ Device = Zigbee (logo "Zigbee 3.0")
❌ Device = Wi-Fi only
```

**2. Positionner le Device**
- Distance: <30cm de Homey
- Pas d'obstacles métalliques
- Éviter micro-ondes actifs
- Batterie pleine (>80%)

**3. Factory Reset Propre**

**Smart Plugs:**
```
1. Débrancher le plug
2. Maintenir bouton
3. Rebrancher en maintenant
4. Tenir 5-10 secondes
5. LED clignote rapidement = OK
```

**Sensors (Battery):**
```
1. Retirer la batterie
2. Attendre 10 secondes
3. Réinsérer en maintenant reset
4. Tenir 5 secondes
5. LED clignote = OK
```

**Smart Bulbs:**
```
1. On → Off → On → Off → On → Off (5x rapide)
2. Bulb clignote = pairing mode
```

**Wall Switches:**
```
1. Couper alimentation 10 secondes
2. Réactiver en maintenant bouton
3. Tenir 5 secondes
4. LED clignote = OK
```

### Pairing Homey

**1. Ouvrir Homey App**
```
Devices → + → Universal Tuya Zigbee
```

**2. Sélectionner Type**
```
Chercher: "Motion Sensor"
ou "Smart Plug"
ou "Temperature Sensor"
etc.
```

**3. Mode Pairing**
```
Device doit clignoter
Homey cherche 60 secondes
Distance <30cm!
```

**4. Vérification**
```
✅ Device apparaît dans app
✅ Nom assigné
✅ Capabilities visibles
✅ Lecture température/batterie OK
```

---

## ⚠️ **PROBLÈMES DE PAIRING**

### Device Non Détecté

**Symptômes:**
- LED clignote mais Homey ne trouve pas
- "No devices found"

**Solutions:**

**1. Reset Complet Homey Zigbee**
```
Settings → Zigbee → Advanced → Repair Network
Attendre 5 minutes
Réessayer pairing
```

**2. Vérifier Canal Zigbee**
```
Settings → Zigbee → Channel
Éviter canaux Wi-Fi (1, 6, 11)
Recommandé: Channel 15, 20, 25
```

**3. Nettoyer Devices Fantômes**
```
Settings → Zigbee → Devices
Supprimer devices "Unreachable"
Redémarrer Homey
```

**4. Distance & Obstacles**
```
Approcher device <10cm
Retirer obstacles métalliques
Désactiver micro-ondes
```

### Device Déjà Ajouté (Erreur)

**Symptômes:**
- "Device already added"
- Mais device pas visible dans app

**Solutions:**

**1. Rechercher Device Caché**
```
Homey App → Devices → Search
Chercher par nom/type
Si trouvé → Supprimer
```

**2. Vérifier Zigbee Network**
```
Settings → Zigbee → Devices
Device présent? → Remove
Retry pairing
```

**3. Reset Total**
```
Device: Factory reset 2x
Homey: Redémarrer
Re-pairing à froid
```

### Pairing OK mais Device Non Fonctionnel

**Symptômes:**
- Device paired
- Mais aucune lecture
- Ou triggers ne fonctionnent pas

**Solutions:**

**1. Version App**
```
Check version: More → Apps → Universal Tuya Zigbee
Si <v3.0.26 → UPDATE!
Critical bug fixes in v3.0.26+
```

**2. Re-pairing Après Update**
```
Update app → v3.0.31+
Remove device
Factory reset device
Re-pair close to Homey
```

**3. Vérifier Type Driver**
```
Device settings → Advanced → Driver
Wrong driver? → Re-pair with correct type
```

---

## 🚨 **IAS ZONE (Motion/Contact/SOS)**

### Qu'est-ce que IAS Zone?

**IAS Zone** = Industrial Automation & Safety Zone

**Utilisé pour:**
- Motion sensors (PIR)
- Contact sensors (door/window)
- SOS buttons
- Smoke/gas detectors
- Water leak detectors

### Enrollment IAS Zone

**Processus Automatique:**
```
1. Device paired → Homey
2. Device envoie "Zone Enroll Request"
3. Homey répond "Zone Enroll Response"
4. Device enrolled → Triggers fonctionnels
```

**Durée:** 5-30 secondes après pairing

### Problèmes IAS Zone

**Symptôme #1: Motion Detected but No Trigger**

**Cause:** IAS Zone not enrolled

**Solution:**
```
1. Remove device
2. Factory reset
3. Re-pair VERY close (<10cm)
4. Wait 30 seconds
5. Test motion
```

**Symptôme #2: SOS Button No Trigger**

**Cause:** Same - IAS Zone enrollment failed

**Solution:**
```
1. Update app to v3.0.26+
2. Remove SOS button
3. Factory reset (hold 10s)
4. Re-pair close to Homey
5. Wait enrollment (LED stops blinking)
6. Test button
```

**Vérification Enrollment:**
```
Device Settings → Advanced → Diagnostic
Look for: "IAS Zone enrolled: true"
or "CIE Address: [Homey IEEE]"
```

### Debug IAS Zone

**Enable Debug Logs:**
```
App Settings → Enable debug logging
Trigger motion/button
Send diagnostic report
```

**Look for:**
```
✅ "IAS Zone enrolled successfully"
✅ "Zone status change notification"
✅ "Motion alarm triggered"

❌ "IAS Zone enrollment failed"
❌ "Cannot get Homey IEEE"
❌ "Zone status timeout"
```

---

## 🔋 **ÉNERGIE & BATTERIE**

### Types d'Alimentation

**1. AC Powered (Smart Plugs, Wall Switches)**
```
✅ Always powered
✅ Act as Zigbee routers
✅ Extend mesh network
❌ Require electrical installation
```

**2. Battery Powered (Sensors, Remotes)**
```
✅ Placement flexible
✅ No wiring
❌ Battery replacement needed
❌ Sleep mode (delayed response)
```

**3. Hybrid (Thermostats, Some Switches)**
```
✅ AC primary, battery backup
✅ Works during power outage
❌ More expensive
```

### Battery Life Optimization

**1. Réglages Reporting**
```
Device Settings → Advanced → Reporting
Température: 5 minutes (not 1 minute)
Humidity: 5 minutes
Motion: Keep default
```

**2. Distance Optimale**
```
Sensor <10m d'un router Zigbee
Utiliser smart plugs comme routers
Éviter communication longue distance
```

**3. Qualité Batteries**
```
✅ Batteries lithium (CR2032, CR2450)
✅ Marques qualité (Panasonic, Energizer)
❌ Batteries alkalines bon marché
❌ Batteries rechargeables (voltage faible)
```

**4. Températures**
```
Optimal: 15-25°C
Éviter: <0°C ou >40°C
Froid = réduction autonomie 30-50%
```

### Battery Readings

**Pourcentage Batterie:**
```
100% = Neuve
75%  = Bon
50%  = À surveiller
25%  = Remplacer bientôt
<10% = Remplacer maintenant!
```

**Low Battery Alerts:**
```
Homey → Notifications → Enable
Flow: "When battery <20% → Notify"
```

**Voltage vs Percentage:**
```
CR2032: 3.0V = 100%, 2.7V = 50%, 2.4V = 0%
CR2450: 3.0V = 100%, 2.7V = 50%, 2.4V = 0%
```

---

## 🌐 **OPTIMISATION MESH**

### Qu'est-ce que le Mesh Zigbee?

**Mesh Network:**
- Devices communiquent entre eux
- AC-powered devices = routers
- Battery devices = end devices
- Multi-hop routing (A→B→C→Homey)

### Principes Optimisation

**1. Routers Stratégiques**
```
Placer smart plugs:
- Couloirs
- Pièces centrales
- Entre Homey et sensors éloignés
- Espacement 5-10m
```

**2. Éviter Interférences**
```
❌ Wi-Fi 2.4GHz (overlap canaux)
❌ Micro-ondes actifs
❌ Bluetooth devices
❌ USB 3.0 cables près Homey
```

**3. Canal Zigbee Optimal**
```
Settings → Zigbee → Channel
Test channels: 15, 20, 25
Éviter: 11 (Wi-Fi overlap)
Tool: WiFi Analyzer app
```

**4. Mesh Topology**
```
Optimal:
  Homey
    ├─ Plug 1 (router)
    │   ├─ Sensor A
    │   └─ Sensor B
    └─ Plug 2 (router)
        ├─ Sensor C
        └─ Sensor D

Avoid:
  Homey → Sensor (15m, no router)
```

### Diagnostic Mesh

**1. Zigbee Map**
```
Settings → Zigbee → Topology
Visualiser connections
Identifier weak links
```

**2. Link Quality (LQI)**
```
Good: >200
Average: 100-200
Poor: <100
```

**3. RSSI (Signal Strength)**
```
Excellent: > -50 dBm
Good: -50 to -70 dBm
Fair: -70 to -85 dBm
Poor: < -85 dBm
```

**4. Heal Network**
```
Settings → Zigbee → Heal Network
Exécuter la nuit (devices endormis)
Durée: 1-2 heures
```

---

## 🔍 **DIAGNOSTIC & DEBUG**

### Envoi Diagnostic Report

**1. Via Homey App**
```
Device → Settings → Advanced
Send Diagnostic Report
Note le Diagnostic ID (format: abc123-def456)
```

**2. Contacter Support**
```
Forum: https://community.homey.app/t/140352
Provide:
- Diagnostic ID
- Device type
- Problem description
- App version
```

### Lecture Logs

**Enable Debug Mode:**
```
More → Apps → Universal Tuya Zigbee
Settings → Enable debug logging
```

**Log Patterns:**

**✅ Normal:**
```
"ZigBeeDevice initialized"
"Temperature cluster registered"
"handle report parsed payload: 22.5"
"IAS Zone enrolled successfully"
```

**❌ Problème:**
```
"Cluster IDs = NaN" → Update app!
"Cannot get Homey IEEE" → Re-pair
"Enrollment failed" → Re-pair closer
"Timeout" → Mesh problem
```

### Common Error Messages

**1. "Cluster IDs = NaN"**
```
Cause: Old app version (v3.0.23 or older)
Fix: Update to v3.0.31+
Then: Re-pair device
```

**2. "v.replace is not a function"**
```
Cause: IAS Zone enrollment bug
Fix: Update to v3.0.26+
Then: Re-pair device
```

**3. "Device unreachable"**
```
Cause: Mesh problem or battery low
Fix: 
  - Check battery
  - Add router between device and Homey
  - Move device closer
```

**4. "Timeout"**
```
Cause: Device sleeping or out of range
Fix:
  - Wake device (press button)
  - Improve mesh
  - Reduce reporting interval
```

---

## ❓ **FAQ**

### General

**Q: Mon device Zigbee fonctionne-t-il sans Internet?**
```
A: OUI! Zigbee = 100% local, aucun cloud requis.
   Test: Débrancher Internet → Device fonctionne
```

**Q: Puis-je mélanger devices Tuya et non-Tuya?**
```
A: OUI! Universal Tuya Zigbee supporte:
   - Tuya devices (TS*, _TZ*)
   - Generic Zigbee (standards ZCL)
   - Même réseau Zigbee
```

**Q: Combien de devices puis-je connecter?**
```
A: Homey Pro: ~50 devices Zigbee
   Avec routers: jusqu'à 100+
   Limite théorique Zigbee: 65,000
```

### Pairing

**Q: Device clignote mais Homey ne trouve pas**
```
A: 1. Factory reset 2x
   2. Approcher <10cm de Homey
   3. Vérifier canal Zigbee (éviter 11)
   4. Nettoyer devices fantômes
```

**Q: "Device already added" mais pas visible**
```
A: 1. Settings → Zigbee → Devices
   2. Chercher device par IEEE
   3. Remove
   4. Re-pair
```

**Q: Quel type de driver choisir au pairing?**
```
A: Sélectionner le type qui correspond:
   - Motion Sensor → Motion...
   - Smart Plug → Smart Plug...
   - Si erreur → Re-pair avec bon type
```

### Fonctionnement

**Q: Temperature OK mais motion ne trigger pas**
```
A: IAS Zone enrollment problem
   1. Update app to v3.0.26+
   2. Remove device
   3. Factory reset
   4. Re-pair VERY close (<10cm)
   5. Wait 30 seconds
```

**Q: SOS button ne trigger pas**
```
A: Same - IAS Zone
   1. Check app version (need v3.0.26+)
   2. Re-pair as above
   3. Test button after 30s
```

**Q: Battery percentage incorrect**
```
A: Peut arriver au pairing
   Attendre 1ère vraie lecture (1-24h)
   Si persiste → Remove + re-pair
```

### Performance

**Q: Sensor répond lentement**
```
A: Battery device = sleep mode
   Normal: 1-5 secondes délai
   Solutions:
   - Ajouter routers entre device et Homey
   - Réduire distance
   - Vérifier mesh quality
```

**Q: Device offline régulièrement**
```
A: 1. Vérifier batterie
   2. Améliorer mesh (add routers)
   3. Vérifier interférences
   4. Heal network
```

**Q: Mesh network lent**
```
A: 1. Ajouter smart plugs (routers)
   2. Changer canal Zigbee
   3. Éloigner USB 3.0 de Homey
   4. Heal network
```

### App & Updates

**Q: Comment mettre à jour l'app?**
```
A: Method 1 (App Store - when available):
   More → Apps → Universal Tuya Zigbee → Update

   Method 2 (CLI):
   npm install -g homey
   homey app install
```

**Q: Dois-je re-pairer après update?**
```
A: Dépend de la version:
   v3.0.23 → v3.0.26+: OUI (critical fixes)
   v3.0.26 → v3.0.31: NON (compatible)
   v3.0.31+: NON (compatible)
```

**Q: Quelle version dois-je utiliser?**
```
A: Latest stable: v3.0.31
   Features:
   - ClusterMap module
   - All critical bugs fixed
   - Production ready
```

### Troubleshooting

**Q: Comment envoyer un diagnostic?**
```
A: Device → Settings → Advanced
   → Send Diagnostic Report
   → Noter ID
   → Poster sur forum avec ID
```

**Q: Où obtenir de l'aide?**
```
A: 1. Forum: https://community.homey.app/t/140352
   2. GitHub Issues (avec template)
   3. Diagnostic reports
   4. Documentation complète
```

**Q: Puis-je contribuer au projet?**
```
A: OUI!
   - GitHub: github.com/dlnraja/com.tuya.zigbee
   - Issue templates pour requests
   - Pull requests acceptées
   - Documentation améliorations
```

---

## 🔗 **RESSOURCES**

### Documentation
- **README:** [GitHub](https://github.com/dlnraja/com.tuya.zigbee)
- **Release Notes:** [Releases](https://github.com/dlnraja/com.tuya.zigbee/releases)
- **Issue Templates:** [Templates](https://github.com/dlnraja/com.tuya.zigbee/issues/new/choose)

### Community
- **Forum:** [Homey Community](https://community.homey.app/t/140352)
- **GitHub:** [Repository](https://github.com/dlnraja/com.tuya.zigbee)

### Tools
- **WiFi Analyzer:** Trouver canaux libres
- **Zigbee2MQTT Database:** Device compatibility
- **Homey Developer Tools:** Pour développeurs

---

## 📝 **CHANGELOG**

### v1.0.0 (16 Oct 2025)
- ✅ Cookbook initial complet
- ✅ Pairing guide
- ✅ IAS Zone troubleshooting
- ✅ Battery optimization
- ✅ Mesh network guide
- ✅ Diagnostic procedures
- ✅ FAQ comprehensive

---

**Maintainer:** Dylan Rajasekaram (@dlnraja)  
**Version:** 1.0.0  
**License:** MIT  
**Status:** ✅ Complete & Production Ready
