"use strict";
const { execSync } = require("child_process");
try {
  execSync("git pull --rebase", { stdio: "inherit" });
  console.log("git pull --rebase: OK");
} catch (e) {
  console.error("git pull --rebase failed:", e.message);
  process.exit(1);
}
