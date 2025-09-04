#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:39.449Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

$content = fs.readFileSync "app.json" -Raw; $app = $content | ConvertFrom-Json; $count = 0; foreach($driver in $app.drivers) { if($driver.zigbee.endpoints."1".clusters) { $driver.zigbee.endpoints."1".clusters = $driver.zigbee.endpoints."1".clusters | // ForEach-Object equivalent { if($_ -eq "genBasic") { 0 } elseif($_ -eq "genPowerCfg") { 1 } elseif($_ -eq "genOnOff") { 6 } elseif($_ -eq "genLevelCtrl") { 8 } elseif($_ -eq "genScenes") { 5 } elseif($_ -eq "genGroups") { 4 } elseif($_ -eq "genAlarms") { 9 } elseif($_ -eq "genTime") { 10 } elseif($_ -eq "genElectricalMeasurement") { 2820 } elseif($_ -eq "genMetering") { 1794 } elseif($_ -eq "genTemperatureMeasurement") { 1026 } elseif($_ -eq "genHumidityMeasurement") { 1029 } elseif($_ -eq "genOccupancySensing") { 1030 } elseif($_ -eq "genColorCtrl") { 768 } elseif($_ -eq "genFanControl") { 514 } elseif($_ -eq "genDoorLock") { 257 } elseif($_ -eq "genThermostat") { 513 } elseif($_ -eq "genWindowCovering") { 258 } else { $_ } }; $count++ } }; $app | ConvertTo-Json -Depth 10 | fs.writeFileSync "app.json"; console.log "Converted $count drivers"
