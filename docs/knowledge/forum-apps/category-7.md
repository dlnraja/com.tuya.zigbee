# Homey forum — Apps category 7 digests (auto, technical only)

### [APP][Pro] Adax with Power Estimation

- **Source:** homey-forum-apps — https://community.homey.app/t/160949
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Adax with Power Estimation
- **Root cause:** I made Adax with Power Estimation because I wanted estimated watts and more useful energy information from my Adax heaters in Homey.
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** —
- **Avoid:** They do not replace the temperature used by the heater’s own thermostat.
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro] Sensible – Room-sensor control for the heat pumps and heaters you already have

- **Source:** homey-forum-apps — https://community.homey.app/t/160962
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Sensible – Room-sensor control for the heat pumps and heaters you already have
- **Root cause:** Fixed: the heat pump could keep working its way up after the room had reached the target, because its own warm air raised the measured difference to the room.
- **Resolution:** Cooling now works like the auto mode of a heat pump: when cooling is done, the heat pump stays in cool mode and rests instead of switching to heat (and possibly off).
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** The overview on the configuration page now shows each thermostat’s status in a readable way: tap a room to see what affects it right now (night, vacation, fireplace mode, sensors) and, for each heater, what it measures, what Sensible set it to and whether it can cool or reports h
- **Avoid:** Panel heaters on a smart plug  marked  Heater  – switched like a classic thermostat, at least 5 minutes between switches, and never left on without a working room sensor.
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro] BLUETTI – Power stations via BLUETTI cloud

- **Source:** homey-forum-apps — https://community.homey.app/t/160644
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] BLUETTI – Power stations via BLUETTI cloud
- **Root cause:** —
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** If you’d like me to check whether the Elite 200 V2 exposes anything extra, turn on  verbose logging  in the device settings, wait a few minutes, and send a diagnostics report from the app page.
- **Avoid:** When a power station loses its internet connection, the BLUETTI cloud keeps reporting it as online for about 4 minutes, and it accepts commands during that time and afterwards, but they never reach the unit.
- **Regressions to watch:** Credits: based on the official BLUETTI Home Assistant integration and the ioBroker.bluetti adapter (both MIT).
- **Linked:** —
- **Credit:** —

### [APP][Pro] Sigenergy - Home energy powered by AI

- **Source:** homey-forum-apps — https://community.homey.app/t/143965
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Sigenergy - Home energy powered by AI
- **Root cause:** —
- **Resolution:** I am eagerly waiting to get my Sigenstor solution to be installed so not there yet.
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** Turn on  Detailed logging  in the device settings, let it run while the problem happens, then send a diagnostic report from the app and post the code here (or in a  GitHub issue ).
- **Avoid:** —
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro] Ultimate EMS - Intelligent energy management for solar, battery, EV and heat pump

- **Source:** homey-forum-apps — https://community.homey.app/t/155475
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Ultimate EMS - Intelligent energy management for solar, battery, EV and heat pump
- **Root cause:** I’ll have to use evcc, for example, because Homey doesn’t have broad support of anything HEM-related.
- **Resolution:** Homey Pro was designed for consumer grade smart home and this shows now that I’m looking for a HEM solution.
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** —
- **Avoid:** —
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [App][pro] Tuya Zigbee [pièce A] Door opener

- **Source:** homey-forum-apps — https://community.homey.app/t/149230
- **Status:** open
- **Labels:** apps-category
- **Problem:** [App][pro] Tuya Zigbee [pièce A] Door opener
- **Root cause:** —
- **Resolution:** —
- **Couples:** _tze20c_3oycaicw|TS0601, _tze20c_3oycaicw|TS603
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** —
- **Avoid:** —
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro] Remeha Modbus - Monitor and control your Remeha heat pump via Modbus TCP

- **Source:** homey-forum-apps — https://community.homey.app/t/153938
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Remeha Modbus - Monitor and control your Remeha heat pump via Modbus TCP
- **Root cause:** Existing flows keep working because the
- **Resolution:** Small things I want to fix in v1.1.1, not blocking the test:
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** 13.0.0
- **Adopt:** Using Flows you can send commands to the heat pump to change thermostat mode, DHW comfort setpoint, silent mode, hybrid mode and tariffs.
- **Avoid:** —
- **Regressions to watch:** Please check your device after the update and post here if
- **Linked:** —
- **Credit:** —

### [APP][Pro] Flow Checker

- **Source:** homey-forum-apps — https://community.homey.app/t/50986
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Flow Checker
- **Root cause:** Aren’t your issues simply caused by Homey’s “flow-is-run-too-often” handling that’s been broken ever since Athom introduced it?
- **Resolution:** This is fixed in the new testversion.
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** It should only report the flow I disabled and enabled again, I suppose)
- **Avoid:** Never the less, having a app to do the dirty work for me is much cleaner.
- **Regressions to watch:** Detect broken Flows and Logic Variables
- **Linked:** —
- **Credit:** —

### [APP TEST] Energy Flow – A visual energy dashboard for Homey Pro ⚡

- **Source:** homey-forum-apps — https://community.homey.app/t/161321
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP TEST] Energy Flow – A visual energy dashboard for Homey Pro ⚡
- **Root cause:** —
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** I suspect this should actually indicate that no meter reading is available, as my APsystems inverter stops reporting a value after sunset and displays a dash (-) instead, which presumably cannot be read correctly.
- **Avoid:** Could you make it an option to remove the “Energy flow” in the top left corner to avoid having the same words stacked on top of each other?
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro] HomeKit Controller - for a better Homey

- **Source:** homey-forum-apps — https://community.homey.app/t/94520
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] HomeKit Controller - for a better Homey
- **Root cause:** —
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** —
- **Avoid:** DO NOT click OK twice impatiently
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP] Aqara & Xiaomi Smart Home - Simplify your life with a smarter home

- **Source:** homey-forum-apps — https://community.homey.app/t/156
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP] Aqara & Xiaomi Smart Home - Simplify your life with a smarter home
- **Root cause:** —
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** —
- **Avoid:** —
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### Thermia Heatpump MODBUS on Genesis Platform

- **Source:** homey-forum-apps — https://community.homey.app/t/161324
- **Status:** open
- **Labels:** apps-category
- **Problem:** Thermia Heatpump MODBUS on Genesis Platform
- **Root cause:** First a clarification, because the name of the Flow card is a bit misleading:  my app does not write the indoor temperature to the heat pump.
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** —
- **Avoid:** If you like the app, a donation is appreciated but never required (see the Donate button on the App Store page).
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro] Komfovent C6M – local Modbus control, Energy & Dashboard

- **Source:** homey-forum-apps — https://community.homey.app/t/158240
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Komfovent C6M – local Modbus control, Energy & Dashboard
- **Root cause:** Regarding your CAV report: an already-paired controller that answers should now stay available for monitoring rather than being marked disconnected just because percentage control is unsupported.
- **Resolution:** The original R450 disconnection report remains unresolved.
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** 1.4.47.74, 1.5.44.70, 1.1.5.46, 1.5.x
- **Adopt:** —
- **Avoid:** Unequal targets do not establish actual pressure or provide fireplace safety.
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro] EcoFlow STREAM Series - solar, battery, smart meter and Homey Energy automation

- **Source:** homey-forum-apps — https://community.homey.app/t/157399
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] EcoFlow STREAM Series - solar, battery, smart meter and Homey Energy automation
- **Root cause:** The server is on Europe because it says:  https://developer-eu.ecoflow.com  but global gives the same issue.
- **Resolution:** Do you have a solution for this?
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** If pairing fails or any readings are missing or incorrect, please send me a Homey diagnostics report ID and a brief description of what happened.
- **Avoid:** I want the Homey experience to remain reasonably consistent with EcoFlow’s own model while ensuring that power and energy are never counted twice.
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP] Enphase - Harness the sun to make, use, save, and sell your own power

- **Source:** homey-forum-apps — https://community.homey.app/t/134602
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP] Enphase - Harness the sun to make, use, save, and sell your own power
- **Root cause:** Because it’s a official app i’v asked the developer for advice but no response jet.
- **Resolution:** or a workaround?
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** —
- **Avoid:** —
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro] Tuya Local

- **Source:** homey-forum-apps — https://community.homey.app/t/154077
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Tuya Local
- **Root cause:** —
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** 103
- **Clusters:** —
- **Firmware:** 12.13.0
- **Adopt:** Optional tiles  — set any DP to  0  and the tile disappears; set a number and it appears
- **Avoid:** Push-only devices  that never answer GET requests (some curtain motors) stay connected and accept commands instead of looping — set Polling Interval to 0
- **Regressions to watch:** Since 3.3 was non-functional, I tried again with 3.4 today after powering on the airco.
- **Linked:** —
- **Credit:** —

