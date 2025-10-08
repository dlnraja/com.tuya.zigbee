"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();
const EXT = path.join(ROOT, ".external_sources");
const REPORT = path.join(ROOT, "project-data", "ai_nlp_global_sources_report.json");

function ex(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
function ed(p){ if(!ex(p)) fs.mkdirSync(p,{recursive:true}); }

function argvToMap(){
  const m = new Map();
  for (const a of process.argv.slice(2)){
    const [k,v] = a.split("=");
    if(k && v) m.set(k.replace(/^--/, ''), v);
  }
  return m;
}

(function main(){
  ed(path.dirname(REPORT));
  const args = argvToMap();
  const protocols = (args.get("protocols") || "SmartThings,Enki,Home Assistant,zigbee-herdsman").split(/[,;]+/).map(s=>s.trim());
  const languages = (args.get("languages") || "en,fr,de,es,it,nl,zh,ru,pl,ja").split(/[,;]+/).map(s=>s.trim());

  const targets = [
    { name: "ZHA (Home Assistant)", url: "https://www.home-assistant.io/integrations/zha", lang: "en" },
    { name: "Z2M Discussions", url: "https://github.com/Koenkk/zigbee2mqtt/discussions", lang: "multi" },
    { name: "SmartThings Developers", url: "https://community.smartthings.com/c/developers/drivers", lang: "en,ko" },
    { name: "deCONZ REST Plugin", url: "https://github.com/dresden-elektronik/deconz-rest-plugin", lang: "de,en" },
    { name: "Enki Leroy Merlin", url: "https://www.leroymerlin.fr/produits/marques/enki", lang: "fr" },
    { name: "Blakadder Signatures", url: "https://www.blakadder.com/zigbee-device-signatures/", lang: "en" },
    { name: "ZHA Device Handlers", url: "https://github.com/zigpy/zha-device-handlers/", lang: "en" }
  ];

  // Seed with any local external index if present
  let extIndex = {};
  if (ex(EXT)){
    const idx = path.join(EXT, "index.json");
    if (ex(idx)){
      try { extIndex = JSON.parse(fs.readFileSync(idx, "utf8")); } catch {}
    }
  }

  const queries = [];
  for (const p of protocols){
    for (const l of languages){
      queries.push({ query: `${p} Zigbee quirks clusters DPs site:github.com`, lang: l });
      queries.push({ query: `${p} Zigbee manufacturerName signatures`, lang: l });
      queries.push({ query: `${p} Zigbee tuya EF00 mapping`, lang: l });
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    inputs: { protocols, languages },
    recommendedTargets: targets,
    externalIndex: extIndex,
    queriesSuggested: queries.slice(0, 100)
  };

  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(`AI/NLP global search plan generated -> ${REPORT}`);
})();
