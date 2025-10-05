"use strict";
const { execSync } = require("child_process");
try {
  execSync("npm install", { stdio: "inherit" });
  console.log("npm install: OK");
} catch (e) {
  console.error("npm install failed:", e.message);
  process.exit(1);
}
