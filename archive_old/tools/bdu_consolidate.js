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
const OUT_N4 = path.join(REF, "BDU_v38_n4.json");
const OUT_N5 = path.join(REF, "BDU_v38_n5.json");
const CGL_OUT = path.join(REF, "CGL_catalogue_links.txt");
const BASE = path.join(REF, "BDU_v38.json");

const GH = path.join(PD, "git_history_scan_v38.json");
const NLP = path.join(PD, "ai_nlp_analyzer_v38.json");
const NLP_GLOBAL = path.join(PD, "ai_nlp_global_sources_report.json");
const VIS = path.join(PD, "ai_vision_validator_v38.json");
const ADDON_FETCH = path.join(PD, "addon_enrichment_report.json");
const ADDON_INTEG = path.join(PD, "addon_integration_report.json");
const ECO_REPORT = path.join(PD, "ecosystem_drivers_report.json");

(function main(){
  ensureDir(REF);
  const base = exists(BASE) ? readJSON(BASE) : { version:"v38.0", overrides:[], assets:{} };
  const gh = exists(GH) ? readJSON(GH) : { summary:{} };
  const nlp = exists(NLP) ? readJSON(NLP) : { findings:{} };
  const nlpGlobal = exists(NLP_GLOBAL) ? readJSON(NLP_GLOBAL) : { recommendedTargets: [], queriesSuggested: [] };
  const vis = exists(VIS) ? readJSON(VIS) : { scans:[] };
  const addonFetch = exists(ADDON_FETCH) ? readJSON(ADDON_FETCH) : { sources:{} };
  const addonInteg = exists(ADDON_INTEG) ? readJSON(ADDON_INTEG) : { changes:[] };
  const eco = exists(ECO_REPORT) ? readJSON(ECO_REPORT) : { ecosystems: [] };

  const ids = uniq([...(gh.summary?.ids||[]), ...(nlp.findings?.uniqueManufacturerNames||[])]).sort();
  const productIds = uniq([...(gh.summary?.productIds||[]), ...(nlp.findings?.uniqueProductIds||[])]).sort();
  const clusters = uniq([...(gh.summary?.clusters||[]), ...(nlp.findings?.clusters||[])]).filter(n=>Number.isFinite(n)).sort((a,b)=>a-b);
  const dps = uniq([...(gh.summary?.dps||[]), ...(nlp.findings?.dps||[])]).filter(n=>Number.isFinite(n)).sort((a,b)=>a-b);

  const outN4 = {
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

  // N5: extend with global sources & addon reports
  const globalLinks = [];
  for(const t of (nlpGlobal.recommendedTargets||[])){
    if(t.url) globalLinks.push(`[target] ${t.name||''} ${t.url}`.trim());
  }
  for(const q of (nlpGlobal.queriesSuggested||[])){
    if(q.query) globalLinks.push(`[query:${q.lang||'multi'}] ${q.query}`);
  }

  const outN5 = {
    version: "v38.0-n5",
    inherits: "references/BDU_v38_n4.json",
    global: {
      targets: nlpGlobal.recommendedTargets || [],
      queries: nlpGlobal.queriesSuggested || []
    },
    addon: {
      fetch: addonFetch.sources || {},
      integrationChanges: addonInteg.changes || [],
      ecosystems: eco.ecosystems || []
    }
  };

  fs.writeFileSync(OUT_N4, JSON.stringify(outN4, null, 2)+"\n", 'utf8');
  console.log(`BDU N4 consolidated -> ${OUT_N4}`);
  fs.writeFileSync(OUT_N5, JSON.stringify(outN5, null, 2)+"\n", 'utf8');
  console.log(`BDU N5 consolidated -> ${OUT_N5}`);

  // Write CGL (Catalogue Global de Liens)
  if(globalLinks.length){
    fs.writeFileSync(CGL_OUT, [
      "# CGL - Catalogue Global de Liens (N5)",
      new Date().toISOString(),
      "",
      ...globalLinks
    ].join("\n")+"\n", 'utf8');
    console.log(`CGL links written -> ${CGL_OUT}`);
  } else {
    console.log("No global links found to write CGL.");
  }
})();
