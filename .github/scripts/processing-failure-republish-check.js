#!/usr/bin/env node
"use strict";

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
const TRANSIENT_RE = /socket hang up|econnreset|econnaborted|etimedout|fetch failed|network|timeout|temporar|502|503|504/i;

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
    publishDecision({
      triggerPublish: false,
      requiresBump: false,
      transient: false,
      reason: "Dashboard report missing; publish recovery disabled.",
      changelog: "Stability improvements and Homey test publication retry.",
    });
    return;
  }

  const report = readJson(REPORT_PATH);
  const ts = Date.parse(report.timestamp || "");
  if (!Number.isFinite(ts) || Date.now() - ts > maxAgeMs) {
    publishDecision({
      triggerPublish: false,
      requiresBump: false,
      transient: false,
      reason: `Dashboard report stale or invalid (${report.timestamp || "missing"}).`,
      changelog: "Stability improvements and Homey test publication retry.",
    });
    return;
  }

  const latest = report.latestBuild || (Array.isArray(report.latestBuilds) ? report.latestBuilds[0] : null);
  if (!latest) {
    publishDecision({
      triggerPublish: false,
      requiresBump: false,
      transient: false,
      reason: "No builds found in the dashboard report.",
      changelog: "Stability improvements and Homey test publication retry.",
    });
    return;
  }

  const latestState = String(latest.state || "");
  const latestVersion = String(latest.version || "");
  const latestDetail = normalizeText(
    latest.failureDetail || latest.stateMeta || latest.error || latest.errorMessage || report.currentStatus?.latestFailureDetail,
  );
  const failed = FAILED_STATES.has(latestState);
  const currentVersion = !latestVersion || latestVersion === appVersion;
  const transient = TRANSIENT_RE.test(latestDetail);

  if (!failed) {
    publishDecision({
      triggerPublish: false,
      requiresBump: false,
      transient: false,
      latestState,
      latestVersion,
      latestDetail,
      reason: "Latest Athom build is not failed.",
      changelog: "Stability improvements and Homey test publication retry.",
    });
    return;
  }

  if (!currentVersion) {
    publishDecision({
      triggerPublish: false,
      requiresBump: false,
      transient,
      latestState,
      latestVersion,
      latestDetail,
      reason: `Latest failed build v${latestVersion} does not match app.json v${appVersion}; avoiding stale republish.`,
      changelog: "Stability improvements and Homey test publication retry.",
    });
    return;
  }

  publishDecision({
    triggerPublish: true,
    requiresBump: true,
    transient,
    latestState,
    latestVersion,
    latestDetail,
    reason: transient
      ? "Latest Athom build failed with a transient processor/network error; bumping patch before republish."
      : "Latest Athom build failed for the current version; bumping patch before recovery publish.",
    changelog: transient
      ? "Stability improvements and Homey test publication retry after transient processing failure."
      : "Stability improvements and Homey test build recovery.",
  });
}

main();
