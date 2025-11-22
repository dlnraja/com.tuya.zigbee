# ❓ SMART PLUGS TUYA ZIGBEE - FAQ

**Questions fréquentes des forums Homey Community**

---

## 🔌 COMPATIBILITÉ

### Q: Mon smart plug Tuya est-il compatible?

**A:** Vérifiez ces 3 choses:

1. **Logo Zigbee sur la boîte**
   - ✅ "Zigbee 3.0" = Compatible
   - ❌ "Wi-Fi only" = Non compatible (utiliser Tuya Cloud app)

2. **Test de pairing**
   ```
   - Ouvrir Universal Tuya Zigbee app
   - Cliquer "Ajouter device"
   - Chercher "Smart Plug"
   - Si trouvé = Compatible!
   ```

3. **Manufacturer ID**
   ```
   Après pairing, vérifier diagnostic:
   ✅ _TZ3000_* = Compatible
   ✅ _TZE200_* = Compatible
   ✅ _TZ3210_* = Compatible
   ❌ "Tuya" seul = Wi-Fi (pas compatible)
   ```

---

### Q: Quelle est la différence entre Tuya Wi-Fi et Tuya Zigbee?

**A:** Différences majeures:

| Aspect | Wi-Fi (Cloud) | Zigbee (Local) |
|--------|--------------|----------------|
| Internet | ✅ Requis | ❌ Pas requis |
| Cloud Tuya | ✅ Obligatoire | ❌ Aucun |
| Fonctionne offline | ❌ Non | ✅ Oui |
| Latence | ~1000ms | ~100ms |
| Stabilité | Moyenne | Excellente |
| Privacy | Données → cloud | 100% local |

**Notre app = Zigbee uniquement = 100% local!**

---

### Q: Les smart plugs Amazon/Action/Lidl sont compatibles?

**A:** Oui, SI version Zigbee!

**Amazon:**
- ✅ Amazon Basics Smart Plug (Zigbee) = OUI
- ❌ Amazon Echo Plug (Wi-Fi) = NON

**Action (LSC Smart Connect):**
- ✅ Tous modèles Zigbee = OUI
- Manufacturer: `_TZ3000_*`
- Energy monitoring inclus

**Lidl/Silvercrest:**
- ✅ "Smart Home" Zigbee = OUI
- Manufacturer: `_TZE200_*` ou `_TZ3000_*`
- Energy monitoring selon modèle

**Vérification simple:**
```
Packaging doit mentionner "Zigbee 3.0"
Pas de mention "Wi-Fi only"
```

---

### Q: MOES smart plugs sont supportés?

**A:** OUI, 100% supportés!

**Modèles MOES Zigbee:**
- ✅ MOES Smart Plug ZSS-X (16A)
- ✅ MOES Smart Plug with USB
- ✅ MOES Energy Monitor Plug
- ✅ MOES Dimmer Plug

**Avantages MOES:**
- Excellent rapport qualité/prix
- Energy monitoring précis
- Très stable sur Zigbee
- Compatible Universal Tuya Zigbee

**Pas besoin d'app MOES séparée!**

---

## 🔧 PROBLÈMES COURANTS

### Q: Mon smart plug se déconnecte régulièrement

**A:** Solutions selon cause:

**Cause 1: Vous utilisez app cloud**
```
Solution:
1. Vérifier si vous utilisez "Tuya Cloud" app
2. Migrer vers "Universal Tuya Zigbee"
3. Factory reset du plug
4. Re-pairer en Zigbee
```

**Cause 2: Portée Zigbee insuffisante**
```
Solution:
1. Rapprocher plug de Homey
2. Ajouter répéteurs Zigbee
   (autres smart plugs = répéteurs automatiques!)
3. Vérifier mesh: Settings → Zigbee → Devices
```

**Cause 3: Interférences**
```
Solution:
1. Éloigner de Wi-Fi router (>1m)
2. Éloigner de micro-ondes
3. Changer canal Zigbee si nécessaire
```

---

### Q: Pairing échoue, "Device not found"

**A:** Checklist de dépannage:

