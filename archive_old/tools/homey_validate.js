"use strict";
const { execSync } = require("child_process");
try {
  execSync("homey app validate --level publish", { stdio: "inherit" });
  console.log("homey app validate --level publish: OK");
} catch (e) {
  console.error("homey app validate failed:", e.message);
  process.exit(1);
}
