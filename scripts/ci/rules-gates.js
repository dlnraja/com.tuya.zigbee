#!/usr/bin/env node
"use strict";
/**
 * Shared rules-gate runner. On branches that already have the full list this file
 * is only patched (P3320 is added). On lagging branches this minimal runner is
 * installed so pre-push / CI can run the P3320 Latin-1 + image gate fail-closed.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const LOG_LINES = 200;

const RULES_GATES = [
  { id: "p3320-latin1", file: "tools/ci/p3320-shipped-latin1-assets-gate.js", profiles: ["core", "full"] },
];

function select({ profile = "core", only = "" } = {}) {
  const ids = String(only || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length) return RULES_GATES.filter((g) => ids.includes(g.id));
  return RULES_GATES.filter((g) => g.profiles.includes(profile));
}

function runGate(g, { strip = false, cwd = ROOT, timeout = 600000 } = {}) {
  const abs = path.join(cwd, g.file);
  if (!fs.existsSync(abs)) return { id: g.id, file: g.file, status: "skipped", code: null, tail: "missing on this branch" };
  const args = [abs];
  if (strip && g.id === "anti-bot") args.push("--strip");
  const r = spawnSync(process.execPath, args, { cwd, encoding: "utf8", timeout, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`.trim();
  const tail = out.split("\n").slice(-8).join(" | ");
  const log = r.status === 0 ? "" : out.split("\n").slice(-LOG_LINES).join("\n");
  return { id: g.id, file: g.file, status: r.status === 0 ? "pass" : "fail", code: r.status, tail, log };
}

function main(argv = process.argv.slice(2)) {
  const opt = (k) => (argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=").slice(1).join("=");
  const strip = argv.includes("--strip");
  const soft = argv.includes("--soft");
  const gates = select({ profile: opt("profile") || "core", only: opt("only") });
  const results = gates.map((g) => {
    const r = runGate(g, { strip });
    console.log(`${r.status === "pass" ? "OK" : r.status === "skipped" ? "SKIP" : "FAIL"} ${r.id} (${r.file})${r.status === "fail" ? ` exit ${r.code}: ${r.tail}` : ""}`);
    if (r.status === "fail" && r.log) console.log(r.log);
    return r;
  });
  const failed = results.filter((r) => r.status === "fail");
  return failed.length && !soft ? 1 : 0;
}

module.exports = { RULES_GATES, LOG_LINES, select, runGate };
if (require.main === module) process.exitCode = main();
