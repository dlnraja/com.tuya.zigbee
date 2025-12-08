# Download images from Johan Bendz repo for all drivers
# Maps Dylan's drivers to Johan's equivalent drivers

$mapping = @{
    # Climate/Temp sensors
    "climate_sensor" = "temphumidsensor"
    "lcdtemphumidsensor" = "lcdtemphumidsensor"
    "temphumidsensor" = "temphumidsensor"

    # Soil sensor
    "soil_sensor" = "soilsensor"

    # Motion sensors
    "motion_sensor" = "motion_sensor"
    "motion_sensor_radar_mmwave" = "radar_sensor"
    "presence_sensor_radar" = "radar_sensor"

    # Contact sensors
    "contact_sensor" = "doorwindowsensor"
    "vibration_sensor" = "doorwindowsensor"

    # Buttons/Remotes
    "button_emergency_sos" = "smart_remote_4_buttons"
    "button_wireless" = "smart_knob_switch"
    "button_wireless_1" = "smart_remote_1_button"
    "button_wireless_2" = "wall_remote_2_gang"
    "button_wireless_3" = "wall_remote_3_gang"
    "button_wireless_4" = "wall_remote_4_gang"
    "button_wireless_6" = "wall_remote_6_gang"
    "button_wireless_8" = "wall_remote_6_gang"
    "scene_switch_1" = "wall_remote_1_gang"
    "scene_switch_2" = "wall_remote_2_gang"
    "scene_switch_3" = "wall_remote_3_gang"
    "scene_switch_4" = "wall_remote_4_gang"
    "scene_switch_6" = "wall_remote_6_gang"

    # Switches
    "switch_1gang" = "switch_1_gang"
    "switch_2gang" = "switch_2_gang"
    "switch_3gang" = "switch_3_gang"
    "switch_4gang" = "wall_switch_4_gang"
    "switch_wall_5gang" = "wall_switch_5_gang_tuya"
    "switch_wall_6gang" = "wall_switch_6_gang_tuya"
    "switch_wall_7gang" = "wall_switch_6_gang_tuya"
    "switch_wall_8gang" = "wall_switch_6_gang_tuya"
    "switch_wireless" = "smart_button_switch"
    "module_mini_switch" = "switch_1_gang"

    # Plugs
    "plug_smart" = "smartplug"
    "plug_energy_monitor" = "smartplug"
    "switch_plug_1" = "plug"
    "switch_plug_2" = "smartplug_2_socket"
    "usb_outlet_advanced" = "smartplug_2_socket"

    # Dimmers
    "dimmer_wall_1gang" = "dimmer_1_gang"
    "dimmer_dual_channel" = "dimmer_2_gang"

    # Curtains
    "curtain_motor" = "curtain_motor"
    "curtain_motor_tilt" = "curtain_module"
    "shutter_roller_controller" = "wall_curtain_switch"

    # Lights
    "bulb_dimmable" = "tunable_bulb_E27"
    "bulb_rgb" = "rgb_bulb_E27"
    "bulb_rgbw" = "rgb_bulb_E27"
    "bulb_tunable_white" = "tunable_bulb_E27"
    "bulb_white" = "tunable_bulb_E27"
    "led_strip" = "rgb_led_strip"
    "led_strip_advanced" = "rgb_led_strip_controller"
    "led_strip_rgbw" = "rgb_led_strip"
    "led_controller_rgb" = "rgb_led_strip_controller"
    "led_controller_cct" = "dimmable_led_strip"
    "led_controller_dimmable" = "dimmable_led_strip"

    # Valves
    "valve_irrigation" = "smart_garden_irrigation_control"
    "valve_single" = "valvecontroller"
    "water_valve_smart" = "valvecontroller"
    "radiator_valve" = "thermostatic_radiator_valve"

    # Sensors
    "water_leak_sensor" = "water_leak_sensor_tuya"
    "smoke_detector_advanced" = "smoke_sensor"
    "co_sensor" = "smoke_sensor"
    "gas_sensor" = "smoke_sensor"
    "gas_detector" = "smoke_sensor"
    "rain_sensor" = "rain_sensor"
    "air_quality_co2" = "smart_air_detection_box"
    "air_quality_comprehensive" = "smart_air_detection_box"
    "formaldehyde_sensor" = "smart_air_detection_box"

    # Other
    "siren" = "siren"
    "doorbell" = "smart_door_window_sensor"
    "lock_smart" = "fingerbot"
    "door_controller" = "fingerbot"
    "ceiling_fan" = "dimmer_1_gang"
    "thermostat_4ch" = "wall_thermostat"
    "thermostat_tuya_dp" = "wall_thermostat"
    "smart_heater" = "wall_thermostat"
    "hvac_air_conditioner" = "wall_thermostat"
    "hvac_dehumidifier" = "wall_thermostat"
    "power_meter" = "smartPlug_DinRail"
    "energy_meter_3phase" = "smartPlug_DinRail"
    "smart_rcbo" = "smartPlug_DinRail"
    "weather_station_outdoor" = "temphumidsensor"
    "gateway_zigbee_bridge" = "zigbee_repeater"
    "generic_tuya" = "plug"
    "zigbee_universal" = "plug"
}

$baseUrl = "https://raw.githubusercontent.com/JohanBendz/com.tuya.zigbee/SDK3/drivers"

foreach ($driver in $mapping.Keys) {
    $johanDriver = $mapping[$driver]
    $destPath = "drivers/$driver/assets/images"

    if (-not (Test-Path $destPath)) {
        New-Item -ItemType Directory -Path $destPath -Force | Out-Null
    }

    Write-Host "Downloading images for $driver from $johanDriver..."

    try {
        Invoke-WebRequest -Uri "$baseUrl/$johanDriver/assets/images/small.png" -OutFile "$destPath/small.png" -ErrorAction Stop
        Invoke-WebRequest -Uri "$baseUrl/$johanDriver/assets/images/large.png" -OutFile "$destPath/large.png" -ErrorAction Stop

        # Copy large as xlarge if xlarge doesn't exist
        Copy-Item "$destPath/large.png" "$destPath/xlarge.png" -Force

        # Download icon.svg
        $iconDest = "drivers/$driver/assets/icon.svg"
        Invoke-WebRequest -Uri "$baseUrl/$johanDriver/assets/icon.svg" -OutFile $iconDest -ErrorAction SilentlyContinue

        Write-Host "  OK" -ForegroundColor Green
    }
    catch {
        Write-Host "  FAILED: $_" -ForegroundColor Red
    }
}

Write-Host "`nDone!" -ForegroundColor Cyan
