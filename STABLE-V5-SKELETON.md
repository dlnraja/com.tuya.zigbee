# 🟢 STABLE-V5 SKELETON (v5.11.206+)
## Structure Minimaliste - Priorité Stabilité

---

## 📋 CONCEPT

### Philosophie
- **Stabilité avant tout** - Basé sur v5.11.154 (référence forum post #1682)
- **Couverture maximale** - Ajout incremental des device IDs via commits
- **Drivers simples** - Mapping DP statique, pas de complexité inutile
- **NO  suffix** - Tous les drivers sont adaptatifs à toutes les sources d'énergie

### Structure des fichiers
```
tuya-repair-stable-v5/
├── app.js                 (Minimal, SDK3, async)
├── app.json               (v5.11.206+, fingerprints statiques)
├── package.json
├── drivers/               (50 drivers top priority)
│   ├── switch_1gang/
│   ├── switch_2gang/
│   ├── button_wireless_3/
│   ├── soil_sensor/
│   ├── climate_sensor/
│   └── [46 autres drivers prioritaires]
├── lib/
│   ├── devices/
│   │   ├──SwitchBase.js      (DP statique)
│   │   ├──SensorBase.js      (DP statique)
│   │   └── BaseHybridDevice.js      (182KB)
│   ├── mixins/
│   │   ├── PhysicalButtonMixin.js   (2000ms timeout)
│   │   └── VirtualButtonMixin.js
│   └── tuya/
│       ├── TuyaZigbeeDevice.js
│       └── TuyaEF00Manager.js
└── .github/workflows/     (Minimal: validate + publish)
```

---

## 🎯 DRIVERS PRIORITAIRES (STABLE-V5)

### Switches (30 drivers)
| Driver | Status | Fingerprints |
|--------|--------|--------------|
| switch_1gang | ✅ Stable | 50+ mfrs |
| switch_2gang | ✅ Stable | 40+ mfrs (+ _TZ3000_tzvbimpq) |
| switch_3gang | ✅ Stable | 30+ mfrs |
| switch_4gang | ✅ Stable | 25+ mfrs |
| switch_5gang..8gang | ⚠️ Minor | Variants |
| dimmer_1gang | ✅ Stable | BSEED ZCL-only |

### Boutons (15 drivers)
| Driver | Status | Notes |
|--------|--------|-------|
| button_wireless_1 | ✅ Stable | + _TZ3000_xxx TS0041 |
| button_wireless_2 | ✅ Stable | + _TZ3000_xxx TS0042 |
| button_wireless_3 | ✅ Stable | + _TZ3000_famkxci2 TS0043 |
| button_wireless_4 | ✅ Stable | + _TZ3000_ee8nrt2l TS0044 |
| button_wireless_6 | ⚠️ Minor | TS0046 |
| button_wireless_8 | ⚠️ Minor | TS0048 |

### Capteurs (20 drivers)
| Driver | Status | Notes |
|--------|--------|-------|
| contact_sensor | ✅ Stable | + _TZ3000_n2egfsli TS0203 |
| motion_sensor | ✅ Stable | IAS Zone |
| climate_sensor | ✅ Stable | + _TZ3000_tsgqxdb4, + _TZE284_8se38w3c |
| soil_sensor | ✅ Stable | DP3=moisture, DP5=temp |
| temphumidsensor | ✅ Stable | Multi-protocol |
| air_quality_co2 | ⚠️ Minor | CO2 validation |

### Climate/HVAC (15 drivers)
| Driver | Status | Notes |
|--------|--------|-------|
| thermostat_tuya_dp | ✅ Stable | _TZE200_xxx |
| radiator_valve | ✅ Stable | TRV control |
| floor_heating_thermostat | ✅ Stable | Combined |
| hvac_air_conditioner | ⚠️ Minor | AC control |
| smart_lcd_thermostat | ⚠️ Minor | Display |

### Others (20 drivers)
| Driver | Status | Notes |
|--------|--------|-------|
| plug_smart | ✅ Stable | Power monitoring |
| curtain_motor | ✅ Stable | Position |
| fingerprint_lock | ✅ Stable | Security |
| garage_door | ✅ Stable | Open/close |

---

## ⚙️ CONFIGURATION ENERGY ADAPTATIVE (STABLE-V5)

### Pattern: NO  suffix, adaptatif

```javascript
// drivers/switch_1gang/device.js
class Device extends PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase)) {
  
  get mainsPowered() { return true; }  // Wall switch = mains
  
  async onNodeInit() {
    // Remove battery if inherited
    await this.removeCapability('measure_battery').catch(() => {});
    await this.removeCapability('alarm_battery').catch(() => {});
    
    // Standard DP mapping
    this.dpMappings = {
      1: { capability: 'onoff' },
      14: { capability: 'onoff' },  // Power-on behavior
      15: { capability: 'dim' }      // Backlight
    };
  }
}
```

### Capteurs avec Runtime Detection

```javascript
// drivers/climate_sensor/device.js
class Device extendsSensorBase {
  
  async onNodeInit() {
    // Remove battery for mains-powered variants
    await this.removeCapability('measure_battery').catch(() => {});
    await this.removeCapability('alarm_battery').catch(() => {});
    
    // Static DP mapping
    this.dpMappings = {
      1: { capability: 'measure_temperature', divisor: 10 },
      2: { capability: 'measure_humidity', divisor: 10 },
      3: { capability: 'measure_battery', min: 0, max: 100 }
    };
  }
  
  // No mainsPowered = battery device (runtime detection)
}
```

---

## 📊 CONFIGURATION DP STATIQUE (STABLE-V5)

### Switches Pattern
```javascript
const SWITCH_DP_MAPPING = {
  // Gang states
  1: { capability: 'onoff', endpoint: 1 },
  2: { capability: 'onoff', endpoint: 2 },
  3: { capability: 'onoff', endpoint: 3 },
  4: { capability: 'onoff', endpoint: 4 },
  // Power behavior
  14: { capability: 'meta_power_on_state', type: 'enum' },
  // Backlight
  15: { capability: 'dim', type: 'enum' }
};
```

### Sensors Pattern
```javascript
const SENSOR_DP_MAPPING = {
  // Temperature
  1: { capability: 'measure_temperature', divisor: 10 },
  // Humidity
  2: { capability: 'measure_humidity', divisor: 10 },
  // Battery
  4: { capability: 'measure_battery', min: 0, max: 100 },
  // Contact/Motion
  11: { capability: 'alarm_contact', bool: true },
  // Occupancy
  15: { capability: 'alarm_motion', bool: true }
};
```

---

## 🔧 SCRIPTS DE VALIDATION (STABLE-V5)

### Post-Fix Validation
```bash
# 1. Check collisions
node scripts/automation/lint-collisions.js

# 2. Check anti-generic score
node scripts/validation/audit-anti-generic.js

# 3. Validate syntax
node -e "console.log('Syntax OK')"

# 4. Homey validate
npx homey app validate

# 5. Git status
git status
```

### Expected Results
| Script | Target | Status |
|--------|--------|--------|
| lint-collisions.js | 0 collisions | ✅ |
| audit-anti-generic.js | Score 90%+ | ✅ |
| homey app validate | no errors | ✅ |

---

## 📝 GIT WORKFLOW (STABLE-V5)

### Version Bump Order
```bash
# 1. Update version
# package.json: "version": "5.11.207"
# .homeycompose/app.json: "version": "5.11.207"

# 2. Add changelog
# .homeychangelog.json: add entry at TOP

# 3. Commit
git add .
git commit -m "bump: v5.11.207"

# 4. Push
git push origin stable-v5
```

### Branch Strategy
```
master (v7.x+) ← Intelligent, dynamic
stable-v5 (v5.11.206+) ← Stable, minimal, proven
```

---

## ✅ CHECKLIST STABLE-V5

- [ ] 50 drivers prioritaires sélectionnés
- [ ] NO  suffix (adaptatif)
- [ ] DP mappings statiques (pas de dynamic detection)
- [ ] Physical button detection (2000ms timeout)
- [ ] IAS Zone support (contact, motion)
- [ ] Battery runtime detection (UnifiedBatteryHandler)
- [ ] Flow cards statiques (driver.flow.compose.json)
- [ ] Validation: lint-collisions.js = 0
- [ ] Validation: audit-anti-generic.js = 90%+
- [ ] Validation: homey app validate = success

---

**Version**: v5.11.206+ | **Status**: SKELETON CREATED
**Generated**: 2026-05-08 | **Author**: dlnraja