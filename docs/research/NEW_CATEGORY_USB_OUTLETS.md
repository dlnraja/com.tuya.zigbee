# 🔌 NEW CATEGORY: USB Outlets & Chargers

**Date**: October 23, 2025  
**Category**: USB Power & Charging  
**Priority**: HIGH - Missing Category  
**Status**: Ready for Implementation

---

## 🎯 CATEGORY OVERVIEW

### Why USB Category?
**User mentioned**: "il manque catégorie pour usb 1 2 ou 3 gang précédemment parlé dans les anciennes discussions"

USB outlets and chargers are a **distinct product category** with specific characteristics:
- Hybrid power delivery (AC + USB)
- Multiple USB ports
- Smart charging capabilities
- Power management
- Different from regular outlets

---

## 📋 PROPOSED USB DRIVERS

### 1. USB Outlet - Single Port
**Driver ID**: `usb_outlet_1port`  
**Name**: "USB Outlet - 1 Port"  
**Class**: `socket`

**Capabilities**:
- `onoff` - AC outlet control
- `measure_power` (optional)
- `meter_power` (optional)

**Description**:
> "Smart outlet with integrated USB charging port. Control AC power while charging USB devices. Hybrid power delivery for maximum convenience."

**Manufacturer IDs to Include**:
- All from current `avatto_usb_outlet`
- Additional USB-specific IDs

---

### 2. USB Outlet - Dual Port
**Driver ID**: `usb_outlet_2port`  
**Name**: "USB Outlet - 2 Ports"  
**Class**: `socket`

**Capabilities**:
- `onoff` - AC outlet control
- `onoff.usb1` - USB Port 1 control (if supported)
- `onoff.usb2` - USB Port 2 control (if supported)
- `measure_power` (optional)

**Description**:
> "Smart outlet with 2 USB charging ports. Independent control of AC power and USB ports. Perfect for charging multiple devices simultaneously."

**User's Device**: TS0012 (_TZ3000_zmlunnhy) goes here!

---

### 3. USB Outlet - Triple Port
**Driver ID**: `usb_outlet_3port`  
**Name**: "USB Outlet - 3 Ports"  
**Class**: `socket`

**Capabilities**:
- `onoff` - AC outlet control
- `onoff.usb1` - USB Port 1 control
- `onoff.usb2` - USB Port 2 control
- `onoff.usb3` - USB Port 3 control
- `measure_power` (optional)

**Description**:
> "Smart outlet with 3 USB charging ports. Full control of AC power and individual USB ports. Maximum charging capacity for your devices."

---

### 4. USB Charger - Multi-Port
**Driver ID**: `usb_charger_multi`  
**Name**: "USB Charger - Multi-Port"  
**Class**: `socket`

**Capabilities**:
- `onoff` - Master power control
- `measure_power` - Total power consumption
- Individual port control (if supported)

**Description**:
> "Multi-port USB charger with smart power management. Monitor total power consumption and control charging intelligently."

---

### 5. USB Wall Switch Combo
**Driver ID**: `usb_switch_combo`  
**Name**: "Wall Switch with USB"  
**Class**: `socket`

**Capabilities**:
- `onoff` - Switch control
- `onoff.gang2` (if 2-gang)
- USB ports (passive, no control)

**Description**:
> "Wall switch with integrated USB charging ports. Control lighting or appliances while charging your devices. Space-saving design."

---

## 🔧 TECHNICAL SPECIFICATIONS

### Manufacturer IDs to Migrate
**From `avatto_usb_outlet`**:
```javascript
"_TZ3000_zmlunnhy",  // NEW: User's 2-port USB controller
"_TZ3000_1obwwnmq",
"_TZ3000_2putqrmw",
"_TZ3000_3ooaz3ng",
"_TZ3000_7ysdnebc",
"_TZ3000_8lkizccl",
// ... + all existing USB manufacturer IDs
```

### Product IDs
```javascript
"TS0012",  // 2-gang USB
"TS0011",  // 1-gang USB
"TS0013",  // 3-gang USB
"TS011F",  // USB plug variants
```

---

## 🎨 ICONS & BRANDING

### Icon Design
**USB Symbol**: ⚡🔌 Combined AC + USB icon  
**Colors**: Blue/Gray for tech feel  
**Style**: Modern, minimal, professional

### Categories in Homey
**Primary Category**: `appliances`  
**Alternative**: Create new category `usb_power`  
**Tags**: USB, charger, outlet, power, charging

---

## 📊 FEATURES BY DRIVER

