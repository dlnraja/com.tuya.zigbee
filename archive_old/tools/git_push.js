"use strict";
const { execSync } = require("child_process");
function arg(name, def){ const i = process.argv.indexOf(name); return (i>=0 && i+1<process.argv.length) ? process.argv[i+1] : def; }
const remote = arg("--remote", "origin");
const branch = arg("--branch", "master");
try {
  execSync(`git push ${remote} ${branch}`, { stdio: "inherit", shell: true });
  console.log(`git push ${remote} ${branch}: OK`);
} catch (e) {
  console.error("git push failed:", e.message);
  process.exit(1);
}
