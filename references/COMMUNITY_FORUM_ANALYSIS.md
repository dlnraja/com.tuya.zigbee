# HOMEY COMMUNITY FORUM ANALYSIS
**Date**: 2025-10-05  
**Sources**: 4 major Tuya-related forum threads analyzed

---

## 🎯 CRITICAL INSIGHTS

### 1. **Official Tuya App BROKEN (February 2025)**
**Thread**: [APP] Tuya - Connect any Tuya device with Homey (by Tuya Inc. / Athom)  
**Issue**: Tuya revoked API access in 2024, breaching partnership agreement  
**Impact**: Official cloud-based Tuya integration no longer works  
**Opportunity**: This creates massive demand for LOCAL Zigbee-based Tuya solutions

### 2. **Johan Bendz App - Device Database**
**Thread**: [APP][Pro] Tuya Zigbee App  
**Status**: Contains extensive manufacturer ID database  
**Key Finding**: Post #5337 reveals **capability mapping issue**

#### Issue Identified: Smart Socket Recognition Problem
- **Reporter**: Rudi_Hendrix
- **Problem**: 3 smart sockets recognized as "generic Zigbee device"
- **Symptom**: Only shows kWh capability, missing Watt (measure_power)
- **Root Cause**: Incorrect capability mapping for energy monitoring devices

### 3. **Tuya Cloud App Status**
**Thread**: [APP][Pro] Tuya Cloud - This app allows you to connect Homey to the Tuya cloud  
**Status**: "No longer actively maintained"  
**Request**: Post #2699 requests **ceiling fan support**

### 4. **Universal TUYA Zigbee Device App (dlnraja)**
**Thread**: [APP][Pro] Universal TUYA Zigbee Device App - lite version  
**Key Community Feedback**:

#### ✅ **Positive Feedback**
- Peter_van_Werkhoven: "I admire your patience and good work"
- Nicolas: "Thank you very much for taking over the app"
- Community appreciates SDK3 conversion effort

#### ⚠️ **Critical Feedback** (Peter_Kawa & OH2TH)
1. **App Naming**: "Community" in title violates guidelines
2. **Johan Bendz Attribution**: Must properly credit original author
3. **Over-Promising**: Description sounds "too good to be true"
4. **App Store Guidelines**: Must have unique app ID
5. **Realistic Expectations**: "I'd just extend things bit by bit"

---

## 📋 DEVICE COVERAGE FROM JOHAN BENDZ APP

### Temperature/Humidity Sensors (50+ manufacturer IDs)
- TS0201, TS0601, TY0201 product IDs
- _TZ3000_, _TZE200_, _TYZB01_ manufacturer prefixes
- Notable: _TZE200_bjawzodf, _TZE200_locansqn, _TZ3210_ncw88jfq

### PIR/Motion Sensors (40+ manufacturer IDs)
- RH3040, TS0202, TS0601 product IDs
- Notable: _TZ3000_mmtwjmaq, _TZ3000_kmh5qpmb, _TZE200_3towulqd

### Door/Window Sensors (60+ manufacturer IDs)
- RH3001, TS0203 product IDs
- Notable: _TZ3000_26fmupbb, _TZ3000_n2egfsli, _TZ3000_ebar6ljy

### Water Leak Sensors (20+ manufacturer IDs)
- TS0207, TS0601 product IDs
- Notable: _TZ3000_kyb656no, _TZE200_qq9mpfhw

### Smoke Detectors
- TS0205, TS0601 product IDs
- Notable: _TYZB01_dsjszp0x, _TZE200_ntcy3xu1, _TZ3210_up3pngle

---

## 🔧 ISSUES REQUIRING FIXES

### **Priority 1: Smart Socket Capability Mapping**
**Issue**: Energy monitoring sockets show only kWh, missing Watt  
**Fix Required**: 
- Add `measure_power` capability alongside `meter_power`
- Ensure proper cluster mapping for electrical measurement (cluster 2820)
- Test with manufacturer IDs mentioned in forum

**Affected Drivers**:
- smart_plug_energy
- smart_outlet_monitor  
- energy_plug_advanced

### **Priority 2: Ceiling Fan Support**
**Request Source**: Post #2699 in Tuya Cloud thread  
**Action**: Create dedicated ceiling fan driver with:
- Fan speed control (multiple levels)
- On/off capability
- Potentially light control (if combo unit)