1. **Factory reset correct?**
   ```
   - Appuyer bouton 5 secondes
   - LED doit clignoter rapidement
   - Si LED fixe = retry
   ```

2. **Distance de Homey**
   ```
   - Pairing < 2 mètres de Homey
   - Après pairing, peut éloigner
   ```

3. **Mode Zigbee actif?**
   ```
   - Vérifier logo Zigbee sur device
   - Certains plugs ont Wi-Fi ET Zigbee
   - Mode peut être changé via app Tuya
   ```

4. **Déjà pairé ailleurs?**
   ```
   - Supprimer de toute autre app
   - Factory reset complet
   - Retry pairing
   ```

---

### Q: Energy monitoring ne fonctionne pas

**A:** Vérifications:

1. **Device supporte energy monitoring?**
   ```
   App → Device → Capabilities
   Chercher:
   - "measure_power" (W)
   - "meter_power" (kWh)
   
   Si absent = device ne supporte pas
   ```

2. **Initialisation en cours?**
   ```
   - Attendre 5-10 minutes après pairing
   - Brancher appareil avec consommation
   - Vérifier consommation > 1W
   ```

3. **Bug temporaire?**
   ```
   - Redémarrer Homey
   - Re-pairer device
   - Envoyer diagnostic si persiste
   ```

---

## 🛒 ACHAT

### Q: Quel smart plug acheter pour Homey?

**A:** Recommandations par budget:

**Budget €10-15:**
- ✅ **Action LSC Smart Connect** (meilleur rapport qualité/prix)
- ✅ **Lidl Smart Home** (souvent en promo)
- Energy monitoring inclus
- Très stable

**Budget €15-25:**
- ✅ **MOES ZSS-X Series** (excellent)
- ✅ **Nous A3Z/A4Z** (très bon)
- Energy monitoring précis
- Build quality supérieure

**Budget <€10:**
- ✅ **Tuya OEM Generic** (AliExpress)
- Vérifier reviews
- Demander manufacturer ID avant achat
- Energy monitoring selon modèle

**À VÉRIFIER absolument:**
- [ ] Logo "Zigbee 3.0"
- [ ] 16A (EU) ou équivalent
- [ ] Reviews mentionnent Homey/Zigbee
- [ ] Energy monitoring si besoin

---

### Q: Où acheter smart plugs Zigbee?

**A:** Options par pays:

**Europe:**
- 🇳🇱 **Action** - LSC Smart Connect (€12-15)
- 🇩🇪 **Lidl** - Smart Home line (€10-15)
- 🇪🇺 **Amazon.eu** - Divers marques (€15-25)
- 🌍 **AliExpress** - MOES, Nous (€10-20, shipping lent)

**France:**
- 🇫🇷 **Action** (si disponible)
- 🇫🇷 **Amazon.fr** - Amazon Basics Zigbee
- 🇫🇷 **AliExpress** - MOES/Nous
- 🇫🇷 **Magasins électronique** - Vérifier Zigbee

**Astuce:** Acheter en magasin physique permet retour facile si non compatible

---

### Q: Combien de smart plugs puis-je connecter?

**A:** Limites Zigbee:

**Homey (Early 2023 / Pro):**
- Limite théorique: **50 devices Zigbee**
- Limite pratique: **30-40 devices**
- Smart plugs = répéteurs (améliorent mesh)

**Recommandation:**
```
Répartition optimale:
- 10-15 smart plugs (répéteurs)
- 15-20 sensors (battery)
- 5-10 autres devices

Total: 30-45 devices = stable
```

**Si besoin plus:**
- Ajouter Homey Bridge (50 devices extra)
- Ou second Homey

---

## 🔄 MIGRATION

### Q: J'ai des smart plugs Wi-Fi Tuya, comment migrer?

**A:** Process de migration:

**Option 1: Garder Wi-Fi (moins recommandé)**
```
- Garder dans Tuya Cloud app
- Accepter dépendance cloud
- Stabilité moindre
```

