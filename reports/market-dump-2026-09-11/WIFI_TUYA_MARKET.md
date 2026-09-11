# Tuya WiFi market dump — 2026-09-11

Sources: tuya-local (HA) + tinytuya Contrib

## Summary

- tuya-local device YAML: **500**
- new manufacturer labels not in local FP DB: **200**
- tinytuya DP mappings harvested: **125**

## Categories (tuya-local)

| Category | Count |
|----------|-------|
| config | 296 |
| diagnostic | 168 |
| unknown | 36 |

## Sample newest / interesting models

| Model | File | Category |
|-------|------|----------|
| ZN-2C09 | 9in1_airquality_monitor.yaml | diagnostic |
| CT20W | CT20W_pir_motion_detector.yaml | config |
| ? | DH-CSK03W_dehumidifier.yaml | config |
| ZC34T-03-3A | ZC34T-03-3A_swing_arm_opener.yaml |  |
| A03 | a03_siren.yaml |  |
| QL500 | abalon_bcm700d_curtain.yaml | config |
| X8 | abir_x8_vacuum.yaml | config |
| X9 | abir_x9_vacuum.yaml | diagnostic |
| Wallbox 11kw | absina_evcharger.yaml | config |
| GO-B6 Pro 32A | adpow_gob6pro_evcharger.yaml | diagnostic |
| ? | advancedfires_1500_fireplace.yaml | config |
| Sync | advwin_6l_petfeeder.yaml | diagnostic |
| 13L Smart Humidifier | advwin_humidifier.yaml | diagnostic |
| EK1S | aeno_ek1s_kettle.yaml | diagnostic |
| KASMTSSKTLA | aeno_ek7s_kettle.yaml | diagnostic |
| KS1S | aeno_ks1s_kitchenscale.yaml | diagnostic |
| 82inch ceiling fan with light | aeratron_ae3plus_fan.yaml | config |
| DH12W HEPA WiFi | aerium_dh12w_dehumidifier.yaml | diagnostic |
| 4L automatic feeder | af3w_petfeeder.yaml | diagnostic |
| F098 | afyeev_16a_evcharger.yaml | config |
| 32A 7kW EV charger | afyeev_32a7kw_evcharger.yaml | config |
| ? | afyeev_evcharger.yaml | diagnostic |
| Electrickit Advanced | aga_electrickitadvanced_oven.yaml | diagnostic |
| ? | agl_ultracontato.yaml | diagnostic |
| ? | agl_ultramagic_lock.yaml | config |
| PLD 190 | ailrinni_fingerprint_lock.yaml | diagnostic |
| EV Charger 11kW | aimiler_11kW_evcharger.yaml | diagnostic |
| EV Charger 40A | aimiler_40a_evcharger.yaml | config |
| S1WFAA | airam_s1wfaa_siren.yaml |  |
| Zigbee smart air box | airquality5in1.yaml |  |
| Air Housekeeper 6-in-1 | airquality6in1.yaml |  |
| P20 | airrobo_p20_vacuum.yaml | config |
| Reversible 2500W (409730) | airton_aircon.yaml | diagnostic |
| AV-HTPF35 / AV-HTPF60 / AV-HTPF90 | airwoods_av_htpf_fresh_air_heat_pump.yaml | diagnostic |
| AV-EW8/DF | airwoods_avew8df_hrv.yaml | diagnostic |
| H8Pro | airx_h8_humidifier.yaml | config |
| ? | aixishs_big_siren.yaml | config |
| 1080p Smart Doorbell camera | ajxml_1080p_videodoorbell.yaml | config |
| ? | akai_dryer.yaml | diagnostic |
| WDH-214US | aktobis_wdh214us_dehumidifier.yaml | diagnostic |

## New manufacturer brands (first 80)

- Quoya
- Abir
- Absina
- ADPOW
- Cat Elite
- Advwin
- Aeno
- Kogan
- XCWIIE
- Aerium
- Balimo
- Daolar
- Afyeev
- AGA
- AGL
- Ailrinni
- Aimiler
- Airam
- Airrobo
- Airton
- Airwoods
- airx
- AJXML
- Akai
- Aktobis
- Orbegozo
- AlecoAir
- Alen
- Alpine Saunas
- Amantii
- Hoenofly
- Amenzo
- amiciSmart
- AMOS
- AmperePoint
- Anderic
- Devola
- Anko
- Anwo
- Aqua Plus
- Aquark
- Aquastrong
- Hydrotherm
- Aquaviva
- Arçelik
- Nous
- Arida
- Arknoah
- Arlec
- Asahom
- Asakuki
- ASC
- AtmosC
- Atomi
- Atorch
- ATorch
- SciMagic
- Auchsiag
- Aulifants
- Ausclimate
- Avatto / Thaleos
- Kaideng Energy
- Avidsen
- Axen
- Aygrochy
- Aziot
- Ballu
- Baxi
- Bcetasy
- 5tech
- Beca
- Beca / MJZM
- Be Cool
- Belair
- Belko
- Monzana
- Beok
- Rti-Tek
- Beokeo
- Bestherm

## TinyTuya Contrib device classes

- CoverDevice.py
- AtorchTemperatureControllerDevice.py
- BlanketDevice.py
- ClimateDevice.py
- ColorfulX7Device.py
- FloorFanDevice.py
- SocketDevice.py
- SoriaInverterDevice.py
- ThermostatDevice.py
- TowelRailHeaterDevice.py
- WiFiDualMeterDevice.py