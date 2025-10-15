# Add Energy Badges to Driver Images
# Requires ImageMagick: https://imagemagick.org/

Write-Host "🔋 Energy Badge Overlay Tool" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Check ImageMagick
$magickCmd = Get-Command magick -ErrorAction SilentlyContinue
if (-not $magickCmd) {
    Write-Host "ERROR: ImageMagick not found!" -ForegroundColor Red
    Write-Host "Install from: https://imagemagick.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found ImageMagick: $($magickCmd.Source)" -ForegroundColor Green
Write-Host ""

$rootPath = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair"
$iconPath = "$rootPath\assets\icons"

# Function to add badge
function Add-EnergyBadge {
    param(
        [string]$imagePath,
        [string]$badgeType
    )
    
    $badgePath = "$iconPath\power-$badgeType.svg"
    
    if (-not (Test-Path $badgePath)) {
        Write-Host "  ⚠️  Badge not found: $badgePath" -ForegroundColor Yellow
        return $false
    }
    
    # Create backup
    $backupPath = $imagePath + ".nobadge"
    if (-not (Test-Path $backupPath)) {
        Copy-Item $imagePath $backupPath -Force
    }
    
    # Add badge overlay (bottom-right corner, 20% size)
    try {
        # Convert SVG badge to PNG first
        $tempBadge = "$env:TEMP\badge-$badgeType.png"
        magick convert $badgePath -resize 100x100 $tempBadge
        
        # Composite badge onto image
        magick composite -gravity SouthEast -geometry +10+10 $tempBadge $imagePath $imagePath
        
        Remove-Item $tempBadge -Force
        return $true
    } catch {
        Write-Host "  ❌ Error: $_" -ForegroundColor Red
        return $false
    }
}

# Process battery-powered drivers
Write-Host "🔋 Processing battery-powered drivers..." -ForegroundColor Yellow
$batteryDrivers = @(
    "air_quality_monitor_pro_battery",
    "climate_monitor_cr2032",
    "co2_sensor_battery",
    "co2_temp_humidity_cr2032",
    "contact_sensor_battery",
    "co_detector_pro_battery",
    "curtain_motor_ac",
    "doorbell_cr2032",
    "door_controller_ac",
    "door_lock_battery",
    "door_window_sensor_battery",
    "fingerprint_lock_battery",
    "formaldehyde_sensor_battery",
    "garage_door_controller_ac",
    "garage_door_opener_cr2032",
    "gas_detector_battery",
    "gas_sensor_ts0601_battery",
    "humidity_controller_ac",
    "lux_sensor_battery",
    "mini_switch_cr2032",
    "motion_sensor_battery",
    "motion_sensor_illuminance_battery",
    "motion_sensor_mmwave_battery",
    "motion_sensor_pir_ac_battery",
    "motion_sensor_pir_battery",
    "motion_sensor_zigbee_204z_battery",
    "motion_temp_humidity_illumination_multi_battery",
    "multisensor_battery",
    "noise_level_sensor_battery",
    "outdoor_light_controller_ac",
    "outdoor_siren_cr2032",
    "pet_feeder_cr2032",
    "pir_radar_illumination_sensor_battery",
    "pir_sensor_advanced_battery",
    "pm25_detector_battery",
    "pm25_sensor_battery",
    "presence_sensor_mmwave_battery",
    "presence_sensor_radar_battery",
    "pressure_sensor_battery",
    "radar_motion_sensor_advanced_battery",
    "radar_motion_sensor_mmwave_battery",
    "radar_motion_sensor_tank_level_battery",
    "radiator_valve_hybrid",
    "remote_switch_cr2032",
    "roller_blind_controller_ac",
    "roller_shutter_controller_ac",
    "roller_shutter_switch_advanced_battery",
    "roller_shutter_switch_cr2032",
    "scene_controller_2button_cr2032",
    "scene_controller_4button_cr2032",
    "scene_controller_6button_cr2032",
    "scene_controller_8button_cr2032",
    "scene_controller_battery",
    "smart_curtain_motor_hybrid",
    "smart_doorbell_battery",
    "smart_garden_sprinkler_battery",
    "smart_irrigation_controller_hybrid",
    "smart_lock_battery",
    "smart_smoke_detector_advanced_battery",
    "smart_thermostat_hybrid",
    "smart_valve_controller_hybrid",
    "smart_water_valve_hybrid",
    "smoke_detector_battery",
    "smoke_detector_temperature_battery",
    "smoke_detector_temp_humidity_advanced_battery",
    "smoke_temp_humid_sensor_battery",
    "soil_moisture_sensor_battery",
    "soil_moisture_temperature_sensor_battery",
    "soil_tester_temp_humid_cr2032",
    "solar_panel_controller_hybrid",
    "sos_emergency_button_cr2032",
    "switch_1gang_battery",
    "switch_3gang_battery",
    "switch_4gang_battery_cr2032",
    "switch_5gang_battery",
    "tank_level_monitor_cr2032",
    "temperature_controller_hybrid",
    "temperature_humidity_display_battery",
    "temperature_humidity_sensor_battery",
    "temperature_sensor_advanced_battery",
    "temperature_sensor_battery",
    "temp_humid_sensor_advanced_battery",
    "temp_humid_sensor_dd_battery",
    "temp_humid_sensor_leak_detector_battery",
    "temp_sensor_pro_battery",
    "thermostat_hybrid",
    "tvoc_sensor_advanced_battery",
    "tvoc_sensor_battery",
    "vibration_sensor_battery",
    "water_leak_detector_advanced_battery",
    "water_leak_detector_battery",
    "water_leak_sensor_battery",
    "water_valve_hybrid",
    "water_valve_smart_hybrid",
    "wireless_button_2gang_battery",
    "wireless_dimmer_scroll_battery",
    "wireless_scene_controller_4button_battery",
    "wireless_switch_1gang_cr2032",
    "wireless_switch_2gang_cr2032",
    "wireless_switch_3gang_cr2032",
    "wireless_switch_4gang_cr2032",
    "wireless_switch_4gang_cr2450",
    "wireless_switch_5gang_cr2032",
    "wireless_switch_6gang_cr2032",
    "wireless_switch_cr2032"
)

$processed = 0
foreach ($driver in $batteryDrivers) {
    $imagePath = "$rootPath\drivers\$driver\assets\large.png"
    if (Test-Path $imagePath) {
        if (Add-EnergyBadge -imagePath $imagePath -badgeType "battery") {
            Write-Host "  ✅ $driver" -ForegroundColor Green
            $processed++
        }
    }
}

# Process AC-powered drivers
Write-Host ""
Write-Host "🔌 Processing AC-powered drivers..." -ForegroundColor Yellow
$acDrivers = @(
    "air_quality_monitor_ac",
    "alarm_siren_chime_ac",
    "bulb_color_rgbcct_ac",
    "bulb_white_ac",
    "bulb_white_ambiance_ac",
    "ceiling_fan_ac",
    "ceiling_light_controller_ac",
    "ceiling_light_rgb_ac",
    "comprehensive_air_monitor_ac",
    "dimmer_ac",
    "dimmer_switch_1gang_ac",
    "dimmer_switch_3gang_ac",
    "dimmer_switch_timer_module_ac",
    "doorbell_camera_ac",
    "energy_monitoring_plug_ac",
    "energy_monitoring_plug_advanced_ac",
    "energy_plug_advanced_ac",
    "extension_plug_ac",
    "fan_controller_ac",
    "gas_sensor_ts0601_ac",
    "hvac_controller_ac",
    "led_strip_advanced_ac",
    "led_strip_controller_ac",
    "led_strip_controller_pro_ac",
    "led_strip_outdoor_color_ac",
    "milight_controller_ac",
    "mini_ac",
    "pool_pump_controller_ac",
    "power_meter_socket_ac",
    "projector_screen_controller_ac",
    "relay_switch_1gang_ac",
    "rgb_led_controller_ac",
    "shade_controller_ac",
    "smart_bulb_dimmer_ac",
    "smart_bulb_rgb_ac",
    "smart_bulb_tunable_ac",
    "smart_bulb_white_ac",
    "smart_dimmer_module_1gang_ac",
    "smart_outlet_monitor_ac",
    "smart_plug_ac",
    "smart_plug_dimmer_ac",
    "smart_plug_energy_ac",
    "smart_plug_power_meter_16a_ac",
    "smart_spot_ac",
    "smart_switch_1gang_ac",
    "smart_switch_2gang_ac",
    "smart_switch_3gang_ac",
    "switch_2gang_ac",
    "switch_4gang_ac",
    "switch_6gang_ac",
    "switch_8gang_ac",
    "touch_dimmer_1gang_ac",
    "touch_dimmer_ac",
    "touch_switch_1gang_ac",
    "touch_switch_2gang_ac",
    "touch_switch_3gang_ac",
    "touch_switch_4gang_ac",
    "usb_outlet_ac",
    "usb_outlet_advanced_ac",
    "wall_switch_1gang_ac",
    "wall_switch_2gang_ac",
    "wall_switch_3gang_ac",
    "wall_switch_4gang_ac",
    "wall_switch_5gang_ac",
    "wall_switch_6gang_ac",
    "zbbridge_ac",
    "zigbee_gateway_hub_ac"
)

foreach ($driver in $acDrivers) {
    $imagePath = "$rootPath\drivers\$driver\assets\large.png"
    if (Test-Path $imagePath) {
        if (Add-EnergyBadge -imagePath $imagePath -badgeType "ac") {
            Write-Host "  ✅ $driver" -ForegroundColor Green
            $processed++
        }
    }
}

Write-Host ""
Write-Host "=============================" -ForegroundColor Cyan
Write-Host "Processed: $processed drivers" -ForegroundColor Green
Write-Host "Backups saved with .nobadge extension" -ForegroundColor Yellow
