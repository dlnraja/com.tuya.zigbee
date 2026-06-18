# SVG Icon Deployment Script
# Maps improved icons to appropriate driver directories

$iconsDir = "docs\icon-improvements\icons"
$driversDir = "drivers"

# Icon-to-driver mapping
$iconMappings = @{
    # Switch icons
    "switch_1gang.svg" = @(
        "switch_1gang", "switch_2gang", "switch_3gang", "switch_4gang",
        "switch_wall_1gang", "switch_wall_2gang", "switch_wall_3gang",
        "switch_wall_4gang", "switch_wall_5gang", "switch_wall_6gang",
        "switch_wall_7gang", "switch_wall_8gang",
        "wall_switch_1gang_1way", "wall_switch_2gang_1way",
        "hybrid_switch_1gang", "hybrid_switch_2gang",
        "hybrid_switch_3gang", "hybrid_switch_4gang",
        "din_rail_switch", "boiler_switch_energy"
    )

    # Dimmer icons
    "dimmer_1gang.svg" = @(
        "dimmer_wall_1gang", "dimmer_wall_2gang", "dimmer_3gang",
        "dimmer_dual_channel", "dimmer_ts110e", "dimmable_led_strip",
        "wall_dimmer_1gang_1way", "wall_dimmer_2gang_1way",
        "bulb_dimmable_dimmer", "hybrid_dimmer_1gang"
    )

    # Temperature/Humidity sensor icons
    "sensor_temp_humidity.svg" = @(
        "climate_sensor", "climate_sensor_device", "climate_sensor_energy",
        "climate_sensor_gas", "climate_sensor_plug", "climate_sensor_smart",
        "climate_sensor_switch", "climate_sensor_dimmer", "climate_sensor_presence",
        "climate_sensor_curtain",
        "lcdtemphumidsensor", "lcdtemphumidsensor_2", "lcdtemphumidsensor_3",
        "lcdtemphumidsensor_plug_energy", "lcdtemphumidluxsensor",
        "sensor_lcdtemphumidsensor_temphumidsensor",
        "sensor_climate_lcdtemphumidsensor",
        "temphumidsensor", "temphumidsensor2", "temphumidsensor3",
        "temphumidsensor4", "temphumidsensor5",
        "light_sensor_outdoor"
    )

    # Curtain/Cover icons
    "cover_curtain.svg" = @(
        "curtain_motor", "curtain_motor_shutter", "curtain_motor_tilt",
        "curtain_motor_wall", "curtain_module", "curtain_module_2_gang",
        "wall_curtain_switch", "hybrid_curtain_1gang"
    )

    # Light bulb icons
    "bulb_generic.svg" = @(
        "bulb_dimmable", "bulb_rgb", "bulb_rgbw", "bulb_rgb_rgbw",
        "bulb_rgb_led", "bulb_rgbw_universal", "bulb_tunable_white",
        "bulb_white", "christmas_lights"
    )

    # Plug/Socket icons
    "plug_socket.svg" = @(
        "plug", "plug_energy_monitor", "device_plug_energy",
        "device_plug_energy_monitor", "device_plug_smart",
        "device_plug_smart_water", "outdoor_plug", "outdoor_2_socket",
        "dimmer_wall_plug", "smart_plug", "smartPlug_DinRail",
        "wall_socket", "socket_power_strip_four",
        "hybrid_plug_1gang", "hybrid_plug_2gang"
    )

    # Thermostat icons
    "thermostat.svg" = @(
        "thermostat", "floor_heating_thermostat", "device_floor_heating_thermostat",
        "device_radiator_valve_thermostat", "device_radiator_valve_smart",
        "device_radiator_valve", "hybrid_heater_thermostat",
        "hybrid_sensor_thermostat", "device_floor_heating"
    )

    # Button/Remote icons
    "button_remote.svg" = @(
        "button_wireless", "button_wireless_1", "button_wireless_2",
        "button_wireless_3", "button_wireless_4", "button_wireless_6",
        "button_wireless_8", "button_wireless_scene", "button_wireless_smart",
        "button_wireless_wall", "button_wireless_switch",
        "button_wireless_plug", "button_wireless_usb",
        "button_wireless_fingerbot", "button_wireless_valve",
        "button_emergency_sos", "scene_switch_wall", "blaster_remote"
    )

    # Motion/Presence sensor icons
    "motion_sensor.svg" = @(
        "motion_sensor", "presence_sensor", "bed_sensor",
        "air_purifier_presence", "climate_sensor_presence",
        "device_air_purifier_presence"
    )

    # Smoke detector icons
    "smoke_detector.svg" = @(
        "smoke_sensor", "climate_sensor_gas",
        "device_air_purifier_smoke", "gas_sensor_switch"
    )

    # Water leak sensor icons
    "water_leak.svg" = @(
        "water_leak_sensor", "sensor_contact_water"
    )

    # Contact/Door sensor icons
    "contact_sensor.svg" = @(
        "contact_sensor", "contact_sensor_zigbee", "contact_sensor_switch",
        "contact_sensor_plug", "contact_sensor_dimmer", "contact_sensor_curtain",
        "doorwindowsensor", "doorwindowsensor_2", "doorwindowsensor_3",
        "doorwindowsensor_4", "sensor_climate_contact"
    )

    # Smart lock icons
    "lock_smart.svg" = @(
        "lock_smart", "fingerprint_lock"
    )

    # Garage door icons
    "garage_door.svg" = @(
        "garage_door", "garage_door_opener", "door_controller",
        "door_controller_garage", "hybrid_garage_door_sensor"
    )

    # Ceiling fan icons
    "fan_ceiling.svg" = @(
        "ceiling_fan", "fan_controller"
    )

    # Energy meter icons
    "energy_meter.svg" = @(
        "energy_meter_3phase", "energy_meter_din", "din_rail_meter",
        "device_din_rail", "device_din_rail_meter",
        "lcdtemphumidsensor_plug_energy"
    )

    # Air purifier icons
    "air_purifier.svg" = @(
        "air_purifier", "air_purifier_climate", "air_purifier_contact",
        "air_purifier_curtain", "air_purifier_dimmer", "air_purifier_din",
        "air_purifier_lcdtemphumidsensor", "air_purifier_motion",
        "air_purifier_quality", "air_purifier_sensor", "air_purifier_siren",
        "air_purifier_soil", "air_purifier_switch",
        "device_air_purifier", "device_air_purifier_climate",
        "device_air_purifier_din", "device_air_purifier_floor",
        "device_air_purifier_humidifier", "device_air_purifier_led",
        "device_air_purifier_motion", "device_air_purifier_plug",
        "device_air_purifier_radiator", "device_air_purifier_siren"
    )

    # Radiator valve icons
    "radiator_valve.svg" = @(
        "device_radiator_valve", "device_radiator_valve_smart",
        "device_radiator_valve_thermostat"
    )

    # Siren/Alarm icons
    "siren_alarm.svg" = @(
        "air_purifier_siren", "device_air_purifier_siren"
    )

    # Water valve icons
    "valve_water.svg" = @(
        "valve_dual_irrigation", "smart_garden_irrigation_control",
        "valvecontroller", "water_valve"
    )

    # Relay module icons
    "relay_module.svg" = @(
        "relay_board_1_channel", "relay_board_2_channel", "relay_board_4_channel"
    )

    # Soil sensor icons
    "soil_sensor.svg" = @(
        "soil_sensor", "soil_sensor_ec", "soilsensor", "soilsensor_2",
        "sensor_lcdtemphumidsensor_soil", "air_purifier_soil",
        "device_air_purifier_soil"
    )

    # CO2 sensor icons
    "co2_sensor.svg" = @(
        "air_quality_co2", "air_quality_comprehensive", "co_sensor"
    )

    # Fingerprint lock icons
    "fingerprint_lock.svg" = @(
        "fingerprint_lock"
    )

    # Doorbell icons (use button_remote)
    "button_remote.svg" = @(
        "doorbell"
    )

    # Fingerbot icons (use relay_module)
    "relay_module.svg" = @(
        "fingerbot"
    )

    # Generic Tuya universal (use switch)
    "switch_1gang.svg" = @(
        "device_generic_tuya_universal"
    )
}

