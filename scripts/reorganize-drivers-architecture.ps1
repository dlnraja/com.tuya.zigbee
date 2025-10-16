# Reorganisation Complete Architecture Drivers
# Date: 16 Octobre 2025
# Objectif: Structure hierarchique coherente par categories

param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"
$projectRoot = "c:\Users\HP\Desktop\homey app\tuya_repair"
Set-Location $projectRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  REORGANISATION ARCHITECTURE DRIVERS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "MODE: DRY RUN (aucune modification)" -ForegroundColor Yellow
    Write-Host ""
}

# Mapping complet ancien -> nouveau
$driverMapping = @{
    # LIGHTING (28 drivers)
    "bulb_white_ac" = "01_lighting/bulb_white"
    "bulb_white_ambiance_ac" = "01_lighting/bulb_white_ambiance"
    "bulb_color_rgbcct_ac" = "01_lighting/bulb_color_rgbcct"
    "led_strip_controller_ac" = "01_lighting/led_strip_controller"
    "led_strip_advanced_ac" = "01_lighting/led_strip_advanced"
    "led_strip_controller_pro_ac" = "01_lighting/led_strip_pro"
    "led_strip_outdoor_color_ac" = "01_lighting/led_strip_outdoor"
    "ceiling_light_controller_ac" = "01_lighting/ceiling_light_controller"
    "ceiling_light_rgb_ac" = "01_lighting/ceiling_light_rgb"
    "milight_controller_ac" = "01_lighting/milight_controller"
    
    # SWITCHES (42 drivers)
    "switch_1gang_ac" = "02_switches/switch_1gang"
    "switch_2gang_ac" = "02_switches/switch_2gang"
    "switch_3gang_ac" = "02_switches/switch_3gang"
    "switch_4gang_ac" = "02_switches/switch_4gang"
    "dimmer_ac" = "02_switches/dimmer"
    "dimmer_switch_1gang_ac" = "02_switches/dimmer_1gang"
    "dimmer_switch_3gang_ac" = "02_switches/dimmer_3gang"
    "dimmer_switch_timer_module_ac" = "02_switches/dimmer_timer"
    "mini_switch_cr2032" = "02_switches/mini_switch"
    "remote_switch_battery" = "02_switches/remote_switch"
    
    # PLUGS (18 drivers)
    "smart_plug_ac" = "03_plugs/smart_plug"
    "energy_monitoring_plug_ac" = "03_plugs/smart_plug_energy"
    "energy_monitoring_plug_advanced_ac" = "03_plugs/smart_plug_advanced"
    "energy_plug_advanced_ac" = "03_plugs/energy_plug_advanced"
    "extension_plug_ac" = "03_plugs/extension_plug"
    "mini_ac" = "03_plugs/mini_plug"
    
    # SENSORS - Motion
    "motion_sensor_battery" = "04_sensors/motion/motion_basic"
    "motion_sensor_illuminance_battery" = "04_sensors/motion/motion_illuminance"
    "motion_sensor_mmwave_battery" = "04_sensors/motion/motion_mmwave"
    
    # SENSORS - Contact
    "door_window_sensor_battery" = "04_sensors/contact/door_window"
    "contact_sensor_battery" = "04_sensors/contact/contact_basic"
    "vibration_sensor_battery" = "04_sensors/contact/vibration"
    
    # SENSORS - Climate
    "temperature_humidity_sensor_battery" = "04_sensors/climate/temperature_humidity"
    "climate_monitor_cr2032" = "04_sensors/climate/climate_basic"
    "co2_sensor_battery" = "04_sensors/climate/co2_monitor"
    "co2_temp_humidity_cr2032" = "04_sensors/climate/co2_temp_humidity"
    
    # SENSORS - Air Quality
    "air_quality_monitor_ac" = "04_sensors/air_quality/air_quality_basic"
    "air_quality_monitor_pro_battery" = "04_sensors/air_quality/air_quality_pro"
    "comprehensive_air_monitor_ac" = "04_sensors/air_quality/comprehensive"
    "formaldehyde_sensor_battery" = "04_sensors/air_quality/formaldehyde"
    
    # SENSORS - Safety
    "smoke_detector_battery" = "04_sensors/safety/smoke_detector"
    "gas_detector_battery" = "04_sensors/safety/gas_detector"
    "gas_sensor_ts0601_ac" = "04_sensors/safety/gas_sensor"
    "gas_sensor_ts0601_battery" = "04_sensors/safety/gas_sensor"
    "co_detector_pro_battery" = "04_sensors/safety/co_detector"
    "water_leak_sensor_battery" = "04_sensors/safety/water_leak"
    
    # SENSORS - Other
    "lux_sensor_battery" = "04_sensors/other/lux_sensor"
    "soil_moisture_sensor_battery" = "04_sensors/other/soil_moisture"
    
    # SECURITY (12 drivers)
    "alarm_siren_chime_ac" = "05_security/siren_chime"
    "siren_alarm_battery" = "05_security/siren_alarm"
    "sos_button_battery" = "05_security/sos_button"
    "door_lock_battery" = "05_security/door_lock"
    "fingerprint_lock_battery" = "05_security/fingerprint_lock"
    "doorbell_cr2032" = "05_security/doorbell"
    "doorbell_camera_ac" = "05_security/doorbell_camera"
    
    # CLIMATE (18 drivers)
    "thermostat_battery" = "06_climate/thermostat/thermostat_basic"
    "thermostat_lcd_battery" = "06_climate/thermostat/thermostat_lcd"
    "thermostat_pro_ac" = "06_climate/thermostat/thermostat_pro"
    "hvac_controller_ac" = "06_climate/hvac_controller"
    "trv_valve_battery" = "06_climate/trv_valve/trv_basic"
    "trv_advanced_battery" = "06_climate/trv_valve/trv_advanced"
    "humidity_controller_ac" = "06_climate/humidity_controller"
    "fan_controller_ac" = "06_climate/fan_controller"
    
    # MOTORS (8 drivers)
    "curtain_motor_ac" = "07_motors/curtain_motor"
    "curtain_switch_ac" = "07_motors/curtain_switch"
    "roller_blind_ac" = "07_motors/blind_controller"
    "valve_controller_ac" = "07_motors/valve_controller"
    "garage_door_controller_ac" = "07_motors/garage_door"
    "garage_door_opener_cr2032" = "07_motors/garage_door_remote"
    "door_controller_ac" = "07_motors/door_controller"
    
    # BUTTONS (12 drivers)
    "button_1_battery" = "08_buttons/button_1"
    "button_2_battery" = "08_buttons/button_2"
    "button_4_battery" = "08_buttons/button_4"
    "button_6_battery" = "08_buttons/button_6"
    "scene_switch_battery" = "08_buttons/scene_switch"
    "rotary_dimmer_battery" = "08_buttons/rotary_dimmer"
    "wireless_switch_battery" = "08_buttons/wireless_switch"
    
    # SPECIALIZED (13 drivers)
    "ceiling_fan_ac" = "09_specialized/ceiling_fan"
    "pet_feeder_ac" = "09_specialized/pet_feeder"
    "irrigation_controller_ac" = "09_specialized/irrigation"
    "presence_detector_mmwave_ac" = "09_specialized/presence_detector"
    "occupancy_sensor_battery" = "09_specialized/occupancy_sensor"
}