### [APP][Pro] Nous - Save energy, increase security and comfort of your home and create amazing ambiances

- **Source:** homey-forum-apps — https://community.homey.app/t/99614
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Nous - Save energy, increase security and comfort of your home and create amazing ambiances
- **Root cause:** —
- **Resolution:** —
- **Couples:** _tz3000_v7chgqso|TS0203
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** —
- **Avoid:** They work fine after integration but do not work after some time (red !).
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro] Tuya Zigbee App

- **Source:** homey-forum-apps — https://community.homey.app/t/26439
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Tuya Zigbee App
- **Root cause:** No, the app for firmware 4.2 will NOT be updated with all the nice devices I am now updating the firmware 5 version with, mainly because the Zigbee updated stack in Firmware 5 is needed to support a majority of the devices.
- **Resolution:** If your issue concerns something that was recently fixed in Test, please mention which version you tested.
- **Couples:** _tze200_jthf7vb6|TS0601
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** 4.2, 5, 7.1
- **Adopt:** test XYZ and send a crash report, then remove the device again.
- **Avoid:** Avoid duplicate requests and lost information.
- **Regressions to watch:** You should be able to add a device as generic even if the app is broken or missing.
- **Linked:** —
- **Credit:** —

### [APP][Pro] HomeKit Device Bridge

- **Source:** homey-forum-apps — https://community.homey.app/t/150931
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] HomeKit Device Bridge
- **Root cause:** Homey Cloud and Homey Bridge are not supported because HomeKit bridging requires local network access.
- **Resolution:** Bugs Smashed:  Resolved various sensor reporting errors (Leak, Smoke, Contact, etc.) and fixed several icon synchronization and category misclassification issues.
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** Hello, if you send me the problem report, I can look into what the issue is.
- **Avoid:** hi , after a short time the bridged devices do not sync with homekit on Homey 2018 .
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro] Heatit Controls app [v4.5.5]

- **Source:** homey-forum-apps — https://community.homey.app/t/49914
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Heatit Controls app [v4.5.5]
- **Root cause:** Note  : due to an S2 issue within the Homey Z-wave core, the measured temperatures are not reported for the Z-wave thermostat (FW 1.92) and Z-TRM2(fx) thermostats as well as the Z-Water regulator.
- **Resolution:** When this will be resolved, it is likely that the thermostat will need to be re-included
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** 1.92
- **Adopt:** Is there a way to include the Heatit z-push button 4 unsecure, and/or have them send association commands unsecure?
- **Avoid:** Right now I can no longer use associations because fibaro dimmers do not support S2 security and the buttons do, so they do not respond to the associations.
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro] Octopus Energy — Dynamic tariffs, usage, export and smart energy automation for UK users

- **Source:** homey-forum-apps — https://community.homey.app/t/156860
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Octopus Energy — Dynamic tariffs, usage, export and smart energy automation for UK users
- **Root cause:** I’ve reviewed the changes in 1.0.10 and found a  possible  cause: the app can currently mark the whole electricity meter unavailable when Octopus does not return a current tariff price, even if the smart-meter usage connection itself is still working.
- **Resolution:** The new diagnostic confirms that 1.0.13 fixed the original startup/offline behaviour, but it has not resolved the missing import price for your tariff.
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** If it remains offline, could you send an app diagnostic report and share the report ID?
- **Avoid:** Those are the correct Saving Session triggers, and being on Tracker should not prevent them from working.
- **Regressions to watch:** If you test it, I’d love to know what works, what breaks, and what Flow cards or capabilities would be useful next.
- **Linked:** —
- **Credit:** —

### [APP][Pro] Power by the Hour: Insights per hour, day, month and year

- **Source:** homey-forum-apps — https://community.homey.app/t/20535
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Power by the Hour: Insights per hour, day, month and year
- **Root cause:** By popular demand, and because of my frustration that Athom is not providing better energy insights, I created this app.
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** —
- **Avoid:** If you do not want V9 to be installed on your Homey while it is still in test phase, you need to  go to the stable version update stream now.
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro] Heatpump Smart Control

