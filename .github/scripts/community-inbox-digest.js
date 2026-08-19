#!/usr/bin/env node
"use strict";
/**
 * Community Inbox Digest (v9.0.362)
 *
 * Unified daily view of everything that needs a maintainer's attention:
 *   - Open issues (own repo) classified by who had the last word
 *     (bot / maintainer / user) and escalation labels.
 *   - Open PRs (own repo) with age.
 *   - Latest Homey forum posts without a maintainer reply
 *     (uses .github/state/forum-activity-data.json when the forum-poll
 *     workflow has populated it; section is skipped otherwise).
 *
 * Output: reports/community-inbox.md (+ stdout summary, GITHUB_STEP_SUMMARY).
 * Read-only against GitHub: never posts, never labels.
 */
const fs = require("fs");
const path = require("path");
const { fetchWithRetry } = require("./retry-helper");

const GH = "https://api.github.com";
const OWN = "dlnraja/com.tuya.zigbee";
const OWNER = OWN.split("/")[0];
const TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;
const SD = path.join(__dirname, "..", "state");
const OUT = path.join(__dirname, "..", "..", "reports", "community-inbox.md");
const BOT_RX = /\[bot]$/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hdrs = () => ({ Accept: "application/vnd.github+json", "User-Agent": "community-inbox", ...(TOKEN ? { Authorization: "Bearer " + TOKEN } : {}) });

