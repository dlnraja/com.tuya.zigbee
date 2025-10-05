"use strict";
const { execSync } = require("child_process");
try {
  execSync("git add -A", { stdio: "inherit" });
  console.log("git add -A: OK");
} catch (e) {
  console.error("git add failed:", e.message);
  process.exit(1);
}
