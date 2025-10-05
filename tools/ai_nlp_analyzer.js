"use strict";
const fs = require("fs");
const path = require("path");

function arg(name, def){ const i = process.argv.indexOf(name); return (i>=0 && i+1<process.argv.length) ? process.argv[i+1] : def; }
function exists(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
function ensureDir(p){ if (!exists(p)) fs.mkdirSync(p, { recursive: true }); }

const ROOT = process.cwd();
const FORUM_FILE = path.join(ROOT, "tools", "forum_data.txt");
const REPORT = path.join(ROOT, "project-data", "ai_nlp_analyzer_v38.json");

const topics = (arg("--topics", "").split(/[,\s]+/).filter(Boolean).map(s=>s.toLowerCase()));
const sources = (arg("--source-forums", FORUM_FILE));

function tokenize(text){
  // very simple NLP-ish extraction tailored to our domain
  const ids = Array.from(text.matchAll(/_(?:TZ|TZE)\d{3,4}_[A-Za-z0-9_\-]+/g)).map(m=>m[0]);
  const productIds = Array.from(text.matchAll(/\bTS\d{3,5}[A-Z]?\b/ig)).map(m=>m[0].toUpperCase());
  const clusters = Array.from(text.matchAll(/\b(?:61184|768|1026|1029|6|8|0|1|3|4|5|12\d{2})\b/g)).map(m=>Number(m[0]));
  const dps = Array.from(text.matchAll(/\b(?:DP|datapoint|data point)\s*(\d{1,3})\b/ig)).map(m=>Number(m[1]));
  const keywords = Array.from(text.matchAll(/co2|pm2?5|tvoc|dimmer|level\s*control|ef00|tuya|fallback|binding|endpoint/ig)).map(m=>m[0].toLowerCase());
  return { ids, productIds, clusters, dps, keywords };
}

(function main(){
  ensureDir(path.dirname(REPORT));
  const out = { timestamp: new Date().toISOString(), topics, source: sources, findings: {}, notes: [] };
  let body = "";
  try {
    body = exists(sources) ? fs.readFileSync(sources, "utf8") : "";
  } catch {}
  if (!body) {
    out.notes.push("No forum data available, generated empty analysis");
    fs.writeFileSync(REPORT, JSON.stringify(out, null, 2)+"\n", "utf8");
    console.log(`AI NLP analyzer complete -> ${REPORT}`);
    return;
  }
  const t = topics.length ? topics : ["dlnraja","johanbendz","tuya","zigbee"];
  const filtered = body.split(/\r?\n/).filter(l => t.some(k => l.toLowerCase().includes(k)) ).join("\n");
  const scope = filtered || body;
  const tokens = tokenize(scope);
  out.findings = {
    uniqueManufacturerNames: Array.from(new Set(tokens.ids)).sort(),
    uniqueProductIds: Array.from(new Set(tokens.productIds)).sort(),
    clusters: Array.from(new Set(tokens.clusters)).sort((a,b)=>a-b),
    dps: Array.from(new Set(tokens.dps)).sort((a,b)=>a-b),
    keywords: Array.from(new Set(tokens.keywords)).sort()
  };
  fs.writeFileSync(REPORT, JSON.stringify(out, null, 2)+"\n", "utf8");
  console.log(`AI NLP analyzer complete -> ${REPORT}`);
})();
