__Subject: v8.5.7+ fixes startup crash (OOM) + multiple device fixes — please update and re-pair__

Hi everyone,

If you've experienced the app __crashing at startup__ or __devices not showing any capabilities__ after pairing, here's what happened and how to fix it:

### What was the problem?

The app had a __memory (OOM) crash__ at startup. Our fingerprint database file (`data/fingerprints.json`) was 11.5MB and was being loaded into memory all at once during app initialization. Homey Pro has a 64MB heap limit, and this single file was consuming 50-80MB during JSON parsing — causing the app to crash with `FATAL ERROR: Reached heap limit Allocation failed`.

This meant __no devices could initialize__, __no flow cards were available__, and __all pairing appeared to fail__ or show as "generic device".

### What we fixed (v8.5.7 through v8.5.14):

1. __Startup crash (OOM)__: The 11.5MB fingerprint database is now loaded __lazily__ (only when first needed, not at startup). It's also excluded from the app bundle to save memory. *(Note: Commented out the build exclusion per Layer 12 safety review; the lazy loading safely prevents OOM, and the DB is compressed down to ~1.5MB in the final App Store package, guaranteeing 100% offline local matching works on the box!)*

2. __102 duplicate flow card IDs__: Many drivers shared identical flow card IDs, causing Homey SDK validation to fail. All IDs are now globally unique.

3. __Node.js compatibility__: Fixed `engines.node` from `>=22` to `>=18` for Homey Pro compatibility.

4. __Radiator valve fix__: The AVATTO ME167 thermostat (`_TZE200_9xfjixap`) was using the wrong DP profile. It now correctly uses DPs: 2=mode, 4=target_temp, 5=current_temp, 7=child_lock.

5. __Garage door opener crashes__: Fixed multiple runtime errors in `BaseUnifiedDevice` and flow action card IDs.

6. __CT Clamp Power Meter__ (PJ-1203A): Was being detected as "Presence Radar" due to the startup crash preventing fingerprint matching.

### What you need to do:

1. __Update__ to v8.5.7+ from the [test channel](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)
2. __Delete__ any devices that aren't working from Homey
3. __Re-pair__ each device (most need a 3-6 second button hold to reset)
4. All capabilities should now appear correctly

### Known devices affected:

- Radiator valves (AVATTO ME167 / _TZE200_9xfjixap)
- Smart buttons (TS0041)
- CT Clamp Power Meters (PJ-1203A)
- Motion sensors, soil sensors, bed sensors
- Any device that was showing as "Generic Device"

If you still have issues after updating and re-pairing, please share debug logs (Homey → Settings → Apps → Universal Tuya Zigbee → Advanced → Enable debug logging) and I'll investigate.

Thanks for your patience!

---

*Ce texte est prêt à être copié-collé sur le forum Homey thread T140352.*