Write-Host "=== SVG Icon Deployment Script ===" -ForegroundColor Cyan
Write-Host "Icons source: $iconsDir" -ForegroundColor Gray
Write-Host "Drivers target: $driversDir" -ForegroundColor Gray
Write-Host ""

$totalDeployed = 0
$totalSkipped = 0

foreach ($iconFile in $iconMappings.Keys) {
    $sourcePath = Join-Path $iconsDir $iconFile

    if (-not (Test-Path $sourcePath)) {
        Write-Host "WARNING: Source icon not found: $sourcePath" -ForegroundColor Yellow
        continue
    }

    foreach ($driverName in $iconMappings[$iconFile]) {
        $targetDir = Join-Path $driversDir $driverName "assets"
        $targetPath = Join-Path $targetDir "icon.svg"

        if (-not (Test-Path $targetDir)) {
            Write-Host "SKIP: $driverName - directory not found" -ForegroundColor DarkGray
            $totalSkipped++
            continue
        }

        # Copy icon
        Copy-Item -Path $sourcePath -Destination $targetPath -Force
        Write-Host "DEPLOYED: $iconFile -> $driverName" -ForegroundColor Green
        $totalDeployed++
    }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Total deployed: $totalDeployed" -ForegroundColor Green
Write-Host "Total skipped: $totalSkipped" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Verify icons display correctly in Homey" -ForegroundColor Gray
Write-Host "2. Run: npx homey app validate" -ForegroundColor Gray
Write-Host "3. Commit changes" -ForegroundColor Gray
