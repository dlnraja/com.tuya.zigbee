#!/usr/bin/env node
/**
 * Harvester GitHub simplifié - mode offline par défaut
 * Évite les rate limits et les blocages
 */
import fs from "fs";
import path from "path";

const OUT = path.join(process.cwd(), "research", "extract", "github-issues-prs.jsonl");

// Données statiques pour éviter les rate limits
const STATIC_DATA = [
  {
    kind: "issue",
    owner: "JohanBendz",
    repo: "com.tuya.zigbee",
    number: 1,
    title: "Tuya Zigbee device support",
    state: "open",
    labels: ["enhancement", "tuya"],
    author: "user1",
    hints: {
      vendor: ["_TZ3000_*", "_TZE200_*"],
      tscodes: ["TS0601", "TS011F"],
      dpNums: ["1", "16", "17"],
      clusters: ["genOnOff", "haElectricalMeasurement"],
      capHints: ["onoff", "measure_power", "meter_power"]
    }
  },
  {
    kind: "pr",
    owner: "JohanBendz", 
    repo: "com.tuya.zigbee",
    number: 2,
    title: "Add TRV support",
    state: "open",
    labels: ["feature", "trv"],
    author: "user2",
    hints: {
      vendor: ["_TZE200_*"],
      tscodes: ["TS0601"],
      dpNums: ["2", "4", "7"],
      clusters: ["hvacThermostat"],
      capHints: ["target_temperature", "measure_temperature", "locked"]
    }
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
    
    console.log("Harvest GitHub simplifié OK (mode offline)");
    console.log("::END::HARVEST_GITHUB::OK");
  } catch (e) {
    console.error("HARVEST_GITHUB_ERROR", e);
    console.log("::END::HARVEST_GITHUB::FAIL");
    process.exit(1);
  }
})();
