# Script d'enrichissement automatique des manufacturer IDs manquants
# Consulte les bases de données connues et propose l'ajout aux drivers appropriés

$missingIds = @{
    "_TYZB01_" = @("2athzhfr", "4tlksk8a", "6sadkhcy", "a476raq2", "aneiicmq", "b8cr31hp", 
                    "cbiezpds", "digziiav", "dl7cejts", "dsjszp0x", "ftdkanlj", "hjsgdkfl",
                    "iuepbmpv", "jytabjkb", "kvwjujy9", "mqel1whf", "mtlhqn48", "ncutbjdi",
                    "phjeraqq", "qeqvmvti", "qezuin6k", "seqwasot", "sqmd19i1", "v8gtiaed",
                    "vzrytttn", "wqcac7lo", "xfpdrwvc", "xiuox57i", "xph99wvr", "ymcdbl3u", "zsl6z0pw")
    "_TYZB02_" = @("keyjhapk", "keyjqthh")
    "_TZ2000_" = @("xogb73am")
    "_TZ3000_" = @("12sxjap4", "18ejxno0", "1obwwnmq", "49qchf10", "4js9lo5d", "4uf3d0ax",
                    "5bsf8vaj", "7ed9cqgi", "8uaoilu9", "92chsky7", "9cpuaca6", "bvrlqyj7",
                    "dl4pxp1r", "el5kt5im", "fisb3ajo", "gek6snaj", "h1jnz6l8", "hlijwsai",
                    "i8l0nqdu", "jl7qyupf", "kdpxju99", "keabpigv", "ktuoyvt5", "llfaquvp",
                    "lmlsduws", "lvhy15ix", "mgusv51k", "obacbukl", "oborybow", "odzoiovu",
                    "pmz6mjyu", "q50zhdsc", "qaa59zqd", "qd7hej8u", "qqjaziws", "ukuvyhaa",
                    "utagpnzs", "vmpbygs5", "vzopcetz", "wzauvbcs", "zmy4lslw")
    "_TZ3210_" = @("3mpwqzuu", "4ubylghk", "7jnk7l3k", "dwytrmda", "eymunffl", "invesber",
                    "iystcadi", "k1msuvg6", "k1pe6ibm", "mja6r5ix", "ncw88jfq", "ngqk6jia",
                    "ol1uhvza", "pagajpog", "r0xgkft5", "wdexaypg", "weaqkhab", "x13bu7za",
                    "zdrhqmo0", "zxbtub8r")
    "_TZ3400_" = @("keyjhapk")
    "_TZE200_" = @("1agwnems", "3p5ydos3", "4mh6tyyo", "579lguh2", "c2fmom5z", "e3oitdyu",
                    "fjjbhx9d", "gwkapsoq", "holel4dk", "ikvncluo", "ip2akl4w", "jva8ink8",
                    "la2c2uo9", "lyetpprm", "mja3fuja", "s8gkrkxk", "sgpeacqp", "vucankjx",
                    "wukb7rhc", "xpq2rzhq", "yvx5lh6k")
    "_TZE204_" = @("1fuxihti", "9qhuzgo0", "aoclfnxz", "bxoo2swd", "hlx9tnzb", "ijxvkhd0",
                    "myd45weu", "n9ctkb6j", "ntcy3xu1", "qasjif9e", "sxm7l9xa", "upagmta9",
                    "xsm7l9xa", "zenj4lxv")
}