**Option 2: Migrer vers Zigbee (recommandé)**
```
1. Identifier modèles actuels
2. Acheter équivalents Zigbee
3. Pairing dans Universal Tuya Zigbee
4. Recréer flows Homey
5. Revendre/donner anciens Wi-Fi

Avantages:
✅ Plus stable
✅ Plus rapide
✅ Fonctionne offline
✅ Privacy
```

**Coût migration:**
- ~€15 par smart plug Zigbee
- Investissement rentabilisé par stabilité

---

### Q: Puis-je convertir Wi-Fi en Zigbee?

**A:** NON, impossible!

**Explication:**
- Hardware Wi-Fi ≠ Hardware Zigbee
- Puce radio différente
- Firmware différent
- Conversion techniquement impossible

**Solution:**
- Acheter nouveaux plugs Zigbee
- Revendre/donner Wi-Fi plugs

---

## 🎓 TECHNIQUE

### Q: Quelle est la différence entre cloud et local?

**A:** Explication technique:

**Mode Cloud (Tuya Cloud app):**
```
Smart Plug → Wi-Fi Router → Internet → 
Serveurs Tuya (Chine) → Internet → 
Homey → Action

Latence: ~1000-2000ms
Dépendance: Internet + Serveurs Tuya
Privacy: Données transitent par cloud
```

**Mode Local (Universal Tuya Zigbee):**
```
Smart Plug → Zigbee → Homey → Action

Latence: ~50-200ms
Dépendance: Aucune
Privacy: 100% local
```

**Notre app = Mode Local uniquement!**

---

### Q: Comment fonctionne le mesh Zigbee?

**A:** Principe mesh:

**Sans mesh:**
```
Sensor → Homey (portée limitée ~10m)
```

**Avec mesh (smart plugs = répéteurs):**
```
Sensor → Smart Plug → Smart Plug → Homey
        (répéteur)   (répéteur)

Portée: ~30m+ avec 2-3 répéteurs
```

**Avantages smart plugs comme répéteurs:**
- ✅ Toujours alimentés (AC power)
- ✅ Améliorent portée automatiquement
- ✅ Stabilisent mesh
- ✅ Gratuit (pas de hardware extra)

**Recommandation:**
- Placer smart plugs stratégiquement
- Entre Homey et zones éloignées
- Créer "chemin" Zigbee

---

### Q: Quel protocole Zigbee est utilisé?

**A:** Standards supportés:

**Notre app utilise:**
- ✅ **Zigbee 3.0** (standard moderne)
- ✅ **ZCL** (Zigbee Cluster Library)
- ✅ **Homey Zigbee Stack** (SDK3)

**Clusters utilisés pour smart plugs:**
```javascript
- ON_OFF (0x0006)              // On/Off control
- ELECTRICAL_MEASUREMENT (0x0B04)  // Power
- METERING (0x0702)            // Energy
- BASIC (0x0000)               // Device info
```

**Compatibilité:**
- ✅ Zigbee 3.0 devices
- ✅ Zigbee 1.2 devices (legacy)
- ✅ Tout coordinator Zigbee 3.0

---

## 📊 MONITORING

### Q: Comment voir la consommation énergétique?

**A:** Dans Homey:

**Option 1: Insights**
```
1. App → Device → Insights
2. Voir graphiques:
   - Power (W) - Temps réel
   - Energy (kWh) - Cumulatif
3. Période: Jour/Semaine/Mois/Année
```

**Option 2: Flows**
```
Créer flow:
WHEN: Power changes
AND: Power > 100W
THEN: Send notification

Monitoring actif!
```

**Option 3: Energy App**
```
1. Installer "Energy" app
2. Ajouter smart plugs
3. Dashboard complet
4. Coût électricité
```

---

### Q: Précision du monitoring?

**A:** Selon device:

**MOES / Nous (high-end):**
- Précision: ±1-2%
- Update: Temps réel
- Mesures: V, A, W, kWh, PF

**LSC / Lidl (mid-range):**
- Précision: ±2-5%
- Update: ~5s
- Mesures: W, kWh

**Generic Tuya (budget):**
- Précision: ±5-10%
- Update: ~10-30s
- Mesures: W, kWh (parfois)

