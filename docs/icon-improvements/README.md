# SVG Icon Improvements for Tuya Unified Zigbee

## Analysis Summary

### Repositories Analyzed
1. **Joolee/Homey-SVG-Icons** - Community SVG approximations of default Homey icons
2. **athombv/homey-vectors-public** - Official Athom icon repository (GPL-3.0)
3. **Homey Community Forums** - Icon extraction methods and guidelines
4. **Homey Developer Docs** - Official icon specifications

### Current State (430 driver icons)
- **125 drivers** use identical default icon (square with circle + cross)
- **105 unique icon variants** across 430 drivers
- **130 icons** use wrong viewBox (667x666 from Inkscape exports)
- **15 icons** use 50x50 viewBox
- **4 icons** contain embedded base64 rasters
- **5 icons** contain gradients
- **Many icons** are bloated with Inkscape metadata (clipPaths, markers, namedview)

### Homey Official Requirements
- **Canvas**: 960x960px
- **Background**: Transparent
- **Colors**: Black strokes/fills only (Homey converts non-transparent to black)
- **Style**: Clean line art, no filled illustrations
- **Angle**: Right-side preferred for dimension
- **Stroke**: Consistent width (40px recommended for 960x960 canvas)
- **No**: gradients, rasters, background colors, embedded images

## Icons Generated

### 1. switch_1gang.svg - Single Gang Wall Switch
Clean toggle switch with wall plate outline.

### 2. dimmer_1gang.svg - Single Gang Dimmer
Rotary dimmer knob with wall plate.

### 3. sensor_temp_humidity.svg - Temperature & Humidity Sensor
Thermometer + droplet combined icon.

### 4. cover_curtain.svg - Curtain Motor
Curtain drapes with track rail.

### 5. bulb_generic.svg - Light Bulb
Classic bulb shape with filament.

### 6. plug_socket.svg - Smart Plug/Socket
Plug prongs with power body.

### 7. thermostat.svg - Thermostat
Circular thermostat with temperature display.

### 8. button_remote.svg - Wireless Button/Remote
Compact remote with action button.

### 9. motion_sensor.svg - Motion/Presence Sensor
PIR sensor lens pattern.

### 10. smoke_detector.svg - Smoke Detector
Disc shape with detection indicator.

### 11. water_leak.svg - Water Leak Sensor
Water droplet with alert.

### 12. contact_sensor.svg - Door/Window Contact
Magnetic contact sensor.

### 13. lock_smart.svg - Smart Lock
Deadbolt lock mechanism.

### 14. garage_door.svg - Garage Door
Sectional garage door.

### 15. fan_ceiling.svg - Ceiling Fan
Fan blades rotation.

### 16. energy_meter.svg - Energy Meter
Power meter with lightning bolt.

### 17. air_purifier.svg - Air Purifier
Tower fan with air flow.

### 18. radiator_valve.svg - Radiator Valve
Radiator with valve wheel.

### 19. siren_alarm.svg - Siren/Alarm
Bell with alert waves.

### 20. valve_water.svg - Water Valve
Pipe with valve handle.

### 21. relay_module.svg - Relay Module
PCB board with relay.

### 22. power_strip.svg - Power Strip
Multi-outlet strip.

### 23. soil_sensor.svg - Soil Moisture Sensor
Probe with moisture drop.

### 24. co2_sensor.svg - CO2 Sensor
Gas cloud with CO2 text.

### 25. fingerprint_lock.svg - Fingerprint Lock
Fingerprint on lock body.