- **Source:** homey-forum-apps — https://community.homey.app/t/160675
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Heatpump Smart Control
- **Root cause:** Energy Metering:  Fixed potential kWh overcounting caused by delayed external meter updates and improved energy allocation across all five operating modes.
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** —
- **Avoid:** What I noticed is that I was never asked to enter a 2FA code when logging in through the app.
- **Regressions to watch:** Changelog – v1.6.3 (since v1.6.0)
- **Linked:** —
- **Credit:** —

### [APP][Pro] HomeFlux EMS – Your energy, managed differently

- **Source:** homey-forum-apps — https://community.homey.app/t/158982
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] HomeFlux EMS – Your energy, managed differently
- **Root cause:** Because HomeFlux uses Homey Flow cards for its integrations, it is not tied to one specific battery, inverter, EV charger or HVAC brand.
- **Resolution:** The request-based input cards are a nice hardware-independent solution.
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** Your general view matches the architecture I’m aiming for: HomeFlux should decide  what should happen and why , while the actual Homey device integrations remain responsible for vendor-specific commands, safety behaviour and fallbacks.
- **Avoid:** Peak Guard  always keeps priority to help avoid unwanted consumption peaks.
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro & Server] Drivie - Homey on CarPlay and Android Auto, plus ride and location triggers and advanced presence detection

- **Source:** homey-forum-apps — https://community.homey.app/t/161211
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro & Server] Drivie - Homey on CarPlay and Android Auto, plus ride and location triggers and advanced presence detection
- **Root cause:** —
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** —
- **Avoid:** —
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —
### [APP][Pro] Remeha Modbus - Monitor and control your Remeha heat pump via Modbus TCP

- **Source:** homey-forum-apps — https://community.homey.app/t/153938
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Remeha Modbus - Monitor and control your Remeha heat pump via Modbus TCP
- **Root cause:** —
- **Resolution:** Thanks for sharing the diagnostic report, I’ve found a small bug which is already solved in version 2.2.2.
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** 13.0.0
- **Adopt:** Using Flows you can send commands to the heat pump to change thermostat mode, DHW comfort setpoint, silent mode, hybrid mode and tariffs.
- **Avoid:** —
- **Regressions to watch:** After the update to this new version,  values are refreshed only once after a restart.
- **Linked:** —
- **Credit:** —

### [APP TEST] Energy Flow – A visual energy dashboard for Homey Pro ⚡

- **Source:** homey-forum-apps — https://community.homey.app/t/161321
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP TEST] Energy Flow – A visual energy dashboard for Homey Pro ⚡
- **Root cause:** —
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** —
- **Avoid:** —
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro] Viessmann - Make your heating smart

- **Source:** homey-forum-apps — https://community.homey.app/t/116744
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Viessmann - Make your heating smart
- **Root cause:** Unfortunately the installation failed due to warnings and errors:
- **Resolution:** Getting Started · Wiki · Functor Solutions / Homey / Viessmann · GitLab
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** —
- **Avoid:** —
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro] Ultimate EMS - Intelligent energy management for solar, battery, EV and heat pump

- **Source:** homey-forum-apps — https://community.homey.app/t/155475
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Ultimate EMS - Intelligent energy management for solar, battery, EV and heat pump
- **Root cause:** —
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** —
- **Avoid:** —
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro] Energy Dashboard – a live energy display for any screen in your home

- **Source:** homey-forum-apps — https://community.homey.app/t/160116
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Energy Dashboard – a live energy display for any screen in your home
- **Root cause:** A question for everyone with a hybrid inverter with a battery  (Huawei Luna2000, Growatt, Sungrow, SolaX, Sigenergy, Kostal or Wattsonic, through biemond’s app): the dashboard doesn’t see the battery in it yet, because it sits in the same device as the inverter.
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** Use per hour: a heat map of your use, solar or the grid per hour over the last 4 weeks, from Homey Energy’s day reports.
- **Avoid:** —
- **Regressions to watch:** Version 0.2.6 is now in test, with everything that changed since 0.2.2:
- **Linked:** —
- **Credit:** —

### [APP][Pro] HomeFlux EMS – Your energy, managed differently

