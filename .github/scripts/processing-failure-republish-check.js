#!/usr/bin/env node
"use strict";

/**
 * Decide whether Auto-Fix should bump+republish after Athom processing_failed.
 *
 * P139: Transient Athom processor/network errors (socket hang up, ECONNRESET,
 * 502/503/504) are NOT fixed by bumping patch versions in a loop. When the
 * shared App ID already has a healthy Test build, refuse recovery publish so
 * Test stays on the last good version (e.g. 9.0.524 while 525/526 fail).
 */

const fs = require("fs");
const path = require("path");

let privacy = null;
try {
  privacy = require("./privacy-redactor");
} catch {
  privacy = {
    redact: (value) => String(value || ""),
  };
}

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, ".github", "state", "dashboard-monitor-report.json");
const FAILED_STATES = new Set(["processing_failed", "error", "failed", "revoked"]);
const TRANSIENT_RE = /socket hang up|econnreset|econnaborted|etimedout|timeout after|fetch failed|network|timeout|temporar|502|503|504/i;
const HEALTHY_TEST_STATES = new Set(["test"]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function clean(value, max = 240) {
  return privacy.redact(String(value || "")).replace(/[\r\n]+/g, " ").slice(0, max);
}

function normalizeText(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (typeof value !== "object") return String(value);
  for (const key of ["message", "error", "reason", "detail", "details", "description", "statusText"]) {
    if (value[key]) return normalizeText(value[key]);
  }
  try {
    const json = JSON.stringify(value);
    return json === "{}" ? "" : json;
  } catch {
    return String(value);
  }
}

function append(file, line) {
  if (file) fs.appendFileSync(file, `${line}\n`, "utf8");
}

function setOutput(name, value) {
  append(process.env.GITHUB_OUTPUT, `${name}=${clean(value, 1000)}`);
}

function setEnv(name, value) {
  append(process.env.GITHUB_ENV, `${name}=${clean(value, 1000)}`);
}

function listBuilds(report) {
  if (Array.isArray(report.latestBuilds) && report.latestBuilds.length) return report.latestBuilds;
  if (report.latestBuild) return [report.latestBuild];
  return [];
}

function findHealthyTest(report) {
  return listBuilds(report).find((b) => HEALTHY_TEST_STATES.has(String(b?.state || "")));
}

function decidePublishRecovery({ appVersion, report, now = Date.now(), maxAgeMs = 30 * 60 * 1000 }) {
  const changelogDefault = "Stability improvements and Homey test publication retry.";

  if (!report || typeof report !== "object") {
    return {
      triggerPublish: false,
      requiresBump: false,
      transient: false,
      reason: "Dashboard report missing; publish recovery disabled.",
      changelog: changelogDefault,
    };
  }

  const ts = Date.parse(report.timestamp || "");
  if (!Number.isFinite(ts) || now - ts > maxAgeMs) {
    return {
      triggerPublish: false,
      requiresBump: false,
      transient: false,
      reason: `Dashboard report stale or invalid (${report.timestamp || "missing"}).`,
      changelog: changelogDefault,
    };
  }

  const builds = listBuilds(report);
  const latest = report.latestBuild || builds[0] || null;
  if (!latest) {
    return {
      triggerPublish: false,
      requiresBump: false,
      transient: false,
      reason: "No builds found in the dashboard report.",
      changelog: changelogDefault,
    };
  }

  const latestState = String(latest.state || "");
  const latestVersion = String(latest.version || "");
  const latestDetail = normalizeText(
    latest.failureDetail || latest.stateMeta || latest.error || latest.errorMessage || report.currentStatus?.latestFailureDetail,
  );
  const failed = FAILED_STATES.has(latestState);
  const currentVersion = !latestVersion || latestVersion === String(appVersion || "");
  const transient = TRANSIENT_RE.test(latestDetail);
  const healthyTest = findHealthyTest(report);

  if (!failed) {
    return {
      triggerPublish: false,
      requiresBump: false,
      transient: false,
      latestState,
      latestVersion,
      latestDetail,
      reason: "Latest Athom build is not failed.",
      changelog: changelogDefault,
    };
  }

  // P139: shared App ID — if Test already has a healthy build, Athom transient
  // processor errors must NOT trigger bump→republish loops (525/526 socket hang up
  // while Test stayed on 524). Republishing only adds more failed drafts.
  if (transient && healthyTest) {
    return {
      triggerPublish: false,
      requiresBump: false,
      transient: true,
      latestState,
      latestVersion,
      latestDetail,
      reason: `Athom transient ${latestState} (${latestDetail || "network/processor"}) for v${latestVersion || "?"}, but Test already has healthy v${healthyTest.version} (#${healthyTest.id || "?"}). Refusing republish loop (shared App ID).`,
      changelog: changelogDefault,
    };
  }

  if (transient && !healthyTest) {
    // Still refuse automatic bump spam: without a healthy Test signal, wait for
    // a human / scheduled single self-heal rather than Auto-Fix every push.
    return {
      triggerPublish: false,
      requiresBump: false,
      transient: true,
      latestState,
      latestVersion,
      latestDetail,
      reason: `Athom transient ${latestState} (${latestDetail || "network/processor"}) — not fixable by patch bump. Skip Auto-Fix republish; wait for Athom or a single manual publish.`,
      changelog: changelogDefault,
    };
  }

  if (!currentVersion) {
    return {
      triggerPublish: false,
      requiresBump: false,
      transient,
      latestState,
      latestVersion,
      latestDetail,
      reason: `Latest failed build v${latestVersion} does not match app.json v${appVersion}; avoiding stale republish.`,
      changelog: changelogDefault,
    };
  }

  // Non-transient failure for the current version — allow one recovery bump.
  return {
    triggerPublish: true,
    requiresBump: true,
    transient: false,
    latestState,
    latestVersion,
    latestDetail,
    reason: "Latest Athom build failed for the current version (non-transient); bumping patch before recovery publish.",
    changelog: "Stability improvements and Homey test build recovery.",
  };
}

function publishDecision(decision) {
  const entries = {
    trigger_publish: decision.triggerPublish ? "true" : "false",
    requires_bump: decision.requiresBump ? "true" : "false",
    transient: decision.transient ? "true" : "false",
    latest_state: decision.latestState || "",
    latest_version: decision.latestVersion || "",
    latest_detail: decision.latestDetail || "",
    reason: decision.reason || "",
    changelog: decision.changelog || "",
  };

  for (const [key, value] of Object.entries(entries)) {
    setOutput(key, value);
  }

  setEnv("trigger_publish", entries.trigger_publish);
  setEnv("publish_recovery_requires_bump", entries.requires_bump);
  setEnv("publish_recovery_transient", entries.transient);
  setEnv("publish_recovery_latest_state", entries.latest_state);
  setEnv("publish_recovery_latest_version", entries.latest_version);
  setEnv("publish_recovery_detail", entries.latest_detail);
  setEnv("publish_recovery_reason", entries.reason);
  setEnv("publish_recovery_changelog", entries.changelog);

  console.log(`trigger_publish=${entries.trigger_publish}`);
  console.log(`requires_bump=${entries.requires_bump}`);
  console.log(`transient=${entries.transient}`);
  console.log(`latest=${entries.latest_version || "unknown"} ${entries.latest_state || "unknown"}`);
  if (entries.latest_detail) console.log(`detail=${entries.latest_detail}`);
  console.log(`reason=${entries.reason}`);
}

function main() {
  const app = readJson(path.join(ROOT, "app.json"));
  const appVersion = String(app.version || "");
  const parsedMaxAge = parseInt(process.env.DASHBOARD_REPORT_MAX_AGE_MS, 10);
  const maxAgeMs = Number.isFinite(parsedMaxAge) && parsedMaxAge >= 0 ? parsedMaxAge : 30 * 60 * 1000;

  if (!fs.existsSync(REPORT_PATH)) {
    publishDecision(decidePublishRecovery({ appVersion, report: null }));
    return;
  }

  const report = readJson(REPORT_PATH);
  publishDecision(decidePublishRecovery({ appVersion, report, maxAgeMs }));
}

if (require.main === module) {
  main();
}

module.exports = {
  decidePublishRecovery,
  findHealthyTest,
  TRANSIENT_RE,
  FAILED_STATES,
};
