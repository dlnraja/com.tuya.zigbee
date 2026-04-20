#!/usr/bin/env node
'use strict';

/**
 * github-deep-search.js - Multi-project GitHub Search Engine
 *
 * Searches 20+ relevant Zigbee/Tuya projects for:
 * - New fingerprints (code search)
 * - Device reports (issue/PR search)
 * - DP mappings, converters, quirks (code search)
 * - New relevant repositories (repo discovery)
 */

const fs = require('fs');
const path = require('path');
const { fetchWithRetry } = require('./retry-helper');
const { callAI } = require('./ai-helper');
const { extractFP:_vFP, extractPID:_vPID, isValidTuyaFP } = require('./fp-validator');

const ROOT = path.join(__dirname, '..', '..');
const STATE = path.join(__dirname, '..', 'state');
const REPORT_F = path.join(STATE, 'github-deep-search-report.json');
const STATE_F = path.join(STATE, 'github-deep-search-state.json');
const DDIR = path.join(ROOT, 'drivers');
const TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;
const GH = 'https://api.github.com';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PID_RE = /\bTS[0-9A-Fa-f]{3,5}[A-Z]?\b/gi;
const DP_RE = /(?:dp|DP|datapoint)[:\s=]*(\d{1,3})/gi;

let ghCalls = 0;
const MAX_GH = parseInt(process.env.MAX_GH_CALLS || '180');
const GH_DELAY = parseInt(process.env.GH_DELAY || '2200');

const hdrs = () => {
    const h = { Accept: 'application/vnd.github+json', 'User-Agent': 'tuya-deep-search' };
    if (TOKEN) h.Authorization = 'Bearer ' + TOKEN;
    h['Accept'] = 'application/vnd.github.text-match+json';
    return h;
};

async function ghFetch(url) {
    if (ghCalls >= MAX_GH) { console.log('  [LIMIT] Max GH calls reached'); return null; }
    ghCalls++;
    await sleep(GH_DELAY);
    try {
        const r = await fetchWithRetry(url, { headers: hdrs() }, { retries: 2, label: 'gh-search' });
        if (r.status === 403 || r.status === 429) { console.log('  [RATE] Rate limited, waiting 60s'); await sleep(60000); return null; }
        if (!r.ok) return null;
        return r.json();
    } catch (e) { console.log('  [ERR]', e.message); return null; }
}

const REPO_GROUPS = {
    z2m: ['Koenkk/zigbee-herdsman-converters', 'Koenkk/zigbee2mqtt', 'Koenkk/zigbee-herdsman'],
    zha: ['zigpy/zha-device-handlers', 'zigpy/zigpy', 'home-assistant/core'],
    deconz: ['dresden-elektronik/deconz-rest-plugin'],
    homey: ['JohanBendz/com.tuya.zigbee', 'TedTolboom/com.tuya.zigbee', 'athombv/com.ikea.tradfri', 'athombv/com.philips.hue.zigbee', 'Koktansen/com.tuya.zigbee'],
    iobroker: ['ioBroker/ioBroker.zigbee', 'Koenkk/zigbee-shepherd-converters'],
    tasmota: ['arendst/Tasmota'],
    openhab: ['openhab/org.openhab.binding.zigbee', 'zsmartsystems/com.zsmartsystems.zigbee'],
    domoticz: ['zigbeefordomoticz/Domoticz-Zigbee'],
    fhem: ['zigpy/bellows'],
    tuya: ['tuya/tuya-home-assistant', 'tuya/tuyaopen-platform-sdk', 'codetheweb/tuyapi', 'rospogrigio/localtuya'],
    matter: ['project-chip/connectedhomeip'],
    community: ['blakadder/zigbee', 'Koenkk/zigbee2mqtt.io']
};

const ALL_REPOS = Object.values(REPO_GROUPS).flat();

function loadOurFPs() {
    const fps = new Set();
    if (!fs.existsSync(DDIR)) return fps;
    for (const d of fs.readdirSync(DDIR)) {
        const cf = path.join(DDIR, d, 'driver.compose.json');
        if (!fs.existsSync(cf)) continue;
        try {
            const j = JSON.parse(fs.readFileSync(cf, 'utf8'));
            for (const m of (j.zigbee?.manufacturerName || [])) fps.add(m);
        } catch {}
    }
    return fps;
}

