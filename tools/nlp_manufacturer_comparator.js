"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, "drivers");
const REPORT = path.join(ROOT, "project-data", "nlp_comparator_report_v38.json");

function ex(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function dj(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function wj(p, obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8"); }
function drivers(){ return ex(DRIVERS)? fs.readdirSync(DRIVERS).filter(d=>ex(path.join(DRIVERS,d,'driver.compose.json'))):[]; }

// Semantic similarity via Levenshtein distance
function levenshtein(a, b){
  const m = a.length, n = b.length;
  const dp = Array(m+1).fill(null).map(() => Array(n+1).fill(0));
  for(let i=0; i<=m; i++) dp[i][0] = i;
  for(let j=0; j<=n; j++) dp[0][j] = j;
  for(let i=1; i<=m; i++){
    for(let j=1; j<=n; j++){
      dp[i][j] = Math.min(
        dp[i-1][j] + 1,
        dp[i][j-1] + 1,
        dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

function similarity(a, b){
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length);
  return maxLen ? 1 - (dist / maxLen) : 0;
}

(function main(){
  // Collect all manufacturerNames and find near-duplicates
  const allNames = new Map(); // name -> [folders]
  
  for(const folder of drivers()){
    const file = path.join(DRIVERS, folder, 'driver.compose.json');
    let j; try{ j = dj(file); } catch{ continue; }
    const names = (j.zigbee && Array.isArray(j.zigbee.manufacturerName)) ? j.zigbee.manufacturerName : [];
    for(const n of names){
      if(!allNames.has(n)) allNames.set(n, []);
      allNames.get(n).push(folder);
    }
  }
  
  const nameList = Array.from(allNames.keys());
  const duplicates = [];
  const threshold = 0.85;
  
  for(let i=0; i<nameList.length; i++){
    for(let j=i+1; j<nameList.length; j++){
      const sim = similarity(nameList[i], nameList[j]);
      if(sim >= threshold){
        duplicates.push({
          name1: nameList[i],
          name2: nameList[j],
          similarity: sim.toFixed(3),
          occurrences1: allNames.get(nameList[i]).length,
          occurrences2: allNames.get(nameList[j]).length
        });
      }
    }
  }
  
  const rep = {
    timestamp: new Date().toISOString(),
    totalNames: nameList.length,
    nearDuplicates: duplicates.length,
    samples: duplicates.slice(0, 50)
  };
  
  wj(REPORT, rep);
  console.log(`NLP Comparator: ${duplicates.length} near-duplicates found. Report -> ${REPORT}`);
})();
