# 🎯 Device Support - GitHub Issue Response

## Question Utilisateur
> Your app doesn't recognize couple of my Tuya zigbee devices properly and it works fine with Zigbee to MQTT. 
> When I add a new device request in Github, do you need device handshake data from homey or will the link to Z2MQTT be enough?

## ✅ Réponse

**Le lien Z2MQTT sera suffisant !**

### Informations Nécessaires
1. ✅ **Lien Z2MQTT device** (https://www.zigbee2mqtt.io/devices/...)
2. ✅ **Model ID** (ex: TS0601)
3. ✅ **Manufacturer ID** (ex: _TZE200_xxxxx)
4. 🔧 **Optional:** Screenshot Homey pairing logs

### Pourquoi Z2MQTT suffit
- Même protocol Zigbee
- Mêmes IDs (manufacturerName, productId, clusters)
- Même configuration endpoints
- Compatible direct avec Homey

### Processus Support
1. User crée GitHub issue avec lien Z2MQTT
2. On ajoute IDs dans driver.compose.json
3. On rebuild + publish nouvelle version
4. User teste nouveau device

## 🚀 Action Immediate

Script créé: **tools/ADD_MISSING_DEVICE.js**
- Ajoute IDs manquants depuis Z2MQTT
- Enrichit drivers existants automatiquement
- Build + Validate + Commit

## 📝 Template GitHub Issue

```markdown
**Device not recognized**

Z2MQTT Link: https://www.zigbee2mqtt.io/devices/XXX
Model: TS0601
Manufacturer: _TZE200_xxxxx
Works in Z2MQTT: Yes ✅

Expected: Device pairs in Homey
Actual: Device not recognized
```

---
**Status:** Ready to support ALL Z2MQTT compatible devices
