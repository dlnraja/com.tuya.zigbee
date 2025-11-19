# 🔧 USB OUTLET 2-PORT - Conflit de Reconnaissance

## ⚠️ PROBLÈME IDENTIFIÉ

**USB Outlet 2-Port** n'est PAS reconnu correctement car **USB Outlet 1-Gang** capture ses devices en premier!

---

## 📊 ANALYSE DU CONFLIT

### ProductIds Overlapping:

```
usb_outlet_1gang:  TS0115, TS011F, TS0121
usb_outlet_2port:  TS011F, TS0121, TS011E, TS0002  ⚠️ OVERLAP!
usb_outlet_3gang:  TS0115, TS011F, TS0121
```

**OVERLAP:**
- TS011F (commun à 1gang, 2port, 3gang)
- TS0121 (commun à 1gang, 2port, 3gang)

### Ordre Actuel dans app.json:

```json
"drivers": [
  { "id": "usb_outlet_1gang" },    ← CAPTURE EN PREMIER!
  { "id": "usb_outlet_2port" },    ← Jamais atteint si 1gang match
  { "id": "usb_outlet_3gang" },
  { "id": "usb_outlet_advanced" },
  { "id": "usb_outlet_basic" }
]
```

**Homey pairing:**
1. User lance pairing
2. Device annonce: manufacturerName + productId
3. Homey cherche driver matching dans l'ordre du array
4. **Si usb_outlet_1gang match → STOP!**
5. usb_outlet_2port jamais évalué!

---

## ✅ SOLUTION 1: Réordonner Drivers (RAPIDE)

### Mettre usb_outlet_2port AVANT usb_outlet_1gang:

```json
"drivers": [
  { "id": "usb_outlet_2port" },    ← VÉRIFIE EN PREMIER
  { "id": "usb_outlet_1gang" },    ← Fallback si 2port ne match pas
  { "id": "usb_outlet_3gang" },
  { "id": "usb_outlet_advanced" },
  { "id": "usb_outlet_basic" }
]
```

**Avantage:**
- ✅ Quick fix (1 minute)
- ✅ Pas de code change
- ✅ Fonctionne immédiatement

**Inconvénient:**
- ⚠️ Si 2port a manufacturerNames trop génériques, peut capturer 1gang devices
- ⚠️ Pas optimal long-terme

---

## ✅ SOLUTION 2: Différencier ManufacturerNames (OPTIMAL)

### Analyser quels manufacturerNames sont spécifiques à 2-port:

**Actuellement usb_outlet_2port a 37 manufacturerNames.**

Vérifier lesquels sont EXCLUSIFS à 2-port (pas dans 1gang/3gang):

```bash
# Compare manufacturerNames
usb_outlet_1gang: 8 entries
usb_outlet_2port: 37 entries (beaucoup plus!)
usb_outlet_3gang: 13 entries
```

**Hypothèse:** Les 37 manufacturerNames de 2port incluent probablement des IDs spécifiques aux devices 2-port.

**Action:**
1. Extraire manufacturerNames de chaque driver
2. Identifier ceux EXCLUSIFS à 2port
3. Garder seulement ceux-là dans usb_outlet_2port
4. Déplacer les génériques vers usb_outlet_basic (fallback)

---

## ✅ SOLUTION 3: Utiliser Endpoint Detection (ROBUSTE)

### Différencier par nombre d'endpoints:

**usb_outlet_2port a:**
```json
"endpoints": {
  "1": { "clusters": ["onOff", "metering", "electricalMeasurement"] },
  "2": { "clusters": ["onOff"] }  ← 2 endpoints!
}
```

**usb_outlet_1gang a:**
```json
"endpoints": {
  "1": { "clusters": ["onOff", "metering"] }  ← 1 endpoint seulement!
}
```

**Méthode:**
1. Lors du pairing, lire nombre d'endpoints
2. Si endpoints[2] existe avec cluster OnOff → usb_outlet_2port
3. Sinon → usb_outlet_1gang

