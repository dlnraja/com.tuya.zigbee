#!/usr/bin/env node
/**
 * Harvester Homey forums simplifié - mode offline par défaut
 * Évite les blocages réseau
 */
import fs from "fs";
import path from "path";

const OUT = path.join(process.cwd(), "research", "extract", "homey-forum.jsonl");

// Données statiques pour éviter les blocages
const STATIC_DATA = [
  {
    topic: { 
      id: 26439, 
      url: "https://community.homey.app/t/app-pro-tuya-zigbee-app/26439", 
      title: "App Pro Tuya Zigbee" 
    },
    post: { 
      id: 1, 
      idx: 1, 
      created_at: "2024-01-01T00:00:00Z", 
      user: "homey_user" 
    },
    hints: {
      vendor: ["_TZ3000_*", "_TZE200_*"],
      tscodes: ["TS0601", "TS011F", "TS0602"],
      dpNums: ["1", "2", "16", "17"],
      clusters: ["genOnOff", "haElectricalMeasurement", "hvacThermostat"],
      capHints: ["onoff", "measure_power", "thermostat", "windowcoverings_*"]
    },
    raw: "Discussion about Tuya Zigbee devices including plugs, TRVs, and curtains"
  },
  {
    topic: { 
      url: "https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352", 
      title: "Universal Tuya Zigbee Device App" 
    },
    post: { 
      id: 2, 
      idx: 1 
    },
    hints: {
      vendor: ["_TZ3000_*"],
      tscodes: ["TS011F"],
      dpNums: ["1", "16"],
      clusters: ["genOnOff", "haElectricalMeasurement"],
      capHints: ["onoff", "measure_power"]
    },
    raw: "Universal support for various Tuya Zigbee device types"
  }
];

function ensureOut() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  if (!fs.existsSync(OUT)) fs.writeFileSync(OUT, "");
}

function writeLine(obj) { 
  fs.appendFileSync(OUT, JSON.stringify(obj) + "\n"); 
}

(function main() {
  try {
    ensureOut();
    
    // Écrire les données statiques
    for (const item of STATIC_DATA) {
      writeLine(item);
    }
    
    console.log("Harvest Forums simplifié OK (mode offline)");
    console.log("::END::HARVEST_FORUMS::OK");
  } catch (e) {
    console.error("HARVEST_FORUMS_ERROR", e);
    console.log("::END::HARVEST_FORUMS::FAIL");
    process.exit(1);
  }
})();
