#!/usr/bin/env node
import { spawnSync } from "child_process";
const opts = { stdio: "inherit", env: { ...process.env, CI: "1", NO_COLOR: "1", TERM: "dumb" } };
function run(cmd, args) { const r = spawnSync(cmd, args, opts); if (r.status !== 0) process.exit(r.status); }
run("node", ["tools/harvest/github-simple.js"]);
run("node", ["tools/harvest/forums-simple.js"]);
console.log("::END::HARVEST_SIMPLE::OK");
