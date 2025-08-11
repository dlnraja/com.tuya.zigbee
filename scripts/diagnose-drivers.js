"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, "drivers");

const args = process.argv.slice(2);
const SHOULD_FIX = args.includes("--fix");
const SHOULD_FIX_ASSETS = args.includes("--fix-assets");

function safeReadJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return { ok: true, data: JSON.parse(raw) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function createDefaultFiles(driverPath, composeData) {
  // assets
  const assetsDir = path.join(driverPath, "assets");
  ensureDir(assetsDir);
  const imagesDir = path.join(assetsDir, "images");
  ensureDir(imagesDir);

  const iconPath = path.join(assetsDir, "icon.svg");
  if (!fs.existsSync(iconPath)) {
    fs.writeFileSync(
      iconPath,
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='#0a84ff'/><text x='50' y='55' font-size='28' text-anchor='middle' fill='#fff'>${composeData?.id || "dev"}</text></svg>`
    );
  }

  const smallPath = path.join(imagesDir, "small.png");
  if (!fs.existsSync(smallPath)) {
    // placeholder b64 1x1 png
    const b64 = Buffer.from(
      "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C6360000002000154A6A6100000000049454E44AE426082",
      "hex"
    );
    fs.writeFileSync(smallPath, b64);
  }
}

function diagnose() {
  console.log("🚦 Diagnostic des drivers...");
  const report = {
    totalDrivers: 0,
    invalidJSON: [],
    missingCompose: [],
    missingDeviceJs: [],
    missingAssets: [],
    fixed: [],
  };

  function scan(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const full = path.join(dir, item);
      const st = fs.statSync(full);
      if (st.isDirectory()) {
        scan(full);
      } else if (item === "driver.compose.json") {
        report.totalDrivers++;
        const driverDir = path.dirname(full);
        const compose = safeReadJSON(full);
        if (!compose.ok) {
          report.invalidJSON.push({ path: full, error: compose.error });
          if (SHOULD_FIX) {
            try {
              // tentative de correction minimale: trim et reparse
              const raw = fs.readFileSync(full, "utf8").trim();
              JSON.parse(raw);
              fs.writeFileSync(full, raw);
              report.fixed.push({ path: full, action: "trim-json" });
            } catch (_) {}
          }
        }

        // device.js
        const deviceJs = path.join(driverDir, "device.js");
        if (!fs.existsSync(deviceJs)) {
          report.missingDeviceJs.push(driverDir);
          if (SHOULD_FIX) {
            const id = compose.ok ? compose.data.id : path.basename(driverDir);
            fs.writeFileSync(
              deviceJs,
              `"use strict";\nconst { ZigBeeDevice } = require("homey-zigbeedriver");\nclass Device extends ZigBeeDevice { async onNodeInit() { this.printNode(); } }\nmodule.exports = Device;\n`
            );
            report.fixed.push({ path: deviceJs, action: "create-device.js" });
          }
        }

        // assets
        const assetsDir = path.join(driverDir, "assets");
        const imagesDir = path.join(assetsDir, "images");
        const iconPath = path.join(assetsDir, "icon.svg");
        const smallPath = path.join(imagesDir, "small.png");

        const missing = [];
        if (!fs.existsSync(iconPath)) missing.push("icon.svg");
        if (!fs.existsSync(smallPath)) missing.push("small.png");
        if (missing.length) {
          report.missingAssets.push({ driverDir, missing });
          if (SHOULD_FIX_ASSETS || SHOULD_FIX) {
            const id = compose.ok ? compose.data.id : path.basename(driverDir);
            createDefaultFiles(driverDir, { id });
            report.fixed.push({ path: driverDir, action: "create-assets" });
          }
        }
      }
    }
  }

  if (!fs.existsSync(DRIVERS_DIR)) {
    console.log("⚠️ Dossier drivers/ introuvable");
    return report;
  }
  scan(DRIVERS_DIR);
  return report;
}

function main() {
  const report = diagnose();
  const out = path.join(ROOT, `DIAGNOSE_REPORT_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`\n📄 Rapport: ${out}`);
  console.log(`📊 Drivers: ${report.totalDrivers} | JSON invalides: ${report.invalidJSON.length} | Manques device.js: ${report.missingDeviceJs.length} | Assets manquants: ${report.missingAssets.length}`);
}

if (require.main === module) main();

module.exports = { diagnose };