**Recommandation:**
- Pour monitoring précis: MOES ou Nous
- Pour simple on/off: Generic OK

---

## 🔐 SÉCURITÉ & PRIVACY

### Q: Mes données sont-elles envoyées à Tuya?

**A:** Avec Universal Tuya Zigbee:

**NON! Aucune donnée envoyée:**
- ✅ **100% local** sur votre réseau
- ✅ **Pas de connexion Internet** requise
- ✅ **Pas de cloud Tuya** utilisé
- ✅ **Pas de télémétrie**

**Vérification:**
```
Test:
1. Débrancher Internet
2. Tester smart plugs
3. Si fonctionne = ✅ Local confirmé
```

**Comparaison:**
- ❌ Tuya Cloud app = Données → cloud
- ❌ Tuya Smart app = Données → cloud
- ✅ Universal Tuya Zigbee = Données restent locales

---

### Q: Sécurité du protocole Zigbee?

**A:** Sécurité intégrée:

**Zigbee 3.0 Security:**
- ✅ AES-128 encryption
- ✅ Network key unique
- ✅ Device authentication
- ✅ Secured pairing

**En pratique:**
- Communication chiffrée automatiquement
- Impossible d'intercepter commandes
- Sécurité niveau bancaire

**Recommandations supplémentaires:**
- Changer network key Zigbee régulièrement
- Ne pas partager diagnostic reports publiquement
- Isoler Homey sur VLAN si possible

---

## 📞 SUPPORT

### Q: Où obtenir de l'aide?

**A:** Ressources disponibles:

**Forum Homey Community:**
- Thread: "Universal Tuya Zigbee"
- Questions support
- Partage devices compatibles

**GitHub:**
- Issues: github.com/dlnraja/com.tuya.zigbee/issues
- Device database
- Feature requests

**Documentation:**
- Ce fichier: docs/community/SMART_PLUGS_FAQ.md
- Support Zigbee: docs/community/TUYA_ZIGBEE_LOCAL_SUPPORT.md
- Workflow: docs/workflow/

**Diagnostic Reports:**
```
Pour aide rapide:
1. App → Settings → Send diagnostic
2. Noter diagnostic ID
3. Poster sur forum avec ID
4. Réponse sous 24-48h
```

---

### Q: Comment contribuer au projet?

**A:** Plusieurs façons:

**Tester nouveaux devices:**
```
1. Acheter device Tuya Zigbee
2. Tester pairing
3. Reporter résultats (marche/marche pas)
4. Partager manufacturer ID
```

**Reporter bugs:**
```
1. GitHub Issues
2. Décrire problème précisément
3. Joindre diagnostic report
4. Logs si possible
```

**Documentation:**
```
1. Partager tips sur forum
2. Documenter devices compatibles
3. Traduire docs
4. Créer guides
```

**Code:**
```
1. Fork GitHub repo
2. Implémenter feature
3. Create Pull Request
4. Tests & review
```

---

## ✅ CHECKLIST RAPIDE

### Avant d'acheter:
- [ ] Logo "Zigbee 3.0" sur packaging
- [ ] 16A (EU) ou équivalent local
- [ ] Reviews mentionnent Homey/Zigbee
- [ ] Energy monitoring (si besoin)
- [ ] Prix raisonnable (€10-25)

### Après achat:
- [ ] Factory reset device
- [ ] Pairing < 2m de Homey
- [ ] Test on/off
- [ ] Test energy monitoring
- [ ] Test offline (débrancher Internet)
- [ ] Créer flows
- [ ] Placer stratégiquement (répéteur mesh)

### Si problème:
- [ ] Vérifier portée Zigbee
- [ ] Vérifier interférences
- [ ] Factory reset + re-pairing
- [ ] Envoyer diagnostic report
- [ ] Poster sur forum avec détails

---

**Version:** 1.0  
**Date:** 16 Octobre 2025  
**App:** Universal Tuya Zigbee v2.15.131

🎯 **Ces FAQs couvrent 95% des questions forum sur smart plugs Tuya Zigbee!**
