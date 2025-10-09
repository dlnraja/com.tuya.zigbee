# Update v2.1.34 - Major Fix & Features Release 🎉

## Fixed Issues ✅

**Temperature/Battery/Humidity showing N/A or wrong values:**
- Root cause: Missing `registerCapability()` code in 11 drivers
- Fixed parsers: temperature ÷100, battery ÷2, humidity ÷100, luminance logarithmic
- Affected devices: TS0201, TS0210, ZG-204ZV, ZG-204ZM, TS0203, _TZE284_vvmbj46n

**GitHub Issues resolved:**
- #26 Vibration Sensor TS0210 ✅
- #27 TS011F Outlet ✅
- #28 ZG-204ZV Multi-Sensor ✅
- #29 ZG-204ZM PIR Radar ✅
- #30 TS0041 Button ✅
- #31 TS0203 Door Sensor ✅
- #32 TS0201 Temp/Humidity ✅

## New Features 🚀

**1,767 Flow Cards added automatically:**
- 661 Triggers (motion detected, temperature changed, turned on/off, etc.)
- 698 Conditions (temperature > 25°C, motion active, is on/off, etc.)
- 408 Actions (turn on/off, set brightness, identify device, etc.)

**Advanced Settings:**
- Reporting interval (60-3600s)
- Temperature/Humidity calibration offsets
- Motion sensitivity & timeout

**Maintenance Actions:**
- Identify device (flash light 3×)
- Reset power meter

## Validation ✅

```
✓ App validated successfully against level `publish`
✓ 0 errors | 2 minor warnings (non-blocking)
✓ SDK3 compliant
```

## Installation

Update available via Homey App Store (version 2.1.34)

---

**Technical details:** [Link to GitHub](https://github.com/dlnraja/com.tuya.zigbee)

Let me know if you need help testing specific devices! 🙂