Write-Host "1. Analyse drivers existants..." -ForegroundColor Yellow
$driversPath = Join-Path $projectRoot "drivers"
$existingDrivers = Get-ChildItem -Path $driversPath -Directory

Write-Host "   Trouve: $($existingDrivers.Count) drivers" -ForegroundColor Green
Write-Host ""

Write-Host "2. Creation structure categories..." -ForegroundColor Yellow
$categories = @(
    "01_lighting",
    "02_switches", 
    "03_plugs",
    "04_sensors/motion",
    "04_sensors/contact",
    "04_sensors/climate",
    "04_sensors/air_quality",
    "04_sensors/safety",
    "04_sensors/other",
    "05_security",
    "06_climate/thermostat",
    "06_climate/trv_valve",
    "07_motors",
    "08_buttons",
    "09_specialized"
)

foreach ($category in $categories) {
    $categoryPath = Join-Path $driversPath $category
    if (-not (Test-Path $categoryPath)) {
        if (-not $DryRun) {
            New-Item -Path $categoryPath -ItemType Directory -Force | Out-Null
        }
        Write-Host "   Cree: $category" -ForegroundColor Green
    }
}
Write-Host ""

Write-Host "3. Migration drivers..." -ForegroundColor Yellow
$migrated = 0
$skipped = 0

foreach ($oldName in $driverMapping.Keys) {
    $newPath = $driverMapping[$oldName]
    $oldPath = Join-Path $driversPath $oldName
    $newFullPath = Join-Path $driversPath $newPath
    
    if (Test-Path $oldPath) {
        if ($Verbose) {
            Write-Host "   $oldName -> $newPath" -ForegroundColor Cyan
        }
        
        if (-not $DryRun) {
            # Copy entire driver folder
            if (Test-Path $newFullPath) {
                Write-Host "   WARN: $newPath existe deja, skip" -ForegroundColor Yellow
                $skipped++
            } else {
                Copy-Item -Path $oldPath -Destination $newFullPath -Recurse -Force
                $migrated++
            }
        } else {
            $migrated++
        }
    } else {
        if ($Verbose) {
            Write-Host "   SKIP: $oldName (inexistant)" -ForegroundColor Gray
        }
        $skipped++
    }
}

Write-Host "   Migre: $migrated drivers" -ForegroundColor Green
Write-Host "   Skipped: $skipped drivers" -ForegroundColor Yellow
Write-Host ""

if (-not $DryRun) {
    Write-Host "4. Mise a jour .homeycompose..." -ForegroundColor Yellow
    Write-Host "   TODO: Update driver IDs dans .homeycompose/app.json" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "5. Validation..." -ForegroundColor Yellow
    Write-Host "   Lancement homey app validate..." -ForegroundColor Yellow
    try {
        & homey app validate
        Write-Host "   Validation OK!" -ForegroundColor Green
    } catch {
        Write-Host "   ERREUR Validation: $_" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "  REORGANISATION TERMINEE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Statistiques:" -ForegroundColor Cyan
Write-Host "  Categories creees: $($categories.Count)" -ForegroundColor White
Write-Host "  Drivers migres: $migrated" -ForegroundColor White
Write-Host "  Drivers skipped: $skipped" -ForegroundColor White
Write-Host ""

if ($DryRun) {
    Write-Host "MODE DRY RUN - Aucune modification appliquee" -ForegroundColor Yellow
    Write-Host "Relancer sans -DryRun pour appliquer" -ForegroundColor Yellow
} else {
    Write-Host "IMPORTANT:" -ForegroundColor Yellow
    Write-Host "1. Verifier compilation: homey app validate" -ForegroundColor White
    Write-Host "2. Mettre a jour scripts automation" -ForegroundColor White
    Write-Host "3. Mettre a jour documentation" -ForegroundColor White
    Write-Host "4. Commiter changements" -ForegroundColor White
}
