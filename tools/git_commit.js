"use strict";
const { execSync } = require("child_process");
function arg(name, def){ const i = process.argv.indexOf(name); return (i>=0 && i+1<process.argv.length) ? process.argv[i+1] : def; }
const message = arg("--message", "V38: automated commit");
try {
  execSync(`git commit -m ${JSON.stringify(message)}`, { stdio: "inherit", shell: true });
  console.log("git commit: OK");
} catch (e) {
  console.error("git commit failed:", e.message);
  process.exit(1);
}
