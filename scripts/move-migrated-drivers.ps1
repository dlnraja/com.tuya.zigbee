# Script de déplacement des drivers migrés vers SDK3 - Version améliorée
Write-Host "🚀 DÉPLACEMENT DRIVERS MIGRÉS - $(Get-Date -Format 'HH:mm:ss')"

$sourcePath = "drivers/in_progress"
$targetPath = "drivers/sdk3"
$movedCount = 0

# Liste des drivers migrés (114 drivers)
$migratedDrivers = @(
    "curtain_module", "curtain_motor", "dimmable_led_strip", "dimmable_recessed_led",
    "dimmer_1_gang_2", "dimmer_1_gang_tuya", "dimmer_2_gang", "dimmer_2_gang_tuya",
    "doorwindowsensor_4", "double_power_point", "double_power_point_2", "example_smartplug",
    "fingerbot", "handheld_remote_4_buttons", "lcdtemphumidluxsensor", "lcdtemphumidsensor",
    "lcdtemphumidsensor_2", "lcdtemphumidsensor_3", "light_rgb_TZ3000_dbou1ap4", "motion_sensor_2",
    "multi_sensor", "outdoor_2_socket", "outdoor_plug", "plug", "plug_blitzwolf_TZ3000_mraovvmm",
    "radar_sensor", "radar_sensor_2", "radar_sensor_ceiling", "rain_sensor", "relay_board_1_channel",
    "relay_board_2_channel", "relay_board_4_channel", "remote_control", "rgb_bulb_E14", "rgb_bulb_E27",
    "rgb_ceiling_led_light", "rgb_floor_led_light", "rgb_led_light_bar", "rgb_led_strip",
    "rgb_led_strip_controller", "rgb_mood_light", "rgb_spot_GardenLight", "rgb_spot_GU10",
    "rgb_wall_led_light", "sensor_temp_TUYATEC-g3gl6cgy", "siren", "sirentemphumidsensor",
    "smartplug", "smartplug_2_socket", "smartPlug_DinRail", "smart_air_detection_box",
    "smart_button_switch", "smart_door_window_sensor", "smart_garden_irrigation_control",
    "smart_knob_switch", "smart_motion_sensor", "smart_plug", "smart_remote_1_button",
    "smart_remote_1_button_2", "smart_remote_4_buttons", "smart_switch", "smoke_sensor2",
    "smoke_sensor3", "socket_power_strip", "socket_power_strip_four", "socket_power_strip_four_three",
    "socket_power_strip_four_two", "soilsensor", "soilsensor_2", "switch_1_gang", "switch_1_gang_metering",
    "switch_2_gang", "switch_2_gang_metering", "switch_3_gang", "switch_4_gang_metering",
    "temphumidsensor", "temphumidsensor2", "temphumidsensor3", "temphumidsensor4", "temphumidsensor5",
    "THB2", "TS0001", "TS004F", "TS011F", "TS0201", "TS0207", "TS0601", "TS130F",
    "tunable_bulb_E14", "tunable_bulb_E27", "tunable_spot_GU10", "tuya_dummy_device",
    "valvecontroller", "wall_curtain_switch", "wall_dimmer_tuya", "wall_remote_1_gang",
    "wall_remote_2_gang", "wall_remote_3_gang", "wall_remote_4_gang", "wall_remote_4_gang_2",
    "wall_remote_4_gang_3", "wall_remote_6_gang", "wall_socket", "wall_switch_1_gang",
    "wall_switch_1_gang_tuya", "wall_switch_2_gang", "wall_switch_3_gang", "wall_switch_4_gang",
    "wall_switch_4_gang_tuya", "wall_switch_5_gang_tuya", "wall_switch_6_gang_tuya",
    "wall_thermostat", "water_leak_sensor_tuya", "zigbee_repeater"
)

foreach ($driver in $migratedDrivers) {
    $sourceDir = Join-Path $sourcePath $driver
    $targetDir = Join-Path $targetPath $driver
    
    if (Test-Path $sourceDir) {
        try {
            # Créer le dossier de destination s'il n'existe pas
            if (!(Test-Path $targetDir)) {
                New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            }
            
            # Copier tous les fichiers du driver (éviter les conflits)
            Copy-Item -Path "$sourceDir\*" -Destination $targetDir -Recurse -Force -ErrorAction SilentlyContinue
            
            # Supprimer le dossier source seulement si la copie a réussi
            if (Test-Path $targetDir) {
                Remove-Item -Path $sourceDir -Recurse -Force -ErrorAction SilentlyContinue
                $movedCount++
                Write-Host "✅ Déplacé: $driver -> SDK3"
            }
        }
        catch {
            Write-Host "⚠️ Erreur avec $driver : $($_.Exception.Message)"
        }
    }
}

Write-Host "🎉 DÉPLACEMENT TERMINÉ - $movedCount drivers déplacés vers SDK3" 
