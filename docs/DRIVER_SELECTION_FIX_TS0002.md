# 🎯 FIX DRIVER SELECTION: TS0002 MODULE USB 2-PORTS

**Date:** 2025-11-15 16:46
**Problème:** Re-pairing sélectionne toujours le mauvais driver
**Device:** TS0002 (_TZ3000_h1ipgkwn) - Module USB 2-ports

---

## 🔍 DIAGNOSTIC ROOT CAUSE

### Situation Actuelle

**Device:**
```
Manufacturer: _TZ3000_h1ipgkwn
Product ID: TS0002
Type: Module USB 2-ports (AC + 2x USB)
Endpoints: 2 (Gang 1 + Gang 2)
```

**Problème:** Device pairé dans **mauvais driver** à chaque fois

---

### Analyse Driver Matching Homey SDK3

**D'après la documentation officielle:**
```
Homey Apps SDK > Zigbee > Pairing

"To ensure the correct driver will be loaded when pairing a device,
your driver must have a matching:
- manufacturerName
- productId
- (optionally) zigbee device id"

Homey will show ALL matching drivers to the user during pairing.
There is NO priority system - user must choose manually.
```

**Drivers qui matchent actuellement _TZ3000_h1ipgkwn:**

| Driver | Has _TZ3000_h1ipgkwn | Has TS0002 | Match? |
|--------|---------------------|------------|--------|
| `air_quality_comprehensive` | ✅ | ❌ | ❌ |
| `module_mini` | ✅ | ❌ | ❌ |
| `switch_2gang` | ✅ | ✅ | ✅ MATCH |
| `switch_touch_2gang` | ✅ | ✅ | ✅ MATCH |
| `switch_wall_2gang` | ✅ | ✅ | ✅ MATCH |
| `switch_wall_2gang_smart` | ✅ | ❌ | ❌ |
| `usb_outlet_2port` | ✅ | ✅ | ✅ MATCH |

**Résultat:** 4 drivers matchent! Homey demande à l'utilisateur de choisir.

**Problème:** Les noms des drivers ne sont pas clairs pour l'utilisateur:
```
- Switch 2gang
- Switch Touch 2gang
- Switch Wall 2gang
- USB Outlet 2-Port
```

L'utilisateur ne sait pas lequel choisir pour son module USB!

---

## 🎯 SOLUTION: RENDRE LES DRIVERS SPÉCIFIQUES

### Stratégie 1: Retirer _TZ3000_h1ipgkwn des drivers non-appropriés

**Principe:** Si _TZ3000_h1ipgkwn + TS0002 est un **module USB**, alors il devrait être UNIQUEMENT dans `usb_outlet_2port`.

**Actions:**

#### 1. Retirer de `switch_2gang`
```json
// drivers/switch_2gang/driver.compose.json
"manufacturerName": [
  "lumi.ctrl_ln1",
  "_TZ3000_kqvb5akv",
  "_TZ3000_ww6drja5",
  "_TZ3000_ltt60asa",
  "_TZ3000_akqdg6g7",
  // REMOVE: "_TZ3000_h1ipgkwn",  ❌ Retiré
  "_TZ3000_xkap8wtb",
  ...
]
```

#### 2. Retirer de `switch_touch_2gang`
```json
// drivers/switch_touch_2gang/driver.compose.json
"manufacturerName": [
  "_TZ3000_4fjiwweb",
  // REMOVE: "_TZ3000_h1ipgkwn",  ❌ Retiré
  "_TZ3000_ji4araar",
  ...
]
```

#### 3. Retirer de `switch_wall_2gang`
```json
// drivers/switch_wall_2gang/driver.compose.json
"manufacturerName": [
  "_TZ3000_4fjiwweb",
  "_TZ3000_4zf0crgo",
  "_TZ3000_akqdg6g7",
  // REMOVE: "_TZ3000_h1ipgkwn",  ❌ Retiré
  "_TZ3000_ji4araar",
  ...
]
```

#### 4. Garder UNIQUEMENT dans `usb_outlet_2port`
```json
// drivers/usb_outlet_2port/driver.compose.json
"manufacturerName": [
  "_TZ3000_1obwwnmq",
  "_TZ3000_w0qqde0g",
  "_TZ3000_gjnozsaz",
  "_TZ3000_8gs8h2e4",
  "_TZ3000_vzopcetz",
  "_TZ3000_g5xawfcq",
  "_TZ3000_h1ipgkwn",  ✅ GARDÉ ICI UNIQUEMENT
  "_TZ3000_rdtixbnu",
  ...
],
"productId": [
  "TS011F",
  "TS0121",
  "TS011E",
  "TS0001",  // ⚠️ Peut-être retirer aussi (1-gang)
  "TS0002"   ✅ GARDÉ
]
```

**Résultat:** Lors du pairing, seul `usb_outlet_2port` matche → pas de choix à faire!

---

### Stratégie 2: Améliorer les noms de drivers (fallback)

Si plusieurs drivers matchent quand même, améliorer les noms pour guider l'utilisateur:

```json
// drivers/usb_outlet_2port/driver.compose.json
{
  "name": {
    "en": "⚡ USB Outlet 2-Port (AC + 2x USB) - TS0002",
    "fr": "⚡ Prise USB 2-Port (AC + 2x USB) - TS0002"
  }
}

// drivers/switch_2gang/driver.compose.json
{
  "name": {
    "en": "🔌 Switch 2-Gang (Standard Wall Switch)",
    "fr": "🔌 Interrupteur 2-Gang (Mural Standard)"
  }
}

// drivers/switch_touch_2gang/driver.compose.json
{
  "name": {
    "en": "👆 Switch 2-Gang Touch (Glass Panel)",
    "fr": "👆 Interrupteur 2-Gang Tactile (Panneau Verre)"
  }
}
```

