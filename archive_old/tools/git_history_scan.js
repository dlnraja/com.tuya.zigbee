"use strict";
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const OUT = path.join(ROOT, "project-data", "git_history_scan_v38.json");

function exists(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
function ensureDir(p){ if (!exists(p)) fs.mkdirSync(p, { recursive: true }); }

function parsePatterns(text){
  const ids = new Set();
  const ts = new Set();
  const clusters = new Set();
  const dps = new Set();
  const idRe = /_(?:TZ|TZE)\d{3,4}_[A-Za-z0-9]+/g;
  const tsRe = /TS\d{3,5}[A-Z]?/g;
  const clRe = /(?<![A-Za-z0-9_])(?:0|1|3|4|5|6|8|768|1026|1029|61184|12\d{2}|\d{1,5})(?![A-Za-z0-9_])/g;
  const dpRe = /\b(?:DP|dp|datapoint)\s*(\d{1,3})\b/g;
  let m;
  while ((m = idRe.exec(text))) ids.add(m[0]);
  while ((m = tsRe.exec(text))) ts.add(m[0].toUpperCase());
  while ((m = clRe.exec(text))) clusters.add(Number(m[0]));
  while ((m = dpRe.exec(text))) dps.add(Number(m[1]));
  return { ids: Array.from(ids), productIds: Array.from(ts), clusters: Array.from(clusters), dps: Array.from(dps) };
}

(function main(){
  ensureDir(path.dirname(OUT));
  let raw = "";
  try {
    // Custom marker for easy parsing
    raw = execSync("git log --date=iso --pretty=format:||COMMIT||%H||%ad||%an||%s --name-only", { stdio: ["ignore","pipe","pipe"], shell: true, encoding: "utf8" });
  } catch (e) {
    console.error("git log failed:", e.message);
    fs.writeFileSync(OUT, JSON.stringify({ error: e.message, history: [], summary: {} }, null, 2)+"\n");
    process.exit(0);
  }
  const chunks = raw.split("||COMMIT||").filter(Boolean);
  const history = [];
  const agg = { ids: new Set(), productIds: new Set(), clusters: new Set(), dps: new Set() };
  for (const chunk of chunks){
    const lines = chunk.split(/\r?\n/).filter(Boolean);
    if (!lines.length) continue;
    const [hash,date,author,subject] = lines[0].split("||");
    const files = lines.slice(1).filter(l => !l.includes("||"));
    const parsed = parsePatterns([subject, ...files].join("\n"));
    parsed.ids.forEach(v=>agg.ids.add(v));
    parsed.productIds.forEach(v=>agg.productIds.add(v));
    parsed.clusters.forEach(v=>agg.clusters.add(v));
    parsed.dps.forEach(v=>agg.dps.add(v));
    history.push({ hash, date, author, subject, files });
  }
  const summary = {
    ids: Array.from(agg.ids).sort(),
    productIds: Array.from(agg.productIds).sort(),
    clusters: Array.from(agg.clusters).sort((a,b)=>a-b),
    dps: Array.from(agg.dps).sort((a,b)=>a-b),
    count: history.length,
  };
  fs.writeFileSync(OUT, JSON.stringify({ history, summary }, null, 2)+"\n", "utf8");
  console.log(`Git history scan complete -> ${OUT}`);
})();