function loadDriverIndex() {
    const idx = new Map();
    if (!fs.existsSync(DDIR)) return idx;
    for (const d of fs.readdirSync(DDIR)) {
        const cf = path.join(DDIR, d, 'driver.compose.json');
        if (!fs.existsSync(cf)) continue;
        try {
            const j = JSON.parse(fs.readFileSync(cf, 'utf8'));
            for (const m of (j.zigbee?.manufacturerName || [])) idx.set(m, d);
        } catch {}
    }
    return idx;
}

async function searchCodeForFPs() {
    console.log('\n== Code Search: FPs across projects ==');
    const results = [];
    const queries = [
        '_TZE200_ language:typescript', '_TZE204_ language:typescript', '_TZE284_ language:typescript',
        '_TZ3000_ language:python path:tuya', '_TZE200_ language:python path:quirk', '_TZE200_ language:javascript NOT repo:dlnraja/com.tuya.zigbee',
        '_TZ3000_ language:groovy zigbee', '_TZE200_ language:java zigbee', 'manufacturerName _TZE language:json', 'tuya fingerprint _TZ language:yaml'
    ];
    for (const q of queries) {
        const data = await ghFetch(GH + '/search/code?q=' + encodeURIComponent(q) + '&per_page=30&sort=indexed&order=desc');
        if (!data?.items) continue;
        for (const item of data.items) {
            const fragments = (item.text_matches || []).map(m => m.fragment).join('\n');
            const allText = (item.name || '') + ' ' + fragments;
            const fps = _vFP(allText);
            const pids = [...new Set((allText.match(PID_RE) || []).map(p => p.toUpperCase()))];
            const dps = [...new Set((allText.match(DP_RE) || []).map(m => parseInt(m.match(/\d+/)?.[0])).filter(n => n > 0 && n < 256))];
            if (fps.length) {
                results.push({
                    fps, pids, dps, repo: item.repository?.full_name, file: item.name, path: item.path,
                    url: item.html_url, lang: item.repository?.language, snippet: fragments.slice(0, 500), source: 'code_search'
                });
            }
        }
        console.log('  Query "' + q.slice(0, 40) + '...": ' + (data.items?.length || 0) + ' results');
        await sleep(1000);
    }
    return results;
}

async function searchIssuesForDevices() {
    console.log('\n== Issue Search: Device reports across projects ==');
    const results = [];
    const issueQueries = [];
    for (const [group, repos] of Object.entries(REPO_GROUPS)) {
        for (const repo of repos) {
            issueQueries.push({ q: 'repo:' + repo + ' _TZE state:open', repo, group });
            if (group !== 'z2m') issueQueries.push({ q: 'repo:' + repo + ' tuya zigbee state:open', repo, group });
        }
    }
    issueQueries.push({ q: '_TZE200_ zigbee state:open -repo:dlnraja/com.tuya.zigbee', repo: 'global', group: 'global' });
    for (const { q, repo, group } of issueQueries.slice(0, 25)) {
        const data = await ghFetch(GH + '/search/issues?q=' + encodeURIComponent(q) + '&per_page=15&sort=created&order=desc');
        if (!data?.items) continue;
        for (const item of data.items) {
            const text = (item.title || '') + ' ' + (item.body || '').slice(0, 3000);
            const fps = _vFP(text);
            const pids = [...new Set((text.match(PID_RE) || []).map(p => p.toUpperCase()))];
            const dps = [...new Set((text.match(DP_RE) || []).map(m => parseInt(m.match(/\d+/)?.[0])).filter(n => n > 0 && n < 256))];
            if (fps.length) {
                results.push({
                    fps, pids, dps, repo: item.repository_url?.split('/').slice(-2).join('/') || repo, group,
                    number: item.number, title: item.title?.slice(0, 100), url: item.html_url, isPR: !!item.pull_request,
                    isBug: /bug|fix|wrong|incorrect|broken|not.work|invert/i.test(text),
                    isQuirk: /quirk|workaround|hack|special|override|custom/i.test(text),
                    created: item.created_at, source: 'issue_search'
                });
            }
        }
        await sleep(800);
    }
    return results;
}