async function ghGet(ep) {
  try {
    const r = await fetchWithRetry(GH + ep, { headers: hdrs() }, { retries: 2, label: "ghGet" });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

async function fetchOpen(type) {
  const items = [];
  for (let pg = 1; pg <= 3; pg++) {
    const d = await ghGet(`/repos/${OWN}/${type === "pr" ? "pulls" : "issues"}?state=open&per_page=50&page=${pg}`);
    if (!d || !d.length) break;
    items.push(...d);
    await sleep(500);
  }
  // PRs also appear in /issues — filter them out there
  return type === "pr" ? items : items.filter((i) => !i.pull_request);
}

function classifyCommenter(login, body) {
  if (!login) return "none";
  if (BOT_RX.test(login)) return "bot";
  if ((body || "").includes("<!-- diag-resolver -->") || (body || "").includes("<!-- tuya-reopen-bot -->")) return "bot";
  if (login === OWNER) return "owner";
  return "human";
}

async function enrichIssue(iss) {
  const labels = (iss.labels || []).map((l) => (typeof l === "string" ? l : l && l.name));
  const cmts = iss.comments > 0 ? await ghGet(`/repos/${OWN}/issues/${iss.number}/comments?per_page=100`) : [];
  const last = Array.isArray(cmts) && cmts.length ? cmts[cmts.length - 1] : null;
  const lastBy = last ? classifyCommenter(last.user && last.user.login, last.body) : (classifyCommenter(iss.user && iss.user.login, iss.body) === "owner" ? "owner" : "human");
  let status;
  if (labels.includes("needs-maintainer") || labels.includes("reopened-by-user")) status = "🔴 escaladé";
  else if (lastBy === "human") status = "🔴 attente maintainer";
  else if (lastBy === "bot") status = "🟡 auto-résolu (attente retour)";
  else if (lastBy === "owner") status = "🟢 maintainer actif";
  else status = "🔴 nouveau (aucun commentaire)";
  return { number: iss.number, title: iss.title, labels, status, updated: (iss.updated_at || "").slice(0, 10), url: iss.html_url };
}

function loadForumPosts() {
  const candidates = [
    path.join(SD, "forum-activity-data.json"),
    path.join(SD, "forum", "latest.json"),
  ];
  for (const fp of candidates) {
    try {
      const f = JSON.parse(fs.readFileSync(fp, "utf8"));
      const posts = f.recentPosts || f.posts || [];
      if (!Array.isArray(posts) || posts.length === 0) continue;
      // Posts from users that came AFTER the last maintainer post = unanswered
      let lastOwnerIdx = -1;
      posts.forEach((p, i) => { if (p.username === OWNER) lastOwnerIdx = i; });
      return posts.filter((p, i) => p.username !== OWNER && i > lastOwnerIdx);
    } catch { /* try next */ }
  }
  return null;
}

/** Counts only — never quote private message bodies in the committed digest. */
function loadForumPmSignals() {
  const fp = path.join(SD, "forum", "pm-inbox.json");
  try {
    const j = JSON.parse(fs.readFileSync(fp, "utf8"));
    const s = j.summary || {};
    return {
      fetched: j.fetched || 0,
      mfrs: (s.manufacturers || []).length,
      pids: (s.productIds || []).length,
      uuids: (s.diagnosticUuids || []).length,
    };
  } catch {
    return null;
  }
}

async function main() {
  console.log("Community Inbox Digest —", new Date().toISOString());
  const issues = await fetchOpen("issue");
  const prs = await fetchOpen("pr");
  const enriched = [];
  for (const iss of issues) { enriched.push(await enrichIssue(iss)); await sleep(200); }
  const forum = loadForumPosts();

  const red = enriched.filter((i) => i.status.startsWith("🔴"));
  const yellow = enriched.filter((i) => i.status.startsWith("🟡"));
  const green = enriched.filter((i) => i.status.startsWith("🟢"));

  const L = [];
  L.push("# 📥 Community Inbox — " + new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC", "");
  L.push("Généré par `.github/scripts/community-inbox-digest.js` (workflow `community-inbox.yml`).", "");
  L.push("## Résumé", "");
  L.push(`- Issues ouvertes : **${enriched.length}** — 🔴 à traiter : **${red.length}**, 🟡 attente utilisateur : ${yellow.length}, 🟢 maintainer actif : ${green.length}`);
  L.push(`- PRs ouvertes : **${prs.length}**`);
  L.push(forum === null ? "- Forum : état non disponible (le workflow forum-poll n'a pas encore tourné sur ce runner)" : `- Forum : **${forum.length}** post(s) sans réponse du maintainer`);
  const pm = loadForumPmSignals();
  if (pm) {
    L.push(`- Messages privés (lecture seule, jamais de réponse) : **${pm.fetched}** thread(s), ${pm.mfrs} mfr, ${pm.pids} pid, ${pm.uuids} UUID diag`);
  }
  L.push("");
  if (red.length) {
    L.push("## 🔴 Issues à traiter", "");
    for (const i of red) L.push(`- [#${i.number}](${i.url}) — ${i.title} _(${i.status}, maj ${i.updated})_`);
    L.push("");
  }
  if (yellow.length) {
    L.push("## 🟡 Auto-résolues, en attente de retour", "");
    for (const i of yellow) L.push(`- [#${i.number}](${i.url}) — ${i.title} _(maj ${i.updated})_`);
    L.push("");
  }
  if (green.length) {
    L.push("## 🟢 Maintainer actif dessus", "");
    for (const i of green) L.push(`- [#${i.number}](${i.url}) — ${i.title} _(maj ${i.updated})_`);
    L.push("");
  }
  if (prs.length) {
    L.push("## 🔀 PRs ouvertes", "");
    for (const p of prs) L.push(`- [#${p.number}](${p.html_url}) — ${p.title} _(${p.user && p.user.login}, maj ${(p.updated_at || "").slice(0, 10)})_`);
    L.push("");
  }
  if (forum && forum.length) {
    L.push("## 🌍 Forum — posts sans réponse", "");
    for (const p of forum) L.push(`- **${p.username}** (${(p.createdAt || p.date || "").slice(0, 10)}) : ${(p.excerpt || p.text || "").replace(/\s+/g, " ").slice(0, 140)}`);
    L.push("");
  }
  const md = L.join("\n") + "\n";
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  console.log(`Issues: ${enriched.length} (red ${red.length} / yellow ${yellow.length} / green ${green.length}) | PRs: ${prs.length} | forum unanswered: ${forum === null ? "n/a" : forum.length}`);
  console.log("Written:", path.relative(process.cwd(), OUT));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { classifyCommenter };
