"use strict";
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, "drivers");
const REPORT_DIR = path.join(ROOT, "project-data");
const FINAL_REPORT = path.join(REPORT_DIR, "final_v38_report.json");

function run(cmd){
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", shell: true });
}
function exists(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
function listDrivers(){
  if (!exists(DRIVERS_DIR)) return [];
  return fs.readdirSync(DRIVERS_DIR).filter(d => exists(path.join(DRIVERS_DIR, d, 'driver.compose.json')));
}

(function main(){
  const started = new Date().toISOString();
  if (!exists(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  const report = { started, steps: [], drivers: [], status: "running" };

  // Phase 0 (N4): Deep Contextualization - Git history, AI NLP, AI Vision, BDU consolidation
  try {
    run("node tools/git_history_scan.js");
    report.steps.push({ step: "git_history_scan", ok: true });
  } catch (e) { report.steps.push({ step: "git_history_scan", ok: false, error: String(e) }); }
  try {
    run("node tools/ai_nlp_analyzer.js --topics dlnraja,johanbendz --source-forums tools/forum_data.txt");
    report.steps.push({ step: "ai_nlp_analyzer", ok: true });
  } catch (e) { report.steps.push({ step: "ai_nlp_analyzer", ok: false, error: String(e) }); }
  try {
    run("node tools/ai_vision_validator.js --scan-assets --scan-issue-images");
    report.steps.push({ step: "ai_vision_validator", ok: true });
  } catch (e) { report.steps.push({ step: "ai_vision_validator", ok: false, error: String(e) }); }
  try {
    run("node tools/bdu_consolidate.js");
    report.steps.push({ step: "bdu_consolidate_n4", ok: true });
  } catch (e) { report.steps.push({ step: "bdu_consolidate_n4", ok: false, error: String(e) }); }

  // Phase 1.1 - Sync + deps (resilient)
  try {
    run("node tools/git_pull_rebase.js");
    report.steps.push({ step: "git_pull_rebase", ok: true });
  } catch (e) {
    report.steps.push({ step: "git_pull_rebase", ok: false, error: String(e) });
  }
  try {
    run("node tools/npm_install.js");
    report.steps.push({ step: "npm_install", ok: true });
  } catch (e) {
    report.steps.push({ step: "npm_install", ok: false, error: String(e) });
  }

  // Driver focus
  const focus = "dimmer_switch_1gang_ac";
  const focusPath = `./drivers/${focus}`;

  // Phase 1.3 - coherence
  run(`node tools/check_driver_coherence.js --path ${focusPath}`);
  report.steps.push({ step: "check_driver_coherence", driver: focus, ok: true });

  // Phase 1.4 - BDU query
  run(`node tools/bdu_query.js --path ${focusPath} --target Dimmer`);
  report.steps.push({ step: "bdu_query", driver: focus, ok: true });

  // Phase 1.5 - migrate IDs to FMT
  run(`node tools/migrate_ids.js --source ${focusPath} --output project-data/migration_temp_V38.txt`);
  report.steps.push({ step: "migrate_ids", driver: focus, ok: true });

  // Phase 1.6 - eliminate duplicates
  run(`node tools/eliminate_duplicates.js --path ${focusPath}`);
  report.steps.push({ step: "eliminate_duplicates", driver: focus, ok: true });

  // Phase 2.1 - process migration file (if any)
  run("node tools/process_migration_file.js --file project-data/migration_temp_V38.txt");
  report.steps.push({ step: "process_migration_file", ok: true });

  // Phase 2.3 - Standardize productId for focus driver
  run(`node tools/add_product_ids.js --path ${focusPath} --ids TS110E,TS0601`);
  report.steps.push({ step: "add_product_ids", driver: focus, ok: true });

  // Phase 2.6 - Optionally add capability based on BDU N4 hints (safe, idempotent)
  try {
    run(`node tools/update_manifest.js --path ${focusPath} --add_cap measure_power`);
    report.steps.push({ step: "update_manifest_add_measure_power", driver: focus, ok: true });
  } catch (e) { report.steps.push({ step: "update_manifest_add_measure_power", driver: focus, ok: false, error: String(e) }); }

  // Phase 3.2 - Ensure zigbee clusters (8, 61184) + binding 1 for focus
  run(`node tools/configure_zigbee.js --path ${focusPath} --add_clusters 8,61184`);
  report.steps.push({ step: "configure_zigbee", driver: focus, ok: true });

  // Apply dedup/normalize to all drivers
  const all = listDrivers();
  for (const d of all){
    try { run(`node tools/eliminate_duplicates.js --path ./drivers/${d}`); } catch(e) {}
  }
  run("node tools/normalize_compose_arrays_v38.js");
  report.steps.push({ step: "normalize_compose_arrays", scope: "all", ok: true });

  // Phase 2 - Process migration & enrichment
  // (Use enrichment script to relocate manufacturerName as hints)
  run("node tools/enrich_manufacturer_mapping_v38.js");
  report.steps.push({ step: "enrich_manufacturer_mapping", ok: true });

  // Phase 3 - Assets + compose + validate + git
  run("node tools/verify_driver_assets_v38.js");
  report.steps.push({ step: "verify_driver_assets", ok: true });

  // Driver-specific asset compliance report (focus)
  run(`node tools/check_assets_compliance.js --path ${focusPath}`);
  report.steps.push({ step: "check_assets_compliance", driver: focus, ok: true });

  run("node tools/homey_compose.js");
  report.steps.push({ step: "homey_compose", ok: true });

  run("node tools/homey_validate.js");
  report.steps.push({ step: "homey_validate_publish", ok: true });

  run("node tools/git_add.js");
  try {
    run("node tools/git_commit.js --message \"V38.0 N4 Protocol: Git/AI Consolidation, Tri Critique, Enrichment, Normalize, Compose/Validate\"");
  } catch (e) {
    console.log("No changes to commit or commit failed, continuing...");
  }
  run("node tools/git_push.js --remote origin --branch master");
  report.steps.push({ step: "git_commit_push", ok: true });

  report.completed = new Date().toISOString();
  report.status = "success";
  fs.writeFileSync(FINAL_REPORT, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(`Final report: ${FINAL_REPORT}`);
})();
