"use strict";
const { execSync } = require("child_process");
try {
  execSync("homey app compose", { stdio: "inherit" });
  console.log("homey app compose: OK");
} catch (e) {
  console.error("homey app compose failed:", e.message);
  process.exit(1);
}
