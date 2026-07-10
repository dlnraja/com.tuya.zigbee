"use strict";

const fs = require("fs");

const allowedLevels = new Set(["patch", "minor", "major"]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseVersion(version) {
  const match = String(version || "").match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) {
    throw new Error(`Invalid semver version in app.json: ${version}`);
  }
  return match.slice(1).map((part) => Number(part));
}

function bumpVersion(version, level) {
  const [major, minor, patch] = parseVersion(version);
  if (level === "major") return `${major + 1}.0.0`;
  if (level === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function syncPackageVersion(file, version) {
  if (!fs.existsSync(file)) return;
  const json = readJson(file);
  json.version = version;
  if (json.packages && json.packages[""]) {
    json.packages[""].version = version;
  }
  writeJson(file, json);
}

const level = String(process.env.BUMP_LEVEL || process.argv[2] || "patch").trim().toLowerCase();
if (!allowedLevels.has(level)) {
  throw new Error(`Unsupported bump level "${level}". Expected patch, minor, or major.`);
}

const changelogText = String(
  process.env.HOMEY_CHANGELOG || process.argv.slice(3).join(" ") || "Bug fixes and improvements",
).trim();

const app = readJson("app.json");
const previousVersion = app.version;
const nextVersion = bumpVersion(previousVersion, level);
app.version = nextVersion;
writeJson("app.json", app);

if (fs.existsSync(".homeycompose/app.json")) {
  const compose = readJson(".homeycompose/app.json");
  compose.version = nextVersion;
  writeJson(".homeycompose/app.json", compose);
}

syncPackageVersion("package.json", nextVersion);
syncPackageVersion("package-lock.json", nextVersion);

if (fs.existsSync(".homeychangelog.json")) {
  const changelog = readJson(".homeychangelog.json");
  const current = changelog[nextVersion] && String(changelog[nextVersion].en || "");
  if (!current || /^y{20,}$/i.test(current) || /^v\d+\.\d+\.\d+:$/.test(current.trim())) {
    changelog[nextVersion] = { en: changelogText || `v${nextVersion}: Bug fixes and improvements.` };
    writeJson(".homeychangelog.json", changelog);
  }
}

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${nextVersion}\n`, "utf8");
}

console.log(`Bumped Homey version ${previousVersion} -> ${nextVersion} (${level})`);