# Base de connaissance pour mapper manufacturer IDs vers drivers
# Source: Zigbee2MQTT, Johan Bendz forum, diagnostic reports
$knownMappings = @{
    # Switches & Remotes
    "_TYZB01_qezuin6k" = @{ driver = "dimmer_switch_1gang_ac"; product = "TS110F"; type = "1 Gang Dimmer" }
    "_TYZB01_v8gtiaed" = @{ driver = "dimmer_switch_3gang_ac"; product = "TS110F"; type = "2 Gang Dimmer" }
    "_TYZB01_xfpdrwvc" = @{ driver = "switch_1gang_battery"; product = "TS0011"; type = "1 Gang Wall Switch" }
    "_TYZB01_mtlhqn48" = @{ driver = "switch_2gang_battery"; product = "TS0012"; type = "2 Gang Wall Switch" }
    "_TYZB01_xiuox57i" = @{ driver = "switch_3gang_battery"; product = "TS0013"; type = "3 Gang Wall Switch" }
    "_TYZB02_keyjqthh" = @{ driver = "switch_1gang_battery"; product = "TS0041"; type = "1 Gang Remote" }
    "_TYZB02_keyjhapk" = @{ driver = "switch_2gang_battery"; product = "TS0042"; type = "2 Gang Remote" }
    "_TZ3400_keyjhapk" = @{ driver = "switch_2gang_battery"; product = "TS0042"; type = "2 Gang Remote" }
    
    # Temperature sensors
    "_TZ2000_xogb73am" = @{ driver = "temperature_humidity_sensor_battery"; product = "TS0201"; type = "LCD Temp Sensor" }
    "_TYZB01_hjsgdkfl" = @{ driver = "temperature_humidity_sensor_battery"; product = "TS0201"; type = "LCD Temp Sensor" }
    "_TYZB01_a476raq2" = @{ driver = "temperature_humidity_sensor_battery"; product = "TS0201"; type = "LCD Temp Sensor" }
    
    # Motion sensors
    "_TYZB01_jytabjkb" = @{ driver = "motion_sensor_battery"; product = "TS0202"; type = "PIR Motion Sensor" }
    "_TYZB01_dl7cejts" = @{ driver = "motion_sensor_battery"; product = "TS0202"; type = "PIR Motion Sensor" }
    
    # Contact sensors
    "_TYZB01_xph99wvr" = @{ driver = "door_window_sensor_battery"; product = "RH3001"; type = "Door/Window Sensor" }
    
    # Water detectors
    "_TYZB01_sqmd19i1" = @{ driver = "water_sensor_battery"; product = "TS0207"; type = "Water Detector" }
    
    # Smoke detectors
    "_TYZB01_dsjszp0x" = @{ driver = "smoke_detector_battery"; product = "TS0205"; type = "Smoke Sensor" }
    "_TYZB01_wqcac7lo" = @{ driver = "smoke_detector_battery"; product = "TS0205"; type = "Smoke Sensor" }
    
    # Plugs - Note: _TYZB01_iuepbmpv used in both temp sensor and plug drivers
    
    # Switch modules
    "_TYZB01_ncutbjdi" = @{ driver = "switch_module_1gang_ac"; product = "TS0003"; type = "1 Gang Switch Module" }
    "_TYZB01_zsl6z0pw" = @{ driver = "switch_module_2gang_ac"; product = "TS0003"; type = "2 Gang Switch Module" }
    "_TYZB01_digziiav" = @{ driver = "switch_module_2gang_ac"; product = "TS0003"; type = "2 Gang Switch Module" }
    
    # Valve controllers
    "_TYZB01_ymcdbl3u" = @{ driver = "valve_controller_battery"; product = "TS0111"; type = "Valve Controller" }
    "_TYZB01_4tlksk8a" = @{ driver = "valve_controller_battery"; product = "TS0001"; type = "Valve Controller" }
    
    # RGB Bulbs & LED
    "_TZ3000_12sxjap4" = @{ driver = "bulb_color_rgbcct_ac"; product = "TS0505B"; type = "RGB Bulb E27 (YANDHI)" }
    "_TZ3000_hlijwsai" = @{ driver = "bulb_color_rgbcct_ac"; product = "TS0505A"; type = "RGB Bulb" }
    "_TZ3000_keabpigv" = @{ driver = "bulb_color_rgbcct_ac"; product = "TS0505A"; type = "RGB Bulb E27 (Woox)" }
    "_TZ3000_qd7hej8u" = @{ driver = "bulb_color_rgbcct_ac"; product = "TS0505B"; type = "RGB Bulb (LIVARNO)" }
    "_TZ3000_q50zhdsc" = @{ driver = "bulb_color_rgbcct_ac"; product = "TS0505B"; type = "RGB Bulb" }
    "_TZ3000_gek6snaj" = @{ driver = "led_strip_controller_ac"; product = "TS0505A"; type = "RGB LED Bar (LIVARNO)" }
    "_TZ3000_kdpxju99" = @{ driver = "bulb_color_rgbcct_ac"; product = "TS0505A"; type = "RGB Spot GU10 (LIVARNO)" }
    "_TZ3000_h1jnz6l8" = @{ driver = "bulb_color_rgbcct_ac"; product = "TS0505A"; type = "RGB Garden Light (LIVARNO)" }
    "_TZ3000_5bsf8vaj" = @{ driver = "bulb_color_rgbcct_ac"; product = "TS0505A"; type = "RGB Wall Light" }
    "_TZ3000_utagpnzs" = @{ driver = "bulb_color_rgbcct_ac"; product = "TS0505A"; type = "RGB Wall Light" }
    "_TZ3000_obacbukl" = @{ driver = "led_strip_controller_ac"; product = "TS0503A"; type = "RGB LED Controller" }
    "_TZ3000_dl4pxp1r" = @{ driver = "led_strip_controller_ac"; product = "TS0503A"; type = "RGB LED Controller" }
    "_TZ3000_qqjaziws" = @{ driver = "led_strip_controller_ac"; product = "TS0505B"; type = "RGB LED Controller" }
    "_TZ3000_i8l0nqdu" = @{ driver = "led_strip_controller_ac"; product = "TS0503B"; type = "RGB LED Controller" }
    "_TZ3000_ukuvyhaa" = @{ driver = "led_strip_controller_ac"; product = "TS0504B"; type = "RGB LED Controller" }
    "_TZ3000_9cpuaca6" = @{ driver = "bulb_color_rgbcct_ac"; product = "TS0505A"; type = "RGB Mood Light (LIVARNO)" }
    
    # Tunable white
    "_TZ3000_oborybow" = @{ driver = "bulb_white_ambiance_ac"; product = "TS0502A"; type = "Tunable E14 (LIVARNO)" }
    "_TZ3000_49qchf10" = @{ driver = "bulb_white_ambiance_ac"; product = "TS0502A"; type = "Tunable E27 (LIVARNO)" }
    "_TZ3000_el5kt5im" = @{ driver = "bulb_white_ambiance_ac"; product = "TS0502A"; type = "Tunable GU10 (LIVARNO)" }
    "_TZ3000_8uaoilu9" = @{ driver = "bulb_white_ambiance_ac"; product = "TS0502A"; type = "RGB Floor Light (LIVARNO)" }
    
    # Dimmers
    "_TZ3000_92chsky7" = @{ driver = "dimmer_switch_1gang_ac"; product = "TS110F"; type = "2 Gang Dimmer" }
    "_TZ3000_ktuoyvt5" = @{ driver = "dimmer_switch_1gang_ac"; product = "TS110F"; type = "1 Gang Dimmer" }
    "_TZ3000_mgusv51k" = @{ driver = "dimmer_switch_1gang_ac"; product = "TS0052"; type = "1 Gang Dimmer" }
    "_TZ3210_ngqk6jia" = @{ driver = "dimmer_switch_1gang_ac"; product = "TS110E"; type = "1 Gang Dimmer" }
    "_TZ3210_zxbtub8r" = @{ driver = "dimmer_switch_1gang_ac"; product = "TS110E"; type = "1 Gang Dimmer" }
    "_TZ3210_weaqkhab" = @{ driver = "dimmer_switch_1gang_ac"; product = "TS110E"; type = "1 Gang Dimmer" }
    "_TZ3210_k1msuvg6" = @{ driver = "dimmer_switch_1gang_ac"; product = "TS110E"; type = "1 Gang Dimmer" }
    "_TZ3210_wdexaypg" = @{ driver = "dimmer_switch_3gang_ac"; product = "TS110E"; type = "2 Gang Dimmer" }
    "_TZ3210_3mpwqzuu" = @{ driver = "dimmer_switch_3gang_ac"; product = "TS110E"; type = "2 Gang Dimmer" }
    "_TZ3210_pagajpog" = @{ driver = "dimmer_switch_3gang_ac"; product = "TS110E"; type = "2 Gang Dimmer" }
    "_TZ3210_4ubylghk" = @{ driver = "dimmer_switch_3gang_ac"; product = "TS110E"; type = "2 Gang Dimmer" }
    "_TZE200_3p5ydos3" = @{ driver = "dimmer_ac"; product = "TS0601"; type = "Wall Dimmer" }
    "_TZE200_la2c2uo9" = @{ driver = "dimmer_switch_1gang_ac"; product = "TS0601"; type = "1 Gang Dimmer" }
    "_TZE200_ip2akl4w" = @{ driver = "dimmer_switch_1gang_ac"; product = "TS0601"; type = "1 Gang Dimmer" }
    "_TZE200_1agwnems" = @{ driver = "dimmer_switch_1gang_ac"; product = "TS0601"; type = "1 Gang Dimmer" }
    "_TZE200_579lguh2" = @{ driver = "dimmer_switch_1gang_ac"; product = "TS0601"; type = "1 Gang Dimmer" }
    "_TZE200_vucankjx" = @{ driver = "dimmer_switch_1gang_ac"; product = "TS0601"; type = "1 Gang Dimmer" }
    "_TZE200_4mh6tyyo" = @{ driver = "dimmer_switch_1gang_ac"; product = "TS0601"; type = "1 Gang Dimmer" }
    "_TZE204_hlx9tnzb" = @{ driver = "dimmer_switch_1gang_ac"; product = "TS0601"; type = "1 Gang Dimmer" }
    "_TZE204_n9ctkb6j" = @{ driver = "dimmer_switch_1gang_ac"; product = "TS0601"; type = "1 Gang Dimmer" }
    "_TZE204_9qhuzgo0" = @{ driver = "dimmer_switch_1gang_ac"; product = "TS0601"; type = "1 Gang Dimmer" }
    "_TZE200_e3oitdyu" = @{ driver = "dimmer_switch_3gang_ac"; product = "TS0601"; type = "2 Gang Dimmer" }
    "_TZE204_zenj4lxv" = @{ driver = "dimmer_switch_3gang_ac"; product = "TS0601"; type = "2 Gang Dimmer" }
    "_TZE204_bxoo2swd" = @{ driver = "dimmer_switch_3gang_ac"; product = "TS0601"; type = "2 Gang Dimmer" }
    "_TZE200_gwkapsoq" = @{ driver = "dimmer_switch_3gang_ac"; product = "TS0601"; type = "2 Gang Dimmer" }
    "_TZE200_fjjbhx9d" = @{ driver = "dimmer_switch_3gang_ac"; product = "TS0601"; type = "2 Gang Dimmer" }
    
    # Power strips & plugs
    "_TZ3000_vzopcetz" = @{ driver = "extension_plug_ac"; product = "TS011F"; type = "3 Socket Strip (Silvercrest)" }
    "_TZ3000_1obwwnmq" = @{ driver = "extension_plug_ac"; product = "TS011F"; type = "3 Socket Strip (Silvercrest)" }
    "_TZ3000_4uf3d0ax" = @{ driver = "extension_plug_ac"; product = "TS011F"; type = "3 Socket Strip (Silvercrest)" }
    "_TZ3000_wzauvbcs" = @{ driver = "extension_plug_ac"; product = "TS011F"; type = "3 Socket Strip (Silvercrest)" }
    "_TZ3000_vmpbygs5" = @{ driver = "extension_plug_ac"; product = "TS011F"; type = "3 Socket Strip (Silvercrest)" }
    
    # Switch modules (2 gang)
    "_TZ3000_4js9lo5d" = @{ driver = "switch_module_2gang_ac"; product = "TS0012"; type = "2 Gang Module" }
    "_TZ3000_fisb3ajo" = @{ driver = "switch_module_2gang_ac"; product = "TS0002"; type = "2 Gang Module" }
    "_TZ3000_bvrlqyj7" = @{ driver = "switch_module_2gang_ac"; product = "TS0002"; type = "2 Gang Module" }
    "_TZ3000_jl7qyupf" = @{ driver = "switch_module_2gang_ac"; product = "TS0013"; type = "2 Gang Module" }
    "_TZ3000_7ed9cqgi" = @{ driver = "switch_module_2gang_ac"; product = "TS0002"; type = "2 Gang Module" }
    "_TZ3000_18ejxno0" = @{ driver = "switch_module_2gang_ac"; product = "TS0012"; type = "2 Gang Module" }
    "_TZ3000_llfaquvp" = @{ driver = "switch_module_2gang_ac"; product = "TS0012"; type = "2 Gang Module" }
    "_TZ3000_lmlsduws" = @{ driver = "switch_module_2gang_ac"; product = "TS0002"; type = "2 Gang Module" }
    "_TZ3000_qaa59zqd" = @{ driver = "switch_module_2gang_ac"; product = "TS0002"; type = "2 Gang Module" }
    "_TZ3000_zmy4lslw" = @{ driver = "switch_module_2gang_metering_ac"; product = "TS0002"; type = "2 Gang with metering" }
    "_TZ3000_pmz6mjyu" = @{ driver = "switch_module_2gang_metering_ac"; product = "TS011F"; type = "2 Gang with metering" }
    
    # Switch modules (3 gang)
    "_TZ3000_odzoiovu" = @{ driver = "switch_module_3gang_ac"; product = "TS0003"; type = "3 Gang Module" }
    "_TZ3000_lvhy15ix" = @{ driver = "switch_module_3gang_ac"; product = "TS0003"; type = "3 Gang Module" }
    
    # Curtain motors
    "_TZ3210_dwytrmda" = @{ driver = "curtain_motor_ac"; product = "TS130F"; type = "Curtain Module (GIRIER)" }
    "_TZ3210_ol1uhvza" = @{ driver = "curtain_motor_ac"; product = "TS130F"; type = "Curtain Module (Lonsonho)" }
    "_TZ3210_eymunffl" = @{ driver = "garage_door_controller_ac"; product = "TS0101"; type = "Irrigation Controller (Woox)" }
    
    # LED specific
    "_TZ3210_r0xgkft5" = @{ driver = "bulb_color_rgbcct_ac"; product = "TS0505B"; type = "RGB Mood Light (LIVARNO)" }
    "_TZ3210_iystcadi" = @{ driver = "bulb_color_rgbcct_ac"; product = "TS0505B"; type = "RGB Light Bar (LIVARNO)" }
    "_TZ3210_mja6r5ix" = @{ driver = "bulb_color_rgbcct_ac"; product = "TS0505B"; type = "RGB Bulb" }
    "_TZ3210_k1pe6ibm" = @{ driver = "led_strip_controller_ac"; product = "TS0505B"; type = "RGB LED Controller" }
    "_TZ3210_x13bu7za" = @{ driver = "ceiling_light_rgb_ac"; product = "TS0505B"; type = "RGB Ceiling (LIVARNO)" }
    "_TZ3210_invesber" = @{ driver = "led_strip_controller_ac"; product = "TS0502B"; type = "Dimmable LED Strip" }
    "_TZ3210_zdrhqmo0" = @{ driver = "bulb_white_ac"; product = "TS0502B"; type = "Dimmable Recessed LED" }
    "_TZ3210_ncw88jfq" = @{ driver = "temperature_humidity_sensor_battery"; product = "TY0201"; type = "LCD Temp Sensor" }
    "_TZ3210_7jnk7l3k" = @{ driver = "smart_plug_energy_ac"; product = "TS011F"; type = "Double Power Point" }
    
    # Radar & sensors
    "_TZE200_yvx5lh6k" = @{ driver = "air_quality_monitor_ac"; product = "TS0601"; type = "Air Detection Box" }
    "_TZE200_mja3fuja" = @{ driver = "air_quality_monitor_ac"; product = "TS0601"; type = "Air Detection Box" }
    "_TZE200_c2fmom5z" = @{ driver = "air_quality_monitor_ac"; product = "TS0601"; type = "Air Detection Box" }
    "_TZE200_sgpeacqp" = @{ driver = "motion_sensor_mmwave_battery"; product = "TS0601"; type = "Radar Sensor" }
    "_TZE200_wukb7rhc" = @{ driver = "motion_sensor_mmwave_battery"; product = "TS0601"; type = "Radar Sensor" }
    "_TZE200_xpq2rzhq" = @{ driver = "motion_sensor_mmwave_battery"; product = "TS0601"; type = "Radar Sensor" }
    "_TZE200_holel4dk" = @{ driver = "motion_sensor_mmwave_battery"; product = "TS0601"; type = "Radar Sensor" }
    "_TZE200_jva8ink8" = @{ driver = "motion_sensor_mmwave_battery"; product = "TS0601"; type = "Radar Sensor" }
    "_TZE200_lyetpprm" = @{ driver = "motion_sensor_mmwave_battery"; product = "TS0601"; type = "Radar Sensor" }
    "_TZE200_ikvncluo" = @{ driver = "motion_sensor_mmwave_battery"; product = "TS0601"; type = "Radar Sensor" }
    "_TZE204_qasjif9e" = @{ driver = "motion_sensor_mmwave_battery"; product = "TS0601"; type = "Radar Sensor" }
    "_TZE204_ijxvkhd0" = @{ driver = "motion_sensor_mmwave_battery"; product = "TS0601"; type = "Radar Sensor" }
    "_TZE204_sxm7l9xa" = @{ driver = "motion_sensor_mmwave_battery"; product = "TS0601"; type = "Radar Sensor" }
    "_TZE204_xsm7l9xa" = @{ driver = "motion_sensor_mmwave_battery"; product = "TS0601"; type = "Radar Sensor" }
    
    # Christmas / special
    "_TZE200_s8gkrkxk" = @{ driver = "led_strip_outdoor_color_ac"; product = "TS0601"; type = "Christmas Tree Lights (Melinera)" }
    
    # Soil humidity
    "_TZE204_myd45weu" = @{ driver = "soil_humidity_sensor_battery"; product = "TS0601"; type = "Soil Humidity Sensor (GiEX)" }
    
    # Thermostats
    "_TZE204_aoclfnxz" = @{ driver = "thermostat_ac"; product = "TS0601"; type = "Wall Thermostat" }
    
    # Curtain variants (TZE204)
    "_TZE204_1fuxihti" = @{ driver = "curtain_motor_ac"; product = "TS0601"; type = "Curtain Motor" }
}

