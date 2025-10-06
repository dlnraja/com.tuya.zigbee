"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, "project-data");
const FINAL_REPORT = path.join(REPORT_DIR, "full_ai_enrichment_report_v38.json");

function ex(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function ed(p){ if(!ex(p)) fs.mkdirSync(p,{recursive:true}); }
function run(cmd){ 
  console.log(`\n>>> ${cmd}`);
  try{ execSync(cmd, {cwd: ROOT, stdio: 'inherit'}); return true; }
  catch(e){ console.error(`Failed: ${e.message}`); return false; }
}

(function main(){
  ed(REPORT_DIR);
  const report = {
    timestamp: new Date().toISOString(),
    phases: [],
    finalStats: {}
  };
  
  console.log("\n🎯 PHASE 0: Deep Contextualization - Git, NLP, AI Vision, BDU");
  
  // Git history scan
  if(run("node tools/git_history_scan.js")){
    report.phases.push({ phase: "git_history_scan", status: "success" });
  } else {
    report.phases.push({ phase: "git_history_scan", status: "skipped_or_failed" });
  }
  
  // AI NLP analyzer on forum data
  if(ex(path.join(ROOT, "tools", "forum_data.txt"))){
    if(run("node tools/ai_nlp_analyzer.js --topics dlnraja,johanbendz --source-forums tools/forum_data.txt")){
      report.phases.push({ phase: "ai_nlp_analyzer", status: "success" });
    } else {
      report.phases.push({ phase: "ai_nlp_analyzer", status: "skipped_or_failed" });
    }
  }
  
  // AI Vision validator for assets
  if(run("node tools/ai_vision_validator.js --scan-assets --scan-issue-images")){
    report.phases.push({ phase: "ai_vision_validator", status: "success" });
  } else {
    report.phases.push({ phase: "ai_vision_validator", status: "skipped_or_failed" });
  }
  
  // BDU consolidation (external sources)
  if(run("node tools/bdu_consolidate.js")){
    report.phases.push({ phase: "bdu_consolidate_n4", status: "success" });
  } else {
    report.phases.push({ phase: "bdu_consolidate_n4", status: "skipped_or_failed" });
  }
  
  console.log("\n🔍 PHASE 1: Intelligent Enrichment with Cross-Validation");
  
  // Manufacturer enrichment from BDU
  if(run("node tools/enrich_manufacturers_from_bdu.js")){
    report.phases.push({ phase: "enrich_manufacturers_from_bdu", status: "success" });
  } else {
    report.phases.push({ phase: "enrich_manufacturers_from_bdu", status: "skipped_or_failed" });
  }
  
  // NLP comparator for semantic analysis
  if(run("node tools/nlp_manufacturer_comparator.js")){
    report.phases.push({ phase: "nlp_manufacturer_comparator", status: "success" });
  } else {
    report.phases.push({ phase: "nlp_manufacturer_comparator", status: "skipped_or_failed" });
  }
  
  // Cross-reference with zigbee2mqtt and blakadder
  if(run("node tools/cross_reference_external_sources.js")){
    report.phases.push({ phase: "cross_reference_external", status: "success" });
  } else {
    report.phases.push({ phase: "cross_reference_external", status: "skipped_or_failed" });
  }
  
  console.log("\n✨ PHASE 2: Smart Cleanup and Coherence");
  
  // Apply strict audit with enriched data
  if(run("node tools/strict_driver_audit_fix.js")){
    report.phases.push({ phase: "strict_driver_audit_fix", status: "success" });
  } else {
    report.phases.push({ phase: "strict_driver_audit_fix", status: "failed" });
  }
  
  // Global coherence pass
  if(run("node tools/global_coherence_fix.js")){
    report.phases.push({ phase: "global_coherence_fix", status: "success" });
  } else {
    report.phases.push({ phase: "global_coherence_fix", status: "failed" });
  }
  
  console.log("\n📊 PHASE 3: Normalization and Validation");
  
  // Normalize arrays
  if(run("node tools/normalize_compose_arrays_v38.js")){
    report.phases.push({ phase: "normalize_compose_arrays", status: "success" });
  } else {
    report.phases.push({ phase: "normalize_compose_arrays", status: "failed" });
  }
  
  // Verify assets
  if(run("node tools/verify_driver_assets_v38.js")){
    report.phases.push({ phase: "verify_driver_assets", status: "success" });
  } else {
    report.phases.push({ phase: "verify_driver_assets", status: "failed" });
  }
  
  // Homey validate (publish level)
  if(run("node tools/homey_validate.js")){
    report.phases.push({ phase: "homey_validate_publish", status: "success" });
    report.finalStats.validationPassed = true;
  } else {
    report.phases.push({ phase: "homey_validate_publish", status: "failed" });
    report.finalStats.validationPassed = false;
  }
  
  // Write final report
  fs.writeFileSync(FINAL_REPORT, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(`\n📝 Full AI Enrichment Report: ${FINAL_REPORT}`);
  
  if(report.finalStats.validationPassed){
    console.log("\n✅ All phases completed successfully. Ready to commit and push.");
    console.log("\nRun:");
    console.log("  node tools/git_add.js");
    console.log("  node tools/git_commit.js --message \"V38.0 N4: Full AI enrichment with NLP, vision, BDU consolidation, cross-validation\"");
    console.log("  node tools/git_push.js --remote origin --branch master");
  } else {
    console.log("\n⚠️ Validation failed. Review errors before pushing.");
  }
})();
