
const fs = require("fs");
const path = require("path");

const driversDir = path.join(__dirname, "drivers");
if (!fs.existsSync(driversDir)) {
  console.error("drivers dir not found");
  process.exit(1);
}

const drivers = fs.readdirSync(driversDir);

function removeBindings(obj) {
  let changed = false;
  if (typeof obj !== "object" || obj === null) return changed;
  
  for (const key in obj) {
    if (key === "bindings") {
      delete obj[key];
      changed = true;
    } else if (typeof obj[key] === "object") {
      if (removeBindings(obj[key])) {
        changed = true;
      }
    }
  }
  return changed;
}

drivers.forEach(driver => {
  const composePath = path.join(driversDir, driver, "driver.compose.json");
  if (!fs.existsSync(composePath)) return;
  
  let content = fs.readFileSync(composePath, "utf8");
  let data;
  try {
    data = JSON.parse(content);
  } catch(e) {
    console.error("Parse error in", composePath);
    return;
  }
  
  let changed = false;

  // Remove learnmode
  if (data.learnmode !== undefined) {
    delete data.learnmode;
    changed = true;
  }

  // Remove bindings in zigbee object
  if (data.zigbee) {
    if (removeBindings(data.zigbee)) {
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(composePath, JSON.stringify(data, null, 2) + "\n");
    console.log("Updated " + driver);
  }
});