Write-Host "📊 RÉSUMÉ DES MANUFACTURER IDs MANQUANTS" -ForegroundColor Cyan
Write-Host "=" * 80

$totalMissing = 0
foreach ($prefix in $missingIds.Keys | Sort-Object) {
    $count = $missingIds[$prefix].Count
    $totalMissing += $count
    Write-Host ("{0,-12} : {1,3} IDs manquants" -f $prefix, $count)
}

Write-Host "`nTOTAL: $totalMissing manufacturer IDs à ajouter`n"

Write-Host "🔧 MAPPINGS CONNUS PRÊTS À APPLIQUER" -ForegroundColor Green
Write-Host "=" * 80
Write-Host "$($knownMappings.Count) manufacturer IDs avec driver mappé confirmé`n"

# Grouper par driver pour application
$byDriver = @{}
foreach ($mfrId in $knownMappings.Keys) {
    $driverName = $knownMappings[$mfrId].driver
    if (-not $byDriver.ContainsKey($driverName)) {
        $byDriver[$driverName] = @()
    }
    $byDriver[$driverName] += @{
        id = $mfrId
        product = $knownMappings[$mfrId].product
        type = $knownMappings[$mfrId].type
    }
}

foreach ($driver in $byDriver.Keys | Sort-Object) {
    $count = $byDriver[$driver].Count
    Write-Host "$driver : $count IDs" -ForegroundColor Yellow
    foreach ($item in $byDriver[$driver] | Sort-Object { $_.id }) {
        Write-Host ("  ✓ {0,-25} ({1}) - {2}" -f $item.id, $item.product, $item.type) -ForegroundColor Gray
    }
}

Write-Host "`n💡 PROCHAINE ACTION" -ForegroundColor Magenta
Write-Host "=" * 80
Write-Host "Voulez-vous que je génère un script pour appliquer automatiquement"
Write-Host "ces $($knownMappings.Count) manufacturer IDs aux drivers appropriés?"
Write-Host "`nCela ajoutera les IDs aux fichiers driver.compose.json de manière automatique."
