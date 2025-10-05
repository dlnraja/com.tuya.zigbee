"use strict";
const fs = require("fs");
const path = require("path");

function exists(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
function readJSON(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function uniq(a){ return Array.from(new Set(a)); }
function ensureDir(p){ if (!exists(p)) fs.mkdirSync(p, { recursive: true }); }

const ROOT = process.cwd();
const PD = path.join(ROOT, "project-data");
const REF = path.join(ROOT, "references");
const OUT = path.join(REF, "BDU_v38_n4.json");
const BASE = path.join(REF, "BDU_v38.json");

const GH = path.join(PD, "git_history_scan_v38.json");
const NLP = path.join(PD, "ai_nlp_analyzer_v38.json");
const VIS = path.join(PD, "ai_vision_validator_v38.json");

(function main(){
  ensureDir(REF);
  const base = exists(BASE) ? readJSON(BASE) : { version:"v38.0", overrides:[], assets:{} };
  const gh = exists(GH) ? readJSON(GH) : { summary:{} };
  const nlp = exists(NLP) ? readJSON(NLP) : { findings:{} };
  const vis = exists(VIS) ? readJSON(VIS) : { scans:[] };

  const ids = uniq([...(gh.summary?.ids||[]), ...(nlp.findings?.uniqueManufacturerNames||[])]).sort();
  const productIds = uniq([...(gh.summary?.productIds||[]), ...(nlp.findings?.uniqueProductIds||[])]).sort();
  const clusters = uniq([...(gh.summary?.clusters||[]), ...(nlp.findings?.clusters||[])]).filter(n=>Number.isFinite(n)).sort((a,b)=>a-b);
  const dps = uniq([...(gh.summary?.dps||[]), ...(nlp.findings?.dps||[])]).filter(n=>Number.isFinite(n)).sort((a,b)=>a-b);

  const out = {
    version: "v38.0-n4",
    basedOn: "references/BDU_v38.json",
    overrides: base.overrides || [],
    deviceCodePolicy: base.deviceCodePolicy || { numericClusterRegistration: true, removedTuyaSpecific: true },
    assets: base.assets || { requiredDriverImageSizes: { small: "75x75", large: "500x500" }},
    sources: {
      gitHistory: { count: gh.summary?.count || 0 },
      aiNlp: { topics: (nlp.topics||[]), keywords: (nlp.findings?.keywords||[]) },
      aiVision: { scans: vis.scans || [] }
    },
    n4: {
      unverified: true,
      ids, productIds, clusters, dps
    }
  };

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2)+"\n", 'utf8');
  console.log(`BDU N4 consolidated -> ${OUT}`);
})();