- **Source:** homey-forum-apps — https://community.homey.app/t/158982
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] HomeFlux EMS – Your energy, managed differently
- **Root cause:** Because HomeFlux uses Homey Flow cards for its integrations, it is not tied to one specific battery, inverter, EV charger or HVAC brand.
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** —
- **Avoid:** Peak Guard  always keeps priority to help avoid unwanted consumption peaks.
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro] BLUETTI – Power stations via BLUETTI cloud

- **Source:** homey-forum-apps — https://community.homey.app/t/160644
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] BLUETTI – Power stations via BLUETTI cloud
- **Root cause:** —
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** —
- **Avoid:** —
- **Regressions to watch:** Credits: based on the official BLUETTI Home Assistant integration and the ioBroker.bluetti adapter (both MIT).
- **Linked:** —
- **Credit:** —

### [APP][Pro] EcoFlow STREAM Series - solar, battery, smart meter and Homey Energy automation

- **Source:** homey-forum-apps — https://community.homey.app/t/157399
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] EcoFlow STREAM Series - solar, battery, smart meter and Homey Energy automation
- **Root cause:** —
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** —
- **Avoid:** —
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro&Cloud][OFFICIAL] SolarEdge - Powering People’s Lives Around the World

- **Source:** homey-forum-apps — https://community.homey.app/t/134605
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro&Cloud][OFFICIAL] SolarEdge - Powering People’s Lives Around the World
- **Root cause:** Because Homey only lets me change device settings while the app is running, every attempt to enter a new password races against the app locking the account again.
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** Please send an app diagnostics report.
- **Avoid:** —
- **Regressions to watch:** Since 25 Sept my two SolarEdge devices (Battery + Inverter, app v1.8.1 on Homey Pro 2023) showed “Invalid e-mail and/or password.” permanently, and re-pairing now ends in “Unauthorized”.
- **Linked:** —
- **Credit:** —

### [APP][Pro][Test] Energy Price Forecast – electricity prices, grid CO₂ and smart planning

- **Source:** homey-forum-apps — https://community.homey.app/t/158968
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro][Test] Energy Price Forecast – electricity prices, grid CO₂ and smart planning
- **Root cause:** Homey Cloud is not supported in this first release because publishing a cloud-compatible app requires an additional verified-developer step.
- **Resolution:** I’m working on a solution that combines actual prices (retrieved by users themselves) with the forecasts.
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** 13.5.3
- **Adopt:** —
- **Avoid:** —
- **Regressions to watch:** That second one matters: since 1.0.3 the page requests no scripts of its
- **Linked:** —
- **Credit:** —

### [APP] Aqara & Xiaomi Smart Home - Simplify your life with a smarter home

- **Source:** homey-forum-apps — https://community.homey.app/t/156
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP] Aqara & Xiaomi Smart Home - Simplify your life with a smarter home
- **Root cause:** —
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** —
- **Avoid:** —
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro] Weekdot - Flows for your events and your daily agenda

- **Source:** homey-forum-apps — https://community.homey.app/t/161566
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Weekdot - Flows for your events and your daily agenda
- **Root cause:** —
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** More - apps -  Weekdot  - settings wheel top right - send diagnostic report (include your email and issues in the input field for better assistance)
- **Avoid:** —
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [APP][Pro] Tuya Zigbee App

- **Source:** homey-forum-apps — https://community.homey.app/t/26439
- **Status:** open
- **Labels:** apps-category
- **Problem:** [APP][Pro] Tuya Zigbee App
- **Root cause:** —
- **Resolution:** If your issue concerns something that was recently fixed in Test, please mention which version you tested.
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** —
- **Adopt:** —
- **Avoid:** Avoid duplicate requests and lost information.
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —

### [App][Pro] FlowBits — Small bits of logic, big difference in your Flows

- **Source:** homey-forum-apps — https://community.homey.app/t/145855
- **Status:** open
- **Labels:** apps-category
- **Problem:** [App][Pro] FlowBits — Small bits of logic, big difference in your Flows
- **Root cause:** I’m sure many useful apps are more or less forgotten because users never figured out how to use them.
- **Resolution:** —
- **Couples:** —
- **Drivers:** —
- **DPs:** —
- **Clusters:** —
- **Firmware:** 12.9.0
- **Adopt:** —
- **Avoid:** I’m sure many useful apps are more or less forgotten because users never figured out how to use them.
- **Regressions to watch:** —
- **Linked:** —
- **Credit:** —