| Feature | 1-Port | 2-Port | 3-Port | Multi | Combo |
|---------|--------|--------|--------|-------|-------|
| AC Control | ✅ | ✅ | ✅ | ❌ | ✅ |
| USB Port 1 | ✅ | ✅ | ✅ | ✅ | Passive |
| USB Port 2 | ❌ | ✅ | ✅ | ✅ | Passive |
| USB Port 3 | ❌ | ❌ | ✅ | ✅ | Passive |
| Power Monitoring | Optional | Optional | Optional | ✅ | ❌ |
| Individual USB Control | ❌ | Maybe | Maybe | Maybe | ❌ |
| Hybrid Power Source | ✅ | ✅ | ✅ | ❌ | ✅ |

---

## 🔄 MIGRATION FROM EXISTING DRIVERS

### Step 1: Create New Drivers
```
drivers/usb_outlet_1port/
├── driver.compose.json
├── driver.js
├── device.js
├── assets/
│   ├── images/
│   │   ├── small.png (75x75)
│   │   ├── large.png (500x500)
│   │   └── xlarge.png (1000x1000)
│   └── learnmode.svg
└── README.md
```

### Step 2: Distribute Manufacturer IDs
- Analyze interview data for each ID
- Determine number of USB ports
- Assign to appropriate driver
- Keep comprehensive lists

### Step 3: Mark Old Driver Deprecated
- Add deprecation notice to `avatto_usb_outlet`
- Guide users to new drivers
- Keep for 6 months minimum

---

## ✅ IMPLEMENTATION CHECKLIST

### Driver Creation
- [ ] Create `usb_outlet_1port` driver
- [ ] Create `usb_outlet_2port` driver
- [ ] Create `usb_outlet_3port` driver
- [ ] Create `usb_charger_multi` driver (optional)
- [ ] Create `usb_switch_combo` driver (optional)

### Configuration
- [ ] Add all manufacturer IDs
- [ ] Configure capabilities correctly
- [ ] Set proper device class
- [ ] Add energy monitoring support
- [ ] Create proper images (75x75, 500x500, 1000x1000)

### Flow Cards
- [ ] Generic on/off triggers
- [ ] USB port-specific triggers (if supported)
- [ ] Power monitoring triggers
- [ ] Conditions for power state
- [ ] Actions for control

### Documentation
- [ ] User guide for USB devices
- [ ] Pairing instructions
- [ ] Troubleshooting guide
- [ ] Migration guide from old driver

---

## 🚀 PRIORITY IMPLEMENTATION

### Phase 1: Essential (NOW)
1. ✅ `usb_outlet_2port` - **User's device (_TZ3000_zmlunnhy)**
2. `usb_outlet_1port` - Common single-port devices
3. `usb_outlet_3port` - Triple-port variants

### Phase 2: Extended (LATER)
4. `usb_charger_multi` - Standalone USB chargers
5. `usb_switch_combo` - Wall switches with USB

---

## 📝 NAMING CONVENTIONS

### User-Facing Names (Unbranded)
✅ **Good**:
- "USB Outlet - 2 Ports"
- "Smart USB Charger"
- "Wall Switch with USB"

❌ **Bad**:
- "Avatto USB Outlet"
- "Tuya USB Controller"
- "Zemismart USB Socket"

### Technical IDs
**Format**: `usb_[type]_[variant]`

**Examples**:
- `usb_outlet_1port`
- `usb_outlet_2port`
- `usb_charger_multi`

---

## 🎯 USER BENEFITS

### Clear Device Discovery
Users searching for:
- "USB outlet" → Finds USB outlet category
- "USB charger" → Finds USB charger drivers
- "2 port USB" → Finds 2-port variant

### Professional Organization
- Grouped by function (USB power/charging)
- Not scattered across brand-specific drivers
- Easy to understand and navigate

### Future-Proof
- Easy to add new USB variants
- Consistent naming and structure
- Scalable category system

---

## 📚 REFERENCES

### Similar Products
- **TP-Link Kasa**: USB wall outlets
- **Belkin**: USB charging stations
- **Anker**: Multi-port USB chargers
- **Tuya Ecosystem**: Various USB-enabled devices

### Market Standards
- USB-A ports: Standard 5V charging
- USB-C ports: Fast charging, PD support
- Smart features: Scheduling, power monitoring
- Safety: Overcurrent protection, auto-shutoff

---

**Document Created**: October 23, 2025  
**Status**: Ready for Implementation  
**Priority**: HIGH - User Request  
**Next Action**: Create usb_outlet_2port driver for user's device
