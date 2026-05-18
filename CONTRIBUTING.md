# CONTRIBUTING.md - Tuya Unified Zigbee

## 🎯 Principes Directeurs

1. **Shadow Implementation** : Aucune publication publique
2. **Zero Defect** : Chaque module validé syntaxiquement + testé
3. **Permissivité Native** : Drivers adaptatifs sans suffixe 
4. **Rules IA** : Conformité Rules 21, 24, 25

## 🔒 Anti-Patterns à Éviter

### Syntaxe JavaScript
// ❌ WRONG - Unmatched parentheses
return Math.round(safeDivide(uptime*10))), 10);

// ✅ CORRECT
return Math.round(safeDivide(uptime*10), 10);

// ❌ WRONG - if/ternary
if (device.zclNode?.modelId) return device.zclNode.modelId : null;

// ✅ CORRECT
return device.zclNode?.modelId ?? null;

### Manufacturer Names
// ❌ WRONG - Case-sensitive comparison
if (manufacturer === "Tuya") { }

// ✅ CORRECT - Use ManufacturerResolver
const normalized = ManufacturerResolver.normalize(manufacturer);

### Settings Keys
// ❌ WRONG - camelCase
this.settings.get('zb_modelId')

// ✅ CORRECT - snake_case
this.settings.get('zb_model_id')

## 📋 Checklist Avant Commit
- [ ] Syntaxe validée (node -c)
- [ ] ESLint sans erreur critique
- [ ] lint-collisions.js: 0 collisions
- [ ] Version synchronisée (package.json + .homeychangelog.json)
- [ ] Pas de  dans les noms de drivers

## 🔧 Scripts Utilitaires
```bash
# Validation complète
node scripts/automation/lint-collisions.js

# Context ingestion
node scripts/automation/context-ingestion.js

# Community sync
node scripts/community-sync/sync-all.js

# Duplicate fingerprints fix
node scripts/automation/fix-duplicate-fingerprints.js
```

---
Last Updated: 2026-05-18T07:15:56.120Z
