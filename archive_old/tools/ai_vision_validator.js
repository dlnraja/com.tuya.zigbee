"use strict";
const fs = require("fs");
const path = require("path");
function arg(name, def){ const i = process.argv.indexOf(name); return (i>=0 && i+1<process.argv.length) ? process.argv[i+1] : def; }
function exists(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
function ensureDir(p){ if (!exists(p)) fs.mkdirSync(p, { recursive: true }); }

const ROOT = process.cwd();
const REPORT = path.join(ROOT, "project-data", "ai_vision_validator_v38.json");
const SCAN_ASSETS = process.argv.includes("--scan-assets");
const SCAN_ISSUE_IMAGES = process.argv.includes("--scan-issue-images");

function listImages(dir){
  const out = [];
  if (!exists(dir)) return out;
  for (const f of fs.readdirSync(dir)){
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) out.push(...listImages(p));
    else if (/\.(png|jpg|jpeg|svg)$/i.test(f)) out.push(p);
  }
  return out;
}

(function main(){
  ensureDir(path.dirname(REPORT));
  const res = { timestamp: new Date().toISOString(), scans: [], notes: [] };
  if (SCAN_ASSETS){
    const assets = listImages(path.join(ROOT, 'assets'));
    res.scans.push({ type: 'assets', count: assets.length });
  }
  if (SCAN_ISSUE_IMAGES){
    // Placeholder: in-repo issue images or docs
    const imgs = listImages(path.join(ROOT, 'ultimate_system'));
    res.scans.push({ type: 'issues_docs', count: imgs.length });
  }
  fs.writeFileSync(REPORT, JSON.stringify(res, null, 2)+"\n", 'utf8');
  console.log(`AI Vision validator complete -> ${REPORT}`);
})();