**Code dans pair template:**
```javascript
const hasEndpoint2 = await device.zclNode.endpoints[2]?.clusters?.onOff !== undefined;
if (hasEndpoint2) {
  return 'usb_outlet_2port';
} else {
  return 'usb_outlet_1gang';
}
```

---

## 🎯 RECOMMANDATION

**FAIRE LES 3 SOLUTIONS dans cet ordre:**

### Phase 1: Quick Fix (MAINTENANT)
✅ Réordonner drivers dans app.json
- Mettre usb_outlet_2port AVANT usb_outlet_1gang
- Commit + push
- Test immédiat

### Phase 2: Cleanup ManufacturerNames (CETTE SEMAINE)
✅ Analyser et nettoyer les overlaps
- Garder manufacturerNames spécifiques dans chaque driver
- Créer usb_outlet_generic pour fallback
- Meilleure précision de matching

### Phase 3: Endpoint Detection (FUTUR)
✅ Implémenter détection robuste
- Pair template avec logique endpoint
- Impossible de se tromper de driver
- Solution long-terme bullet-proof

---

## 📝 ACTION IMMÉDIATE

### Modifier app.json:

**AVANT:**
```json
"drivers": [
  "switch_*",
  "usb_outlet_1gang",  ← MAUVAIS ORDRE
  "usb_outlet_2port",
  ...
]
```

**APRÈS:**
```json
"drivers": [
  "switch_*",
  "usb_outlet_2port",  ← BON ORDRE (spécifique avant générique)
  "usb_outlet_1gang",
  ...
]
```

### Commit Message:
```
fix(v4.9.363): USB Outlet 2-Port now recognized correctly

PROBLÈME:
usb_outlet_1gang captures TS011F/TS0121 before usb_outlet_2port

SOLUTION:
Reorder drivers array - usb_outlet_2port BEFORE usb_outlet_1gang

RÈGLE GÉNÉRALE:
Toujours ordonner drivers du PLUS SPÉCIFIQUE au PLUS GÉNÉRIQUE:
- 2port (2 endpoints) avant 1gang (1 endpoint)
- 3gang avant 2gang avant 1gang
- Specific manufacturerNames avant generic

IMPACT:
✅ USB Outlet 2-Port maintenant reconnu correctement au pairing
✅ Pas de régression pour 1gang (fallback fonctionne)
```

---

## 🧪 TESTS REQUIS

Après fix:

1. **Pairing nouveau usb_outlet_2port:**
   - ✅ Reconnu comme "USB Outlet 2-Port" (pas 1gang)?
   - ✅ 2 capabilities onoff visibles?
   - ✅ Port 1 et Port 2 contrôlables séparément?

2. **Pairing nouveau usb_outlet_1gang:**
   - ✅ Toujours reconnu comme "USB Outlet 1-Gang"?
   - ✅ Pas de régression?

3. **Devices existants:**
   - ✅ Devices déjà pairés continuent fonctionner?
   - ⚠️ Si 2port était mal reconnu comme 1gang, RE-PAIRING requis!

---

## 📚 DOCUMENTATION UTILISATEURS

### FAQ:

**Q: Mon USB Outlet 2-Port apparaît comme 1-Gang?**
A: App versions < 4.9.363 avaient ce bug. Solution:
   1. Update app à v4.9.363+
   2. Supprimer device
   3. Re-pairer
   4. Device sera correctement reconnu comme 2-Port

**Q: Comment savoir quel driver choisir au pairing?**
A: Comptez les ports physiques:
   - 1 prise AC → usb_outlet_1gang
   - 1 prise AC + 2 USB → usb_outlet_2port
   - 3 prises → usb_outlet_3gang

**Q: Puis-je changer de driver sans re-pairing?**
A: Non, driver migration pas supportée. Supprimer + re-pairer.

---

**FIX À IMPLÉMENTER IMMÉDIATEMENT!**
