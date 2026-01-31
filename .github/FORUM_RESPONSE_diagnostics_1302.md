# Forum Response - Diagnostic Reports (Post #1302)

## 📊 Summary of Diagnostic Reports Analyzed

### 1. BSEED 4-Gang Switch (c33007b0) - v5.5.960
**Issue:** `Missing Capability Listener: onoff.gang2/3/4`
**Status:** ✅ **Already fixed in v5.5.999**
- Virtual button toggle for EP2-4 in ZCL-only mode was added
- Please update to v5.6.2 and re-pair the device

### 2. Curtain Motor - v5.5.960
**Issue:** "Het apparaat reageert niet" (Device not responding)
**Status:** ⚠️ **Network/Hardware Issue**
- Logs show commands sent successfully: `✅ DP1 sent via datapoint({data})`
- The device is not responding to Zigbee commands
- **Recommendations:**
  1. Check device power connection
  2. Move device closer to Homey or add a router
  3. Re-pair the device
  4. Factory reset the curtain motor

### 3. Radar Sensor - v5.5.994
**Issue:** Distance, temperature, battery not working. Motion OK.
**Status:** ⚠️ **Device Variant Issue**
- Logs show: `[DATA-RECOVERY] ⚠️ Still missing after recovery: measure_distance`
- This appears to be a ZCL-only variant without Tuya DP cluster
- **Recommendations:**
  1. Update to v5.6.2
  2. Re-pair the device to get correct modelId
  3. Provide Zigbee interview data for analysis

### 4. Humidity Factor 10 - v5.5.998
**Issue:** Humidity shows 9% instead of 90%
**Status:** ✅ **Fixed in v5.6.2**
- HOBEIAN_10G_MULTI config had `divisor: 10` instead of `multiplier: 10`
- Now correctly shows humidity ×10

---

## 🇫🇷 Réponse Forum

Bonjour à tous,

J'ai analysé les 4 rapports de diagnostic reçus :

### 1. BSEED 4-Gang Switch ✅
**Déjà corrigé** dans v5.5.999. Veuillez mettre à jour vers v5.6.2 et ré-appairer l'appareil.

### 2. Moteur de Rideau ⚠️
Les logs montrent que les commandes sont envoyées correctement (`✅ DP1 sent`), mais l'appareil ne répond pas. C'est un problème réseau/matériel :
- Vérifiez l'alimentation
- Rapprochez l'appareil du Homey
- Ré-appairez l'appareil
- Reset usine du moteur

### 3. Capteur Radar ⚠️
Les données de distance/température/batterie manquent. C'est probablement une variante ZCL-only.
- Mettez à jour vers v5.6.2
- Ré-appairez pour obtenir le modelId correct
- Envoyez les données d'interview Zigbee pour analyse

### 4. Humidité ×10 ✅
**Corrigé dans v5.6.2** - L'humidité du radar HOBEIAN 10G affichait 9% au lieu de 90%.

---

**v5.6.2 est maintenant disponible sur le Homey App Store !**

Merci pour vos rapports de diagnostic - ils aident à améliorer l'app ! 🙏
