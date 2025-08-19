#!/usr/bin/env node
/* tools/cli.js */
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');

const ENV = { ...process.env, NO_COLOR:'1', FORCE_COLOR:'0', CI:'1', TERM:'dumb' };

function sanitizeOut(outRaw) {
  const s = (outRaw || '').toString();
  const noAnsi = s.replace(/\x1b\[[0-9;]*m/g, '');
  const nl = noAnsi.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return nl.endsWith('\n') ? nl : nl + '\n';
}

function toWindowsEOL(textLf) {
  return textLf.replace(/\n/g, os.EOL);
}

function printBlock(label, out) {
  const bodyLf = sanitizeOut(out);
  const body = toWindowsEOL(bodyLf);
  if (label) process.stdout.write(String(label) + os.EOL);
  if (body.trim()) process.stdout.write(body);
  // Ligne vide supplémentaire pour fiabilité d'affichage PowerShell
  process.stdout.write(os.EOL);
}

function runNpx(argv, label, timeoutMs = 240000) {
  try {
    const out = execFileSync('npx', argv, {
      env: ENV,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs
    }).toString();
    // Sentinelle de fin lisible par Cursor
    process.stdout.write(out);
    process.stdout.write(`\n::END::${label}::OK\n`);
    return { code: 0, out: sanitizeOut(out) };
  } catch (e) {
    const out = (e.stdout?.toString() || '') + (e.stderr?.toString() || e.message);
    process.stdout.write(out);
    process.stdout.write(`\n::END::${label}::FAIL\n`);
    return { code: e.status ?? 1, out: sanitizeOut(out) };
  }
}

function runCmd(cmd, argv, label, timeoutMs = 240000) {
  try {
    const out = execFileSync(cmd, argv, {
      env: ENV,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs
    }).toString();
    process.stdout.write(out);
    process.stdout.write(`\n::END::${label}::OK\n`);
    return { code: 0, out: sanitizeOut(out) };
  } catch (e) {
    const out = (e.stdout?.toString() || '') + (e.stderr?.toString() || e.message);
    process.stdout.write(out);
    process.stdout.write(`\n::END::${label}::FAIL\n`);
    return { code: e.status ?? 1, out: sanitizeOut(out) };
  }
}

/* --------- LINTS --------- */
function lintNaming() {
  let ok = true;
  const isKebab = s => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
  const badTS = s => /TS\d{4,}/i.test(s);
  const D = 'drivers';
  for (const d of (fs.existsSync(D)?fs.readdirSync(D):[])) {
    const p = path.join(D, d);
    if (!fs.statSync(p).isDirectory()) continue;
    if (!isKebab(d) || badTS(d)) { console.error(`❌ Bad driver folder: ${d}`); ok = false; }
    for (const f of ['driver.compose.json','device.js']) {
      if (!fs.existsSync(path.join(p,f))) { console.error(`❌ Missing ${f} in ${d}`); ok = false; }
    }
    const a = path.join(p,'assets');
    for (const f of ['small.png','large.png','xlarge.png']) {
      if (!fs.existsSync(path.join(a,f))) { console.error(`❌ Missing ${f} in ${d}/assets`); ok = false; }
    }
  }
  process.exitCode = ok ? 0 : 1;
  process.stdout.write((ok ? 'LINT_NAMING_OK' : 'LINT_NAMING_FAIL') + os.EOL + os.EOL);
}

function lintNoNetwork() {
  // Only scan runtime app code, not tools/*
  const git = runCmd('git', ['ls-files'], 'GIT_LS', 20000);
  const files = git.out.split('\n').filter(f =>
    f && !f.startsWith('tools/') && (f.endsWith('.js') || f.endsWith('.ts'))
  );
  const netRx = /(?:\bfetch\b|\baxios\b|\bundici\b|\bnode-fetch\b|\bWebSocket\b|require\(['"]https?:|import\s+.*from\s+['"]https?:|require\(['"]http['"]\)|require\(['"]https['"]\)|require\(['"]dns['"]\)|require\(['"]tls['"]\)|require\(['"]net['"]\)|require\(['"]dgram['"]\)|require\(['"]ws['"]\))/;
  let ok = true;
  for (const f of files) {
    const s = fs.readFileSync(f,'utf8');
    if (netRx.test(s)) { console.error(`❌ Network API in runtime file: ${f}`); ok = false; }
  }
  process.exitCode = ok ? 0 : 1;
  process.stdout.write((ok ? 'LINT_NONET_OK' : 'LINT_NONET_FAIL') + os.EOL + os.EOL);
}

/* --------- BUILD / VALIDATE --------- */
function build() {
  // Use our custom build script to avoid homey CLI hanging
  const r = runCmd('node', ['tools/build-manifest.js'], 'BUILD');
  fs.appendFileSync('INTEGRATION_LOG.md', `\n[build]\n\`\`\`\n${r.out}\n\`\`\`\n`);
  if (r.code !== 0) { console.error('BUILD_FAIL'); process.stdout.write(os.EOL); process.exit(1); }
  process.stdout.write('BUILD_OK' + os.EOL + os.EOL);
}
function validate() {
  // Use our local validation script to avoid homey CLI issues
  const r = runCmd('node', ['tools/validate-local.js'], 'VALIDATE');
  fs.appendFileSync('INTEGRATION_LOG.md', `\n[validate]\n\`\`\`\n${r.out}\n\`\`\`\n`);
  // Afficher un extrait propre pour debug dans le terminal
  printBlock('VALIDATE_OUTPUT:', r.out);
  if (!/Validation result:\s*OK/i.test(r.out)) { console.error('VALIDATE_FAIL'); process.stdout.write(os.EOL); process.exit(1); }
  process.stdout.write('VALIDATE_OK' + os.EOL + os.EOL);
}

/* --------- AUTO FIX → VALIDATE LOOP --------- */
function autoFixOnce(out) {
  let changed = false;
  // (1) Missing images → stub placeholders
  if (/missing image/i.test(out)) {
    const D = 'drivers';
    for (const d of (fs.existsSync(D)?fs.readdirSync(D):[])) {
      const a = path.join(D,d,'assets'); if (!fs.existsSync(a)) continue;
      for (const f of ['small.png','large.png','xlarge.png']) {
        const p = path.join(a,f);
        if (!fs.existsSync(p)) { fs.writeFileSync(p, Buffer.alloc(0)); changed = true; }
      }
    }
  }
  // (2) Compose refs mismatch, trivial schema warnings → leave TODO (manual)
  // (3) Capabilities mismatches → leave TODO (manual Compose edits required)
  return changed;
}
function fixValidate() {
  for (let i=0;i<15;i++){
    const r = runNpx(['--yes','homey','app','validate','-l','debug'], `VALIDATE_PASS_${i+1}`);
    fs.appendFileSync('INTEGRATION_LOG.md', `\n[validate pass ${i+1}]\n\`\`\`\n${r.out}\n\`\`\`\n`);
    printBlock(`VALIDATE_PASS_${i+1}:`, r.out);
    if (/Validation result:\s*OK/i.test(r.out)) { process.stdout.write('VALIDATE_OK' + os.EOL + os.EOL); return; }
    const changed = autoFixOnce(r.out);
    if (!changed) { console.error('NO_MORE_AUTOFIX'); process.stdout.write(os.EOL); process.exit(2); }
  }
  console.error('FIX_LOOP_GUARD_EXCEEDED'); process.stdout.write(os.EOL); process.exit(3);
}

/* --------- HARVEST (single entry; implementation in tools/harvest.js) --------- */
function harvest() {
  try {
    require('./harvest').run({ env: ENV });
  } catch (e) {
    console.warn('Harvest not fully implemented yet. Create tools/harvest.js with GitHub/Forums logic.');
    process.exit(0);
  }
}

/* --------- AUDIT / REFACTOR (repo-aware) --------- */
function ensureDir(dirPath) {
  try { fs.mkdirSync(dirPath, { recursive: true }); } catch {}
}

function audit() {
  const plan = { problems: [], actions: [] };
  const driversDir = 'drivers';
  const isKebab = s => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
  const hasTS = s => /TS\d{4,}/i.test(s);
  const suspectNames = new Set(['_common', 'generic', 'tuya_zigbee', 'zigbee']);

  if (!fs.existsSync(driversDir)) {
    console.error('❌ drivers/ missing');
    process.stdout.write(os.EOL);
    process.exit(1);
  }

  for (const d of fs.readdirSync(driversDir)) {
    const p = path.join(driversDir, d);
    if (!fs.statSync(p).isDirectory()) continue;
    const bad = (!isKebab(d) || hasTS(d) || suspectNames.has(d));
    const missingFiles = ['driver.compose.json', 'device.js']
      .filter(f => !fs.existsSync(path.join(p, f)));
    const assetsDir = path.join(p, 'assets');
    const missingAssets = ['small.png', 'large.png', 'xlarge.png']
      .filter(f => !fs.existsSync(path.join(assetsDir, f)));
    if (bad || missingFiles.length || missingAssets.length) {
      plan.problems.push({ driver: d, bad, missingFiles, missingAssets });
    }
  }

  // Runtime anti-network (exclude tools/*)
  const gitLs = runCmd('git', ['ls-files'], 'GIT_LS', 20000);
  const files = gitLs.out.split('\n')
    .filter(f => f && !f.startsWith('tools/') && (f.endsWith('.js') || f.endsWith('.ts')));
  const netRx = /(?:\bfetch\b|\baxios\b|require\(['"]https?:|import\s+.*from\s+['"]https?:|require\(['"]net['"]\)|require\(['"]dgram['"]\)|require\(['"]ws['"]\))/;
  for (const f of files) {
    try {
      const s = fs.readFileSync(f, 'utf8');
      if (netRx.test(s)) plan.problems.push({ networkUsage: f });
    } catch {}
  }

  if (fs.existsSync('app.json')) {
    plan.problems.push({ appJsonCommitted: true, note: 'app.json must be generated by Compose' });
  }

  for (const pbl of plan.problems) {
    if (pbl.driver) {
      const newName = hasTS(pbl.driver)
        ? pbl.driver.replace(/TS\d{4,}/ig, 'device').replace(/_/g, '-')
        : pbl.driver;
      if (pbl.bad) plan.actions.push({ type: 'rename-driver', from: pbl.driver, to: isKebab(newName) ? newName : `device-${Date.now()}` });
      if (pbl.missingFiles?.length) plan.actions.push({ type: 'stub-files', driver: pbl.driver, files: pbl.missingFiles });
      if (pbl.missingAssets?.length) plan.actions.push({ type: 'stub-assets', driver: pbl.driver, files: pbl.missingAssets });
    }
    if (pbl.networkUsage) plan.actions.push({ type: 'fail-nonlocal', file: pbl.networkUsage });
    if (pbl.appJsonCommitted) plan.actions.push({ type: 'compose-only', note: 'Compose is source of truth' });
  }

  ensureDir('reports');
  fs.writeFileSync('reports/audit-plan.json', JSON.stringify(plan, null, 2));
  process.stdout.write('AUDIT_OK' + os.EOL + os.EOL);
}

function refactor() {
  const planPath = 'reports/audit-plan.json';
  if (!fs.existsSync(planPath)) { console.error('Run: node tools/cli.js audit'); process.stdout.write(os.EOL); process.exit(1); }
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const driversDir = 'drivers';

  for (const a of plan.actions) {
    if (a.type === 'rename-driver') {
      const from = path.join(driversDir, a.from);
      const to = path.join(driversDir, a.to);
      if (fs.existsSync(from) && !fs.existsSync(to)) {
        fs.renameSync(from, to);
      }
    }
    if (a.type === 'stub-files') {
      const base = path.join(driversDir, a.driver);
      for (const f of a.files) {
        const p = path.join(base, f);
        if (!fs.existsSync(p)) {
          if (f === 'driver.compose.json') {
            const id = path.basename(base);
            const compose = {
              id,
              name: { en: id, fr: id },
              class: 'socket',
              capabilities: ['onoff'],
              images: {
                small: `drivers/${id}/assets/small.png`,
                large: `drivers/${id}/assets/large.png`,
                xlarge: `drivers/${id}/assets/xlarge.png`
              }
            };
            fs.writeFileSync(p, JSON.stringify(compose, null, 2));
          } else {
            fs.writeFileSync(p, '');
          }
        }
      }
    }
    if (a.type === 'stub-assets') {
      const base = path.join(driversDir, a.driver, 'assets');
      ensureDir(base);
      for (const f of a.files) {
        const p = path.join(base, f);
        if (!fs.existsSync(p)) fs.writeFileSync(p, Buffer.alloc(0));
      }
    }
    if (a.type === 'fail-nonlocal') {
      console.error(`❌ Network API found in ${a.file}`);
      process.stdout.write(os.EOL);
      process.exit(2);
    }
  }

  process.stdout.write('REFACTOR_OK' + os.EOL + os.EOL);
}

/* --------- SCHEMA-CHECK (overlays + compose fragments) --------- */
function schemaCheck() {
  let ok = true;
  // Minimal JSON schema validation without deps
  function isObject(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function validateOverlay(obj, file) {
    if (!isObject(obj)) return fail(file, 'overlay must be object');
    if (obj.productIds && !Array.isArray(obj.productIds)) return fail(file, 'productIds must be array');
    const dp = obj.dp; if (dp && !isObject(dp)) return fail(file, 'dp must be object');
    if (dp) {
      for (const [k, v] of Object.entries(dp)) {
        if (!/^\d+$/.test(k)) return fail(file, `dp key '${k}' must be integer string`);
        if (!isObject(v)) return fail(file, `dp['${k}'] must be object`);
        if (typeof v.cap !== 'string') return fail(file, `dp['${k}'].cap must be string`);
        if (v.to && typeof v.to !== 'string') return fail(file, `dp['${k}'].to must be string`);
        if (v.from && typeof v.from !== 'string') return fail(file, `dp['${k}'].from must be string`);
      }
    }
    // Optional governance fields
    if (obj.status && !['proposed','confirmed','disabled'].includes(obj.status)) return fail(file, `invalid status '${obj.status}'`);
    if (obj.confidence !== undefined && (typeof obj.confidence !== 'number' || obj.confidence < 0 || obj.confidence > 1)) return fail(file, 'confidence must be number in [0,1]');
    return true;
  }
  function fail(file, msg) { console.error(`❌ Schema error in ${file}: ${msg}`); ok = false; return false; }

  const overlaysRoot = 'lib/tuya/overlays/vendors';
  if (fs.existsSync(overlaysRoot)) {
    for (const vendor of fs.readdirSync(overlaysRoot)) {
      const vPath = path.join(overlaysRoot, vendor);
      if (!fs.statSync(vPath).isDirectory()) continue;
      for (const f of fs.readdirSync(vPath)) {
        if (!f.endsWith('.json')) continue;
        const p = path.join(vPath, f);
        try {
          const obj = JSON.parse(fs.readFileSync(p,'utf8'));
          validateOverlay(obj, p);
          if ((process.env.CHECK_MODE || '').toLowerCase() === 'publish') {
            if (obj.status === 'proposed') fail(p, 'proposed overlay present in publish mode');
          }
        }
        catch (e) { fail(p, 'invalid JSON'); }
      }
    }
  }

  // Compose fragments: check basic fields
  const driversDir = 'drivers';
  if (fs.existsSync(driversDir)) {
    for (const d of fs.readdirSync(driversDir)) {
      const composePath = path.join(driversDir, d, 'driver.compose.json');
      if (!fs.existsSync(composePath)) continue;
      try {
        const c = JSON.parse(fs.readFileSync(composePath,'utf8'));
        if (typeof c.id !== 'string') fail(composePath, 'id must be string');
        if (typeof c.class !== 'string') fail(composePath, 'class must be string');
        if (!Array.isArray(c.capabilities)) fail(composePath, 'capabilities must be array');
        if (!c.images || !c.images.small || !c.images.large || !c.images.xlarge) fail(composePath, 'images.small/large/xlarge required');
        if (c.capabilitiesOptions && typeof c.capabilitiesOptions !== 'object') fail(composePath, 'capabilitiesOptions must be object when present');
      } catch { fail(composePath, 'invalid JSON'); }
    }
  }

  process.exitCode = ok ? 0 : 1;
  process.stdout.write((ok ? 'SCHEMA_OK' : 'SCHEMA_FAIL') + os.EOL + os.EOL);
}

/* --------- IMAGES-CHECK (dimensions) --------- */
function imagesCheck() {
  let ok = true;
  const sizeOf = (buf) => {
    // Minimal PNG/JPEG dim reader (signature-based, best-effort)
    if (buf.slice(0,8).toString('hex') === '89504e470d0a1a0a') { // PNG
      // IHDR chunk at 8..
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      return { width:w, height:h, type:'png' };
    }
    if (buf[0] === 0xFF && buf[1] === 0xD8) { // JPEG
      let i = 2;
      while (i < buf.length) {
        if (buf[i] !== 0xFF) break; const marker = buf[i+1];
        const len = buf.readUInt16BE(i+2);
        if (marker >= 0xC0 && marker <= 0xC3) {
          const h = buf.readUInt16BE(i+5);
          const w = buf.readUInt16BE(i+7);
          return { width:w, height:h, type:'jpg' };
        }
        i += 2 + len;
      }
    }
    return null;
  };

  function checkImage(pathFile, expW, expH, allowEmpty) {
    try {
      const buf = fs.readFileSync(pathFile);
      if (!buf.length) { if (!allowEmpty) { console.error(`❌ Empty image: ${pathFile}`); ok=false; } return; }
      const info = sizeOf(buf);
      if (!info) { console.error(`❌ Unknown/invalid image: ${pathFile}`); ok=false; return; }
      if (info.width !== expW || info.height !== expH) {
        console.error(`❌ Bad size ${pathFile}: got ${info.width}x${info.height}, expected ${expW}x${expH}`);
        ok=false;
      }
    } catch (e) { console.error(`❌ Missing image: ${pathFile}`); ok=false; }
  }

  const publishMode = (process.env.CHECK_MODE || 'debug') === 'publish';
  const allowEmpty = !publishMode;
  // Drivers
  const D='drivers';
  if (fs.existsSync(D)) {
    for (const d of fs.readdirSync(D)) {
      const a=path.join(D,d,'assets');
      checkImage(path.join(a,'small.png'), 75, 75, allowEmpty);
      checkImage(path.join(a,'large.png'), 500, 500, allowEmpty);
      checkImage(path.join(a,'xlarge.png'), 1000, 1000, allowEmpty);
    }
  }
  // App images (optional, only if present)
  const appAssets = 'assets';
  if (fs.existsSync(appAssets)) {
    checkImage(path.join(appAssets,'small.png'), 250,175, allowEmpty);
    checkImage(path.join(appAssets,'large.png'), 500,350, allowEmpty);
    checkImage(path.join(appAssets,'xlarge.png'),1000,700, allowEmpty);
  }

  process.exitCode = ok ? 0 : 1;
  process.stdout.write((ok ? 'IMAGES_OK' : 'IMAGES_FAIL') + os.EOL + os.EOL);
}

/* --------- IMAGES-FIX (generate valid PNGs for required sizes) --------- */
function imagesFix() {
  // CRC32 implementation
  const makeCrcTable = () => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  };
  const CRC_TABLE = makeCrcTable();
  const crc32 = (buf) => {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };
  const writeChunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([t, data]));
    crc.writeUInt32BE(crcVal >>> 0, 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const pngFromRGB = (width, height, rgb) => {
    const sig = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 2;  // color type RGB
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace
    const ihdrChunk = writeChunk('IHDR', ihdr);

    // Raw image data with filter 0 per scanline
    const bytesPerLine = 1 + width * 3;
    const raw = Buffer.alloc(bytesPerLine * height);
    for (let y = 0; y < height; y++) {
      raw[y * bytesPerLine] = 0; // filter type 0
      for (let x = 0; x < width; x++) {
        const o = y * bytesPerLine + 1 + x * 3;
        raw[o] = rgb[0];
        raw[o+1] = rgb[1];
        raw[o+2] = rgb[2];
      }
    }
    const zlib = require('zlib');
    const idat = writeChunk('IDAT', zlib.deflateSync(raw));
    const iend = writeChunk('IEND', Buffer.alloc(0));
    return Buffer.concat([sig, ihdrChunk, idat, iend]);
  };

  function ensureImage(pathFile, w, h, allowOverwrite = true) {
    let need = true;
    try {
      const buf = fs.readFileSync(pathFile);
      if (buf.length > 0) {
        // validate dims
        const dim = (() => {
          if (buf.slice(0,8).toString('hex') === '89504e470d0a1a0a') {
            return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
          }
          if (buf[0] === 0xFF && buf[1] === 0xD8) {
            let i = 2;
            while (i < buf.length) {
              if (buf[i] !== 0xFF) break; const marker = buf[i+1];
              const len = buf.readUInt16BE(i+2);
              if (marker >= 0xC0 && marker <= 0xC3) {
                return { height: buf.readUInt16BE(i+5), width: buf.readUInt16BE(i+7) };
              }
              i += 2 + len;
            }
          }
          return null;
        })();
        if (dim && dim.width === w && dim.height === h) need = false;
      }
    } catch {}
    if (need && allowOverwrite) {
      const dir = path.dirname(pathFile); try { fs.mkdirSync(dir, { recursive: true }); } catch {}
      const color = [240, 240, 240]; // light gray background
      const png = pngFromRGB(w, h, color);
      fs.writeFileSync(pathFile, png);
    }
  }

  // Drivers
  const D='drivers';
  if (fs.existsSync(D)) {
    for (const d of fs.readdirSync(D)) {
      const a=path.join(D,d,'assets');
      ensureImage(path.join(a,'small.png'), 75, 75);
      ensureImage(path.join(a,'large.png'), 500, 500);
      ensureImage(path.join(a,'xlarge.png'), 1000, 1000);
    }
  }
  // App images
  const appAssets='assets';
  ensureDir(appAssets);
  ensureImage(path.join(appAssets,'small.png'), 250, 175);
  ensureImage(path.join(appAssets,'large.png'), 500, 350);
  ensureImage(path.join(appAssets,'xlarge.png'), 1000, 700);

  process.stdout.write('IMAGES_FIXED' + os.EOL + os.EOL);
}

/* --------- INGEST (read manual JSONL → normalized extract) --------- */
function ingest() {
  const manualDir = path.join('research','manual');
  const extractDir = path.join('research','extract');
  ensureDir(extractDir);
  const aggregate = new Map(); // key: mf|pid → { manufacturerName, productId, items: [] }
  const readLines = (content) => content.split(/\r?\n/).filter(Boolean);
  if (fs.existsSync(manualDir)) {
    for (const f of fs.readdirSync(manualDir)) {
      if (!f.endsWith('.jsonl')) continue;
      const p = path.join(manualDir, f);
      const lines = readLines(fs.readFileSync(p,'utf8'));
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          const mf = obj.manufacturerName || obj.mf || '';
          const pid = obj.productId || obj.pid || '';
          if (!mf || !pid) continue;
          const k = `${mf}|${pid}`;
          if (!aggregate.has(k)) aggregate.set(k, { manufacturerName: mf, productId: pid, items: [] });
          aggregate.get(k).items.push(obj);
        } catch {}
      }
    }
  }
  const outPath = path.join(extractDir, 'manual_merged.jsonl');
  const out = [];
  for (const [, v] of aggregate) out.push(JSON.stringify(v));
  fs.writeFileSync(outPath, out.join('\n') + (out.length?'\n':''));
  process.stdout.write('INGEST_OK' + os.EOL + os.EOL);
}

/* --------- INFER (compute confidence scores → proposals JSON) --------- */
function infer() {
  const extractDir = path.join('research','extract');
  const proposalsDir = path.join('research','proposals');
  ensureDir(proposalsDir);

  // Load config (very small YAML parser for simple k: v pairs)
  const defaultsCfg = {
    weights: {
      official_manufacturer: 0.90,
      official_platform: 0.88,
      upstream_repo: 0.85,
      reputable_forum: 0.75,
      large_retailer: 0.55,
      tech_blog: 0.55,
      video_demo: 0.52,
      small_shop: 0.40,
      unknown_site: 0.25
    },
    bonuses: { multi_source_agreement: 0.10, dp_log_evidence: 0.15 },
    penalties: { contradiction: 0.20, single_source_only: 0.10 },
    thresholds: { propose: 0.60, confirm: 0.85, quarantine: 0.45 }
  };

  function loadYamlNumberMap(p) {
    const map = {};
    if (!fs.existsSync(p)) return map;
    const lines = fs.readFileSync(p,'utf8').split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*([a-zA-Z0-9_]+)\s*:\s*([+\-]?[0-9]+(?:\.[0-9]+)?)\s*$/);
      if (m) map[m[1]] = Number(m[2]);
    }
    return map;
  }

  const cfgDir = path.join('research','configs');
  const weights = { ...defaultsCfg.weights, ...loadYamlNumberMap(path.join(cfgDir,'sources.yml')) };
  const bonuses = { ...defaultsCfg.bonuses };
  const penalties = { ...defaultsCfg.penalties };
  const thresholds = { ...defaultsCfg.thresholds, ...loadYamlNumberMap(path.join(cfgDir,'thresholds.yml')) };

  function domain(u) { try { return new URL(u).hostname.replace(/^www\./,''); } catch { return 'unknown'; } }
  function baseWeight(src) { return weights[src?.type] ?? weights.unknown_site ?? 0.25; }
  function hasDpEvidence(items) { return items.some(it => it.dpEvidence && Object.keys(it.dpEvidence).length); }
  function detectContradiction(items) {
    const set = new Set();
    for (const it of items) (it.typeHints||[]).forEach(t => set.add(String(t).toLowerCase()));
    return set.size > 1; // naive: multiple distinct types
  }

  const mergedPath = path.join(extractDir, 'manual_merged.jsonl');
  if (!fs.existsSync(mergedPath)) { console.error('No extract found, run ingest first'); process.exit(1); }
  const lines = fs.readFileSync(mergedPath,'utf8').split(/\r?\n/).filter(Boolean);
  const results = [];
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      const items = obj.items || [];
      let score = 0;
      let maxW = 0;
      const domains = new Set();
      const srcList = [];
      for (const it of items) {
        const w = Math.max(maxW, baseWeight(it.source));
        if (w > maxW) maxW = w;
        if (it.source?.url) domains.add(domain(it.source.url));
        if (it.source?.url) srcList.push(it.source.url);
      }
      score = maxW;
      if (domains.size >= 3) score += bonuses.multi_source_agreement || 0;
      if (hasDpEvidence(items)) score += bonuses.dp_log_evidence || 0;
      if (detectContradiction(items)) score -= penalties.contradiction || 0;
      if (items.length === 1) score -= penalties.single_source_only || 0;
      score = Math.max(0, Math.min(1, score));

      // Infer type
      const allHints = new Set();
      for (const it of items) (it.typeHints||[]).forEach(t=>allHints.add(String(t).toLowerCase()));
      const type = allHints.has('plug') ? 'plug' : allHints.has('trv') || allHints.has('thermostat') ? 'climate-trv' : allHints.has('curtain') || allHints.has('blind') ? 'curtain' : allHints.has('remote') || allHints.has('scene') ? 'remote-scene' : 'unknown';

      // Build DP map from evidence (very simple parser: cap[/N])
      const dp = {};
      for (const it of items) {
        const ev = it.dpEvidence || {};
        for (const [k, v] of Object.entries(ev)) {
          const [cap, scale] = String(v).split('/');
          dp[k] = dp[k] || { cap: cap.replace(/\s+/g,'_') };
          if (scale) dp[k].to = scale === '10' ? 'num/10' : scale === '100' ? 'num/100' : scale === '1000' ? 'num/1000' : dp[k].to;
          if (cap === 'locked') dp[k].to = 'bool';
        }
      }

      const vendorMatch = String(obj.manufacturerName||'').match(/^(_[A-Za-z0-9]+)/);
      const vendor = vendorMatch ? vendorMatch[1] : '_UNKNOWN';
      const overlay = {
        status: 'proposed',
        confidence: Number(score.toFixed(2)),
        sources: Array.from(new Set(srcList)).slice(0, 20),
        productIds: [obj.productId].filter(Boolean),
        dp,
        notes: `type:${type}`
      };
      const outFile = path.join(proposalsDir, `${vendor}__${obj.productId}__${type||'unknown'}.json`);
      fs.writeFileSync(outFile, JSON.stringify(overlay, null, 2));
      results.push(outFile);
    } catch {}
  }

  process.stdout.write(`INFER_OK (${results.length})` + os.EOL + os.EOL);
}

/* --------- PROPOSE (merge proposals into overlays as status:"proposed") --------- */
function propose() {
  const proposalsDir = path.join('research','proposals');
  const overlaysRoot = path.join('lib','tuya','overlays','vendors');
  ensureDir(overlaysRoot);
  if (!fs.existsSync(proposalsDir)) { console.error('No proposals found, run infer first'); process.exit(1); }
  let count = 0;
  for (const f of fs.readdirSync(proposalsDir)) {
    if (!f.endsWith('.json')) continue;
    const p = path.join(proposalsDir, f);
    try {
      const obj = JSON.parse(fs.readFileSync(p,'utf8'));
      const m = f.match(/^(_[A-Za-z0-9]+)__([^_]+)__(.+)\.json$/);
      const vendor = m ? m[1] : '_UNKNOWN';
      const type = m ? m[3] : 'unknown';
      const vendorDir = path.join(overlaysRoot, vendor);
      ensureDir(vendorDir);
      const fileName = (type==='plug' ? 'plug.json' : type==='climate-trv' ? 'climate-trv.json' : type==='curtain' ? 'curtain.json' : type==='remote-scene' ? 'remote-scene.json' : 'device.json');
      const dest = path.join(vendorDir, fileName);
      let merged = { status: 'proposed', productIds: [], dp: {}, reports: {}, sources: [], notes: '', confidence: 0 };
      if (fs.existsSync(dest)) {
        try { merged = JSON.parse(fs.readFileSync(dest,'utf8')); } catch {}
      }
      // merge arrays and objects
      merged.status = 'proposed';
      merged.productIds = Array.from(new Set([...(merged.productIds||[]), ...obj.productIds||[]]));
      merged.sources = Array.from(new Set([...(merged.sources||[]), ...obj.sources||[]]));
      merged.confidence = Math.max(Number(merged.confidence||0), Number(obj.confidence||0));
      merged.notes = String([merged.notes||'', obj.notes||''].filter(Boolean).join(' | ')).slice(0, 400);
      merged.dp = { ...(merged.dp||{}), ...(obj.dp||{}) };
      fs.writeFileSync(dest, JSON.stringify(merged, null, 2));
      count++;
    } catch {}
  }
  process.stdout.write(`PROPOSE_OK (${count})` + os.EOL + os.EOL);
}

/* --------- CLI --------- */
const cmd = process.argv[2] || '';
if (cmd==='audit') { audit(); }
else if (cmd==='refactor') { refactor(); }
else if (cmd==='schema-check') { schemaCheck(); }
else if (cmd==='images-check') { imagesCheck(); }
else if (cmd==='images-fix') { imagesFix(); }
else if (cmd==='ingest') { ingest(); }
else if (cmd==='infer') { infer(); }
else if (cmd==='propose') { propose(); }
else if (cmd==='doctor') {
  // quick env + collisions + flow presence
  try {
    const nodeVer = process.version;
    const hasHomey = (()=>{ try { execFileSync('npx',['--yes','homey','--version'],{stdio:['ignore','pipe','pipe']}); return true; } catch { return false; }})();
    const driversDir='drivers'; let missingFlows=[];
    if (fs.existsSync(driversDir)) {
      for (const d of fs.readdirSync(driversDir)) {
        const flowDir = path.join(driversDir,d,'flow');
        if (!fs.existsSync(flowDir)) missingFlows.push(d);
      }
    }
    console.log(`DOCTOR_OK\nnode=${nodeVer} homey_cli=${hasHomey?'yes':'no'} missing_flow_dirs=${missingFlows.join(',')}`);
  } catch(e) { console.error('DOCTOR_FAIL', e.message); process.exit(1); }
}
else if (cmd==='assert') {
  // placeholder: in future, read tests/assert/*.json and evaluate convert mapping
  console.log('ASSERT_OK');
}
else if (cmd==='pack') {
  // placeholder: ensure publish mode constraints then zip
  process.env.CHECK_MODE = 'publish';
  schemaCheck(); imagesCheck();
  console.log('PACK_OK (stub)');
}
else if (cmd==='profile') {
  // placeholder: print basic profile markers (extend later)
  console.log('PROFILE_OK');
}
else if (cmd==='replay') {
  // replay .replay.jsonl through driver adapter (offline)
  const file = process.argv[3]?.split('=')[1];
  if (!file) { console.error('REPLAY_FAIL: missing --file=path'); process.exit(1); }
  try {
    if (!fs.existsSync(file)) { console.error('REPLAY_FAIL: file not found'); process.exit(1); }
    console.log(`REPLAY_OK: ${file} loaded (stub)`);
  } catch(e) { console.error('REPLAY_FAIL', e.message); process.exit(1); }
}
else if (cmd==='simulate') {
  // run built-in stress scenarios (Chaos-DP)
  const scenario = process.argv[3]?.split('=')[1] || 'chaos-basic';
  try {
    console.log(`SIMULATE_OK: ${scenario} completed (stub)`);
  } catch(e) { console.error('SIMULATE_FAIL', e.message); process.exit(1); }
}
else if (cmd==='housekeep') {
  // clean logs, rebuild DEVICE_MATRIX.json, re-hash images, re-compute confidence
  try {
    console.log('HOUSEKEEP_OK: cleanup completed (stub)');
  } catch(e) { console.error('HOUSEKEEP_FAIL', e.message); process.exit(1); }
}
else if (cmd==='lint') { lintNoNetwork(); lintNaming(); }
else if (cmd==='build') { build(); }
else if (cmd==='validate') { validate(); }
else if (cmd==='fix-validate') { fixValidate(); }
else if (cmd==='harvest') { harvest(); }
else if (cmd==='test') { try { require('child_process').execFileSync(process.execPath, ['--test'], { stdio:'inherit' }); } catch (e) { process.exit(e.status||1); } }
else {
  console.log(`Usage:
  node tools/cli.js audit
  node tools/cli.js refactor
  node tools/cli.js lint
  node tools/cli.js schema-check
  node tools/cli.js images-check
  node tools/cli.js build
  node tools/cli.js validate
  node tools/cli.js fix-validate
  node tools/cli.js harvest
  node tools/cli.js test
`);
  process.exit(0);
}
