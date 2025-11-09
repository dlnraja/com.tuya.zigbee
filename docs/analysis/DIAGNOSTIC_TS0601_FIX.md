# 🔧 Diagnostic TS0601 Sensors - Fix Required

## 📊 Tes 3 Sensors TS0601:

```
Device #3: Climate Monitor
  Model: TS0601
  Manufacturer: _TZE284_vvmbj46n
  Type: Temperature + Humidity sensor
  Status: ❌ Pas de données

Device #6: Presence Sensor Radar
  Model: TS0601
  Manufacturer: _TZE200_rhgsbacq
  Type: Motion/Presence sensor  
  Status: ❌ Pas de données

Device #7: Soil Tester
  Model: TS0601
  Manufacturer: _TZE284_oitavov2
  Type: Soil moisture + Temp + Humidity
  Status: ❌ Pas de données
```

## ❌ PROBLÈME IDENTIFIÉ:

TuyaEF00Manager est bien intégré dans BaseHybridDevice, MAIS:
1. Il ne détecte peut-être pas le cluster 0xEF00 correctement
2. Les listeners ne reçoivent peut-être pas les dataReport
3. Les DPs ne sont peut-être pas mappés pour ces manufacturers spécifiques

## 🔍 BESOIN DE LOGS:

Pour diagnostiquer, j'ai besoin de voir dans les logs Homey:

```
[TUYA] Initializing EF00 manager...
[TUYA] Cluster 0xEF00 found? YES/NO
[TUYA] Listeners setup: dataReport, response, frame
[TUYA] Requesting DPs: 1, 2, 5, 15...
[TUYA] dataReport received? YES/NO
[TUYA] DP X = value Y
```

## 🎯 PROCHAINE ÉTAPE:

1. Update vers v4.9.322 (si pas déjà fait)
2. Redémarre l'app
3. Ouvre Homey Developer Tools
4. Sélectionne un des TS0601 (ex: Climate Monitor)
5. Copie TOUS les logs qui contiennent [TUYA]
6. Envoie-moi les logs ici

**Avec ces logs, je pourrai:**
- Voir si cluster 0xEF00 est détecté
- Voir si listeners fonctionnent
- Voir quels DPs sont reçus
- Créer un fix spécifique pour tes 3 models!
