# ⚡ QUICK REFERENCE - DISCOVERIES & SCRIPTS

**v4.9.259** | Last Updated: 2 Nov 2025

---

## 🚀 MOST COMMON TASKS

### Validate Everything

```bash
node scripts/validation/validate-all-discoveries.js
```

### Apply All Fixes

```bash
node scripts/master/apply-all-discoveries.js
```

### Preview Changes (Dry Run)

```bash
node scripts/master/apply-all-discoveries.js --dry-run --verbose
```

### Clean Cache + Validate

```bash
rm -rf .homeycompose .homeybuild assets/drivers.json
homey app validate --level publish
```

### Complete Workflow

```bash
# 1. Validate
node scripts/validation/validate-all-discoveries.js

# 2. Fix
node scripts/master/apply-all-discoveries.js

# 3. Clean + Validate
rm -rf .homeycompose .homeybuild assets/drivers.json
homey app validate --level publish

# 4. Commit
git add -A
git commit -m "refactor: Applied all discoveries"
git push origin master
```

---

## 📚 KEY DOCUMENTS

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [DISCOVERIES_INDEX.md](DISCOVERIES_INDEX.md) | Navigation | Finding docs |
| [DISCOVERIES_CONSOLIDATED.md](docs/DISCOVERIES_CONSOLIDATED.md) | All patterns | Learning |
| [README_SCRIPTS.md](scripts/README_SCRIPTS.md) | Scripts guide | Using tools |
| [UNBRAND_REPORT.md](UNBRAND_HARMONIZATION_REPORT.md) | Changes | Understanding |
| [CHANGELOG_DISCOVERIES.md](CHANGELOG_DISCOVERIES.md) | Timeline | History |

---

## 🔧 KEY SCRIPTS

| Script | Command | Purpose |
|--------|---------|---------|
| Master | `node scripts/master/apply-all-discoveries.js` | Apply all |
| Validate | `node scripts/validation/validate-all-discoveries.js` | Check all |
| Unbrand | `node scripts/fixes/unbrand-harmonize-fix.js` | Remove brands |
| JSON | `node scripts/fixes/fix-json-quotes.js` | Fix quotes |

---

## 📦 UTILITY FUNCTIONS

```javascript
const DriverUtils = require('./lib/utils/DriverUtils');

// Unbrand text
DriverUtils.unbrandText('Switch (Hybrid)')  
// → 'Switch'

// Clean label
DriverUtils.cleanLabel('Battery (3V)')       
// → 'Battery'

// Fix JSON quotes
DriverUtils.fixJsonQuotes(content)           
// → fixed content

// Validate driver name
DriverUtils.validateDriverName('switch_hybrid_2gang')
// → { valid: false, violations: ['noHybrid'] }

// Harmonize capability
DriverUtils.harmonizeCapability('onoff.button2')
// → 'onoff.gang2'

// Clean cache
DriverUtils.cleanCache(appPath)              
// → ['homeycompose', '.homeybuild']
```

**40+ functions available** - See `lib/utils/DriverUtils.js`

---

## 🎯 PATTERNS DISCOVERED

### Naming Convention

```
✅ switch_wall_2gang
✅ climate_monitor_temp_humidity
❌ switch_moes_2gang (branded)
❌ switch_hybrid_2gang (hybrid)
```

### Capabilities

```javascript
✅ ["onoff", "onoff.gang2", "onoff.gang3"]
❌ ["onoff", "onoff.button2", "onoff.button3"]
```

### Translations

```
✅ "Battery Type"
✅ "Performance (More responsive)"
❌ "Battery Type (Voltage)"
❌ "CR2032 (3V Button Cell)"
```

### JSON

```json
✅ "manufacturerName": ["_TZ3000_xxx"]
❌ "manufacturerName": ['_TZ3000_xxx']
```

---

## 📊 STATISTICS

```
Drivers:               186 (100% validated)
Renamed:               6
Labels cleaned:        149
Scripts created:       8
Functions created:     40+
Errors fixed:          12 → 0
Warnings fixed:        158 → 0
```

---

## 🔍 TROUBLESHOOTING

### JSON Error

```bash
node scripts/fixes/fix-json-quotes.js
```

### Validation Fails

```bash
rm -rf .homeycompose .homeybuild assets/drivers.json
homey app validate --level publish
```

### Too Many Changes

```bash
node scripts/master/apply-all-discoveries.js --dry-run --verbose
```

---

## 💡 BEST PRACTICES

1. ✅ Always validate before commit
2. ✅ Clean cache before validation
3. ✅ Use --dry-run for preview
4. ✅ Commit atomically
5. ✅ Check reports after run

---

## 🎓 LEARNING PATH

### Quick (5 min)

- [x] Read: QUICK_REFERENCE.md (this file)
- [ ] Run: Validation script
- [ ] Check: Reports

### Standard (30 min)

- [ ] Read: UNBRAND_HARMONIZATION_REPORT.md
- [ ] Read: README_SCRIPTS.md
- [ ] Try: Master script with --dry-run

### Complete (2 hours)

- [ ] Read: DISCOVERIES_CONSOLIDATED.md
- [ ] Study: DriverUtils.js
- [ ] Understand: All patterns

---

## 📁 FILE LOCATIONS

```
docs/DISCOVERIES_CONSOLIDATED.md           📚 All patterns
scripts/README_SCRIPTS.md                  📚 Scripts guide
lib/utils/DriverUtils.js                   🔧 40+ utilities

scripts/master/apply-all-discoveries.js    🚀 Master script
scripts/validation/validate-all-discoveries.js  ✅ Validate

reports/master-script-report.json          📊 Latest run
reports/validation/                        📊 Validations
```

---

## 🔗 QUICK LINKS

- **Navigation**: [DISCOVERIES_INDEX.md](DISCOVERIES_INDEX.md)
- **Patterns**: [DISCOVERIES_CONSOLIDATED.md](docs/DISCOVERIES_CONSOLIDATED.md)
- **Scripts**: [README_SCRIPTS.md](scripts/README_SCRIPTS.md)
- **Changes**: [UNBRAND_REPORT.md](UNBRAND_HARMONIZATION_REPORT.md)
- **Timeline**: [CHANGELOG_DISCOVERIES.md](CHANGELOG_DISCOVERIES.md)

---

## ⚡ ONE-LINERS

```bash
# Validate
node scripts/validation/validate-all-discoveries.js

# Fix all
node scripts/master/apply-all-discoveries.js

# Preview
node scripts/master/apply-all-discoveries.js --dry-run

# Clean
rm -rf .homeycompose .homeybuild assets/drivers.json

# Test
homey app validate --level publish

# Complete
node scripts/validation/validate-all-discoveries.js && \
node scripts/master/apply-all-discoveries.js && \
rm -rf .homeycompose .homeybuild assets/drivers.json && \
homey app validate --level publish
```

---

**Version**: 1.0  
**Status**: ✅ READY  
**For**: Quick daily reference