### **Priority 3: Generic Zigbee Device Fallback**
**Issue**: Devices falling back to generic without proper capabilities  
**Fix Required**: Improve device identification and capability auto-detection

---

## 📝 APP STORE COMPLIANCE REQUIREMENTS

### **Based on Community Feedback**:

1. **App Name Format**
   - ❌ "Universal TUYA Zigbee Device App - community maintained"
   - ✅ "[APP][Pro] Universal Tuya Zigbee" (clean, professional)

2. **Description Guidelines**
   - Focus on "what it does" not "how it works"
   - Avoid over-promising (AI, automation layers, etc.)
   - Be humble and realistic
   - Clearly state SDK3 native support

3. **Attribution**
   - Must credit Johan Bendz prominently
   - Acknowledge MIT license usage
   - Explain relationship to original app (fork, continuation)

4. **App ID**
   - Must be unique (not conflict with existing apps)
   - Current: com.tuya.zigbee (might conflict)
   - Consider: com.dlnraja.tuya.zigbee or similar

5. **Feature Rollout**
   - "Extend things bit by bit" (Peter_Kawa advice)
   - Start with core drivers, add features gradually
   - Don't advertise AI/advanced features until proven

---

## 🎯 MARKET OPPORTUNITY

### **Perfect Timing**:
1. Official Tuya app BROKEN (API revoked)
2. Tuya Cloud app NO LONGER MAINTAINED
3. Johan Bendz app needs SDK3 update
4. Massive user base looking for LOCAL Zigbee solution

### **Differentiation**:
- Pure SDK3 implementation (future-proof)
- Local Zigbee (no cloud dependency)
- Active maintenance (vs abandoned alternatives)
- Community-driven development

---

## ✅ RECOMMENDED ACTIONS

### **Immediate (This Session)**:
1. ✅ Fix smart socket capability mapping (add measure_power)
2. ✅ Create ceiling fan driver
3. ✅ Update app.json with proper attribution
4. ✅ Revise description to be humble and realistic
5. ✅ Ensure app ID uniqueness

### **Short-term**:
1. Extract all manufacturer IDs from Johan Bendz thread
2. Test energy monitoring devices thoroughly
3. Implement fallback for "generic Zigbee device" issues
4. Add comprehensive device list to README

### **Long-term**:
1. Gradual feature additions (not all at once)
2. Community feedback integration
3. Regular updates based on user reports
4. Potential App Store submission (when ready)

---

## 📊 MANUFACTURER ID DATABASE

### **Extract from Forum** (Sample):
```
Temperature/Humidity:
- _TZE200_bjawzodf / TS0601
- _TZE200_locansqn / TS0601  
- _TZ3210_ncw88jfq / TY0201
- _TZE200_cirvgep4 / TS0601

Motion/PIR:
- _TZ3000_mmtwjmaq / TS0202
- _TZ3000_kmh5qpmb / TS0202
- _TZE200_3towulqd / TS0601

Contact Sensors:
- _TZ3000_26fmupbb / TS0203
- _TZ3000_n2egfsli / TS0203
- _TZ3000_ebar6ljy / TS0203

Water Leak:
- _TZ3000_kyb656no / TS0207
- _TZE200_qq9mpfhw / TS0601

Smoke Detector:
- _TZE200_ntcy3xu1 / TS0601
- _TZ3210_up3pngle / TS0205
```

---

## 🎓 LESSONS LEARNED

1. **Community expects humility**: Don't over-promise features
2. **Attribution matters**: Proper credit to original authors
3. **Guidelines compliance**: Follow Athom's app store rules strictly  
4. **Incremental approach**: Build trust through steady, reliable updates
5. **Local > Cloud**: Users want independence from cloud services

---

## 🔗 REFERENCES

- Johan Bendz App: https://community.homey.app/t/app-pro-tuya-zigbee-app/26439
- Official Tuya (BROKEN): https://community.homey.app/t/app-tuya-connect-any-tuya-device-with-homey-by-tuya-inc-athom/106779
- Tuya Cloud (Unmaintained): https://community.homey.app/t/app-pro-tuya-cloud-this-app-allows-you-to-connect-homey-to-the-tuya-cloud/21313
- Universal Tuya Zigbee: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352
- App Store Guidelines: https://apps.developer.homey.app/app-store/guidelines
