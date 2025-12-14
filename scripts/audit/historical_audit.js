const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function sh(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function listAllCommitsTouchingAppJson() {
  // newest -> oldest
  const out = sh('git rev-list --all -- app.json');
  return out.split(/\r?\n/).filter(Boolean);
}

function getVersionFromCommit(commit) {
  try {
    const content = sh(`git show ${commit}:app.json`);
    const json = safeJsonParse(content);
    return json?.version || null;
  } catch {
    return null;
  }
}

function versionGte(a, b) {
  const pa = a.split('.').map(n => parseInt(n, 10));
  const pb = b.split('.').map(n => parseInt(n, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da > db) return true;
    if (da < db) return false;
  }
  return true;
}

function buildVersionCommitMap(minVersion) {
  const commits = listAllCommitsTouchingAppJson();
  const map = new Map();

  for (const c of commits) {
    const v = getVersionFromCommit(c);
    if (!v) continue;
    if (!/^5\.5\./.test(v)) continue;
    if (!versionGte(v, minVersion)) continue;

    // Take the newest commit for that version (first we see)
    if (!map.has(v)) map.set(v, c);
  }

  // Sort versions ascending
  const versions = Array.from(map.keys()).sort((x, y) => {
    const ax = x.split('.').map(n => parseInt(n, 10));
    const ay = y.split('.').map(n => parseInt(n, 10));
    for (let i = 0; i < 3; i++) {
      if (ax[i] !== ay[i]) return ax[i] - ay[i];
    }
    return 0;
  });

  return { versions, map };
}

function listTree(commit) {
  const out = sh(`git ls-tree -r --name-only ${commit}`);
  return out.split(/\r?\n/).filter(Boolean);
}

function getManufacturerNamesAtCommit(commit) {
  const files = listTree(commit).filter(p => /^drivers\/[^/]+\/driver\.compose\.json$/.test(p));
  const idToDrivers = new Map();

  for (const f of files) {
    const driver = f.split('/')[1];
    let content;
    try {
      content = sh(`git show ${commit}:${f}`);
    } catch {
      continue;
    }

    const json = safeJsonParse(content);
    const names = json?.zigbee?.manufacturerName;
    if (!Array.isArray(names)) continue;

    for (const id of names) {
      if (!idToDrivers.has(id)) idToDrivers.set(id, []);
      idToDrivers.get(id).push(driver);
    }
  }

  return idToDrivers;
}

function getFlowCardIdsAtCommit(commit) {
  const files = listTree(commit).filter(p => /^\.homeycompose\/flow\/(triggers|conditions|actions)\/.*\.json$/.test(p));
  const ids = new Set();

  for (const f of files) {
    let content;
    try {
      content = sh(`git show ${commit}:${f}`);
    } catch {
      continue;
    }
    const json = safeJsonParse(content);
    if (json?.id) ids.add(json.id);
  }

  return ids;
}

function diffSets(prevSet, nextSet) {
  const added = [];
  const removed = [];
  for (const v of nextSet) if (!prevSet.has(v)) added.push(v);
  for (const v of prevSet) if (!nextSet.has(v)) removed.push(v);
  added.sort();
  removed.sort();
  return { added, removed };
}

function computeMovedIds(prevMap, nextMap) {
  // moved = present in both, but assigned drivers differ
  const moved = [];
  for (const [id, prevDrivers] of prevMap.entries()) {
    const nextDrivers = nextMap.get(id);
    if (!nextDrivers) continue;

    const a = Array.from(new Set(prevDrivers)).sort().join(',');
    const b = Array.from(new Set(nextDrivers)).sort().join(',');
    if (a !== b) {
      moved.push({ id, from: a, to: b });
    }
  }
  return moved;
}

function run(minVersion, maxVersions) {
  console.log(`\n🔍 Historical audit starting from ${minVersion}...`);

  const { versions, map } = buildVersionCommitMap(minVersion);
  const selected = typeof maxVersions === 'number' ? versions.slice(-maxVersions) : versions;

  console.log(`Found ${versions.length} versions >= ${minVersion}`);
  console.log(`Processing ${selected.length} version(s)`);

  const report = {
    generatedAt: new Date().toISOString(),
    minVersion,
    versions: selected,
    byVersion: {},
    diffs: []
  };

  let prev = null;
  for (const v of selected) {
    const commit = map.get(v);
    console.log(`\n=== ${v} @ ${commit} ===`);

    const idMap = getManufacturerNamesAtCommit(commit);
    const allIds = new Set(idMap.keys());
    const flowIds = getFlowCardIdsAtCommit(commit);

    report.byVersion[v] = {
      commit,
      manufacturerIdCount: allIds.size,
      flowCardIdCount: flowIds.size
    };

    if (prev) {
      const idDiff = diffSets(prev.allIds, allIds);
      const moved = computeMovedIds(prev.idMap, idMap);
      const flowDiff = diffSets(prev.flowIds, flowIds);

      report.diffs.push({
        from: prev.version,
        to: v,
        manufacturerIds: {
          added: idDiff.added,
          removed: idDiff.removed,
          moved
        },
        flowCards: {
          added: flowDiff.added,
          removed: flowDiff.removed
        }
      });

      console.log(`IDs: +${idDiff.added.length} / -${idDiff.removed.length} / moved ${moved.length}`);
      console.log(`Flow: +${flowDiff.added.length} / -${flowDiff.removed.length}`);
    }

    prev = { version: v, commit, idMap, allIds, flowIds };
  }

  const outPath = path.join(__dirname, 'historical_audit_report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Saved report to ${outPath}`);
}

const minVersion = process.argv[2] || '5.5.120';
const maxVersions = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;
run(minVersion, maxVersions);