**Résultat:** Utilisateur peut clairement identifier quel driver choisir.

---

### Stratégie 3: Ajouter learnmode hint

```json
// drivers/usb_outlet_2port/driver.compose.json
{
  "zigbee": {
    "learnmode": {
      "image": "/drivers/usb_outlet_2port/assets/learnmode.svg",
      "instruction": {
        "en": "⚡ FOR USB OUTLET MODULE ONLY! Press button for 5s until LED blinks. If this is a WALL SWITCH, cancel and choose another driver.",
        "fr": "⚡ POUR MODULE USB UNIQUEMENT! Appuyez 5s sur le bouton jusqu'à LED clignote. Si c'est un INTERRUPTEUR MURAL, annulez et choisissez un autre driver."
      }
    }
  }
}
```

**Résultat:** Même si plusieurs drivers matchent, l'utilisateur voit l'instruction et sait si c'est le bon driver.

---

## 🔧 IMPLÉMENTATION

### Phase 1: Retirer Conflits (PRIORITÉ IMMÉDIATE)

**Fichiers à modifier:**

1. `drivers/switch_2gang/driver.compose.json`
   - Retirer `_TZ3000_h1ipgkwn` de manufacturerName

2. `drivers/switch_touch_2gang/driver.compose.json`
   - Retirer `_TZ3000_h1ipgkwn` de manufacturerName

3. `drivers/switch_wall_2gang/driver.compose.json`
   - Retirer `_TZ3000_h1ipgkwn` de manufacturerName

4. `drivers/switch_wall_2gang_smart/driver.compose.json`
   - Retirer `_TZ3000_h1ipgkwn` de manufacturerName (s'il y est)

5. `drivers/module_mini/driver.compose.json`
   - Retirer `_TZ3000_h1ipgkwn` de manufacturerName

6. `drivers/air_quality_comprehensive/driver.compose.json`
   - Retirer `_TZ3000_h1ipgkwn` de manufacturerName

**Garder uniquement dans:**
- `drivers/usb_outlet_2port/driver.compose.json` ✅

**Temps:** 15 minutes

---

### Phase 2: Améliorer Nom Driver (PRIORITÉ MOYENNE)

```json
// drivers/usb_outlet_2port/driver.compose.json
{
  "name": {
    "en": "⚡ USB Outlet 2-Port (1 AC + 2 USB) - TS0002",
    "fr": "⚡ Prise USB 2-Port (1 AC + 2 USB) - TS0002"
  },
  "zigbee": {
    "learnmode": {
      "instruction": {
        "en": "⚡ USB OUTLET MODULE: Press button for 5 seconds until LED blinks rapidly. This driver is for USB outlet modules with 1 AC socket + 2 USB ports.",
        "fr": "⚡ MODULE PRISE USB: Appuyez sur le bouton pendant 5 secondes jusqu'à ce que la LED clignote rapidement. Ce driver est pour les modules prise USB avec 1 prise AC + 2 ports USB."
      }
    }
  }
}
```

**Temps:** 10 minutes

---

### Phase 3: Valider Fix (TEST)

**Test 1: Pairing nouveau device**
```
1. Factory reset du module USB TS0002
2. Lancer pairing dans Homey
3. Vérifier que SEUL "USB Outlet 2-Port" apparaît
4. Vérifier que le device est correctement pairé
5. Vérifier onoff.l1 et onoff.l2 fonctionnent
```

**Test 2: Re-pairing device existant**
```
1. Supprimer device de Homey
2. Re-pairing
3. Vérifier sélection automatique du bon driver
```

**Temps:** 15 minutes

---

## 📊 DRIVERS AFFECTÉS PAR _TZ3000_h1ipgkwn

### AVANT (7 drivers avec conflits)

```
1. air_quality_comprehensive     ❌ A RETIRER
2. module_mini                    ❌ A RETIRER
3. switch_2gang                   ❌ A RETIRER
4. switch_touch_2gang             ❌ A RETIRER
5. switch_wall_2gang              ❌ A RETIRER
6. switch_wall_2gang_smart        ❌ A RETIRER
7. usb_outlet_2port               ✅ A GARDER
```

### APRÈS (1 driver spécifique)

```
1. usb_outlet_2port               ✅ SEUL MATCH
```

**Résultat:** Pairing automatique sans choix manuel!

---

## ✅ VALIDATION AVEC DOCS HOMEY SDK3

### Pattern Recommandé Homey

**D'après SDK3 Docs:**
```
"Be as specific as possible with manufacturerName and productId
to avoid conflicts between drivers."
```

**Notre Solution:**
```
✅ 1 manufacturerName = 1 driver spécifique
✅ productId liste minimale (seulement devices réellement supportés)
✅ Noms de drivers clairs et descriptifs
✅ Learnmode instructions explicites
```

### Best Practices Homey

1. **Avoid wildcards** - Ne pas avoir trop de manufacturerName dans un driver ✅
2. **Be specific with productId** - Retirer TS0001 de usb_outlet_2port (c'est 1-gang) ✅
3. **Clear driver names** - Ajouter "(AC + 2 USB)" dans le nom ✅
4. **Helpful learnmode** - Instructions qui confirment le type de device ✅

---

## 🚀 CODE CHANGES

### Change 1: switch_2gang/driver.compose.json
