# 📋 STRATÉGIE CORRECTION IMAGES - 2026-04-19

## 🔍 ANALYSE DÉTAILLÉE

### Problème Réel Identifié
- Les images `sirentemphumidsensor/assets/images/large.png` **SONT** en 500x500 ✅
- Mais la **taille du fichier** est trop petite (6319 bytes)
- Le validateur Homey REQUIRE >= 50KB pour le fichier

### Images Valides Trouvées (3)
```
- energy_meter_3phase: 173874 bytes (169.8KB) - 500x500
- power_meter: 173874 bytes - 500x500  
- smart_rcbo: 173874 bytes - 500x500
```
**Toutes de même taille = image de référence**

### Images Invalides (320)
Toutes les autres images font < 50KB

## 🔧 SOLUTION IDENTIFIÉE

1. **Copier l'image de référence** (`energy_meter_3phase`) vers `sirentemphumidsensor`
2. **Régénérer toutes les images** avec `sharp` pour forcer une taille minimale

## 📝 PLAN D'ACTION
1. [x] Identifier le problème: taille fichier insuffisante
2. [ ] Copier image de référence vers sirentemphumidsensor
3. [ ] Régénérer toutes les images trop petites
4. [ ] Synchroniser changelog (7.4.5 → 7.4.6)
5. [ ] Mettre à jour workflows
6. [ ] Publier en test
