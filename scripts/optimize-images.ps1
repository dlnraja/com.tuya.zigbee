# PNG Optimization Script
# Generated automatically - DO NOT EDIT

Write-Host "PNG Image Optimization" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

# Check if ImageMagick is installed
$magickCmd = Get-Command magick -ErrorAction SilentlyContinue
if (-not $magickCmd) {
    Write-Host "ERROR: ImageMagick not found!" -ForegroundColor Red
    Write-Host "Install from: https://imagemagick.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found ImageMagick: $($magickCmd.Source)" -ForegroundColor Green
Write-Host ""

$totalFiles = 20
$processed = 0
$errors = 0


# File 1/20: drivers/air_quality_monitor_ac/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\air_quality_monitor_ac\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\air_quality_monitor_ac\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/air_quality_monitor_ac/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/air_quality_monitor_ac/assets/large.png" -ForegroundColor Red
}


# File 2/20: drivers/air_quality_monitor_pro_battery/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\air_quality_monitor_pro_battery\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\air_quality_monitor_pro_battery\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/air_quality_monitor_pro_battery/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/air_quality_monitor_pro_battery/assets/large.png" -ForegroundColor Red
}


# File 3/20: drivers/ceiling_fan_ac/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\ceiling_fan_ac\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\ceiling_fan_ac\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/ceiling_fan_ac/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/ceiling_fan_ac/assets/large.png" -ForegroundColor Red
}


# File 4/20: drivers/ceiling_light_controller_ac/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\ceiling_light_controller_ac\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\ceiling_light_controller_ac\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/ceiling_light_controller_ac/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/ceiling_light_controller_ac/assets/large.png" -ForegroundColor Red
}


# File 5/20: drivers/ceiling_light_rgb_ac/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\ceiling_light_rgb_ac\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\ceiling_light_rgb_ac\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/ceiling_light_rgb_ac/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/ceiling_light_rgb_ac/assets/large.png" -ForegroundColor Red
}


# File 6/20: drivers/climate_monitor_cr2032/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\climate_monitor_cr2032\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\climate_monitor_cr2032\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/climate_monitor_cr2032/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/climate_monitor_cr2032/assets/large.png" -ForegroundColor Red
}


# File 7/20: drivers/co2_sensor_battery/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\co2_sensor_battery\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\co2_sensor_battery\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/co2_sensor_battery/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/co2_sensor_battery/assets/large.png" -ForegroundColor Red
}


# File 8/20: drivers/co2_temp_humidity_cr2032/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\co2_temp_humidity_cr2032\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\co2_temp_humidity_cr2032\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/co2_temp_humidity_cr2032/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/co2_temp_humidity_cr2032/assets/large.png" -ForegroundColor Red
}


# File 9/20: drivers/comprehensive_air_monitor_ac/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\comprehensive_air_monitor_ac\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\comprehensive_air_monitor_ac\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/comprehensive_air_monitor_ac/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/comprehensive_air_monitor_ac/assets/large.png" -ForegroundColor Red
}


# File 10/20: drivers/co_detector_pro_battery/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\co_detector_pro_battery\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\co_detector_pro_battery\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/co_detector_pro_battery/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/co_detector_pro_battery/assets/large.png" -ForegroundColor Red
}


# File 11/20: drivers/curtain_motor_ac/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\curtain_motor_ac\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\curtain_motor_ac\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/curtain_motor_ac/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/curtain_motor_ac/assets/large.png" -ForegroundColor Red
}


# File 12/20: drivers/dimmer_ac/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\dimmer_ac\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\dimmer_ac\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/dimmer_ac/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/dimmer_ac/assets/large.png" -ForegroundColor Red
}


# File 13/20: drivers/dimmer_switch_1gang_ac/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\dimmer_switch_1gang_ac\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\dimmer_switch_1gang_ac\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/dimmer_switch_1gang_ac/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/dimmer_switch_1gang_ac/assets/large.png" -ForegroundColor Red
}


# File 14/20: drivers/dimmer_switch_3gang_ac/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\dimmer_switch_3gang_ac\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\dimmer_switch_3gang_ac\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/dimmer_switch_3gang_ac/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/dimmer_switch_3gang_ac/assets/large.png" -ForegroundColor Red
}


# File 15/20: drivers/dimmer_switch_timer_module_ac/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\dimmer_switch_timer_module_ac\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\dimmer_switch_timer_module_ac\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/dimmer_switch_timer_module_ac/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/dimmer_switch_timer_module_ac/assets/large.png" -ForegroundColor Red
}


# File 16/20: drivers/doorbell_cr2032/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\doorbell_cr2032\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\doorbell_cr2032\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/doorbell_cr2032/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/doorbell_cr2032/assets/large.png" -ForegroundColor Red
}


# File 17/20: drivers/door_controller_ac/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\door_controller_ac\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\door_controller_ac\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/door_controller_ac/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/door_controller_ac/assets/large.png" -ForegroundColor Red
}


# File 18/20: drivers/door_lock_battery/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\door_lock_battery\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\door_lock_battery\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/door_lock_battery/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/door_lock_battery/assets/large.png" -ForegroundColor Red
}


# File 19/20: drivers/door_window_sensor_battery/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\door_window_sensor_battery\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\door_window_sensor_battery\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/door_window_sensor_battery/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/door_window_sensor_battery/assets/large.png" -ForegroundColor Red
}


# File 20/20: drivers/energy_monitoring_plug_ac/assets/large.png
try {
    $inputFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\energy_monitoring_plug_ac\\assets\\large.png"
    $backupFile = "C:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers\\energy_monitoring_plug_ac\\assets\\large.png.backup"
    
    # Backup original
    Copy-Item $inputFile $backupFile -Force
    
    # Optimize
    magick convert $inputFile -quality 85 -define png:compression-level=9 $inputFile
    
    $processed++
    Write-Host "  ✅ Optimized: drivers/energy_monitoring_plug_ac/assets/large.png" -ForegroundColor Green
} catch {
    $errors++
    Write-Host "  ❌ Error: drivers/energy_monitoring_plug_ac/assets/large.png" -ForegroundColor Red
}


Write-Host ""
Write-Host "========================" -ForegroundColor Cyan
Write-Host "Optimization Complete!" -ForegroundColor Cyan
Write-Host "  Processed: $processed files" -ForegroundColor Green
Write-Host "  Errors: $errors files" -ForegroundColor $(if($errors -gt 0){'Red'}else{'Green'})
Write-Host ""
Write-Host "Backups saved with .backup extension"