async function discoverRepos() {
    const discovered = [];
    const queries = ['tuya zigbee driver language:javascript stars:>5', 'tuya zigbee converter language:typescript stars:>3'];
    for (const q of queries) {
        const data = await ghFetch(GH + '/search/repositories?q=' + encodeURIComponent(q) + '&per_page=10&sort=updated&order=desc');
        if (!data?.items) continue;
        for (const repo of data.items) {
            if (ALL_REPOS.includes(repo.full_name)) continue;
            discovered.push({ name: repo.full_name, stars: repo.stargazers_count, url: repo.html_url });
        }
        await sleep(1500);
    }
    return discovered;
}

async function searchTargetedFPs(unsupportedFPs) {
    const results = [];
    for (const fp of unsupportedFPs.slice(0, 20)) {
        const data = await ghFetch(GH + '/search/code?q=' + encodeURIComponent(fp) + '&per_page=10');
        if (data?.items) {
            for (const item of data.items) {
                const fragments = (item.text_matches || []).map(m => m.fragment).join('\n');
                const allText = fragments;
                const pids = [...new Set((allText.match(PID_RE) || []).map(p => p.toUpperCase()))];
                const dps = [...new Set((allText.match(DP_RE) || []).map(m => parseInt(m.match(/\d+/)?.[0])).filter(n => n > 0 && n < 256))];
                results.push({ fp, pids, dps, repo: item.repository?.full_name, file: item.name, url: item.html_url, snippet: fragments.slice(0, 600), source: 'targeted_search' });
            }
        }
        await sleep(2500);
    }
    return results;
}

function crossReferenceResults(codeResults, issueResults, targetedResults, ourFPs, driverIndex) {
    const byFP = new Map();
    const processEntry = (entry) => {
        for (const fp of (entry.fps || [entry.fp])) {
            if (!fp || !byFP.has(fp)) {
                if(fp) byFP.set(fp, { fp, pids: new Set(), dps: new Set(), repos: new Set(), issues: [], codeRefs: [], inApp: ourFPs.has(fp), driver: driverIndex.get(fp) || null, sources: new Set() });
                else continue;
            }
            const e = byFP.get(fp);
            for (const p of (entry.pids || [])) e.pids.add(p);
            for (const d of (entry.dps || [])) e.dps.add(d);
            if (entry.repo) e.repos.add(entry.repo);
            e.sources.add(entry.source);
            if (entry.source === 'issue_search') e.issues.push(entry);
            if (entry.source === 'code_search' || entry.source === 'targeted_search') e.codeRefs.push(entry);
        }
    };
    [...codeResults, ...issueResults, ...targetedResults].forEach(processEntry);
    return [...byFP.values()].map(e => ({ ...e, pids: [...e.pids], dps: [...e.dps].sort((a,b)=>a-b), repos: [...e.repos], sources: [...e.sources], confidence: e.repos.size * 15 + e.dps.size * 8 }));
}

async function main() {
    const start = Date.now();
    const ourFPs = loadOurFPs();
    const driverIndex = loadDriverIndex();
    const codeResults = await searchCodeForFPs();
    const issueResults = await searchIssuesForDevices();
    const newRepos = await discoverRepos();
    const allFoundNew = new Set();
    [...codeResults, ...issueResults].forEach(r => (r.fps||[]).forEach(f => { if(!ourFPs.has(f)) allFoundNew.add(f) }));
    const targeted = await searchTargetedFPs([...allFoundNew].slice(0, 20));
    const crossRef = crossReferenceResults(codeResults, issueResults, targeted, ourFPs, driverIndex);
    const report = { timestamp: new Date().toISOString(), stats: { ghCalls, totalFPs: crossRef.length, unsupported: crossRef.filter(e=>!e.inApp).length, duration: Math.round((Date.now()-start)/1000) }, findings: crossRef.slice(0, 100) };
    fs.mkdirSync(STATE, { recursive: true });
    fs.writeFileSync(REPORT_F, JSON.stringify(report, null, 2));
    console.log('Done in ' + report.stats.duration + 's');
}

main().catch(e => { console.error(e); process.exit(1); });
