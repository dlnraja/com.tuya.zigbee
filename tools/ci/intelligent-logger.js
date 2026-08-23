'use strict';

/**
 * IntelligentLogger — CI / tools only (not Homey bundle).
 * Levels via LOG_LEVEL or INTEL_LOG_LEVEL. Soft privacy strip (no tokens/emails).
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };

function currentLevel() {
  const raw = (process.env.INTEL_LOG_LEVEL || process.env.LOG_LEVEL || 'info').toLowerCase();
  return LEVELS[raw] !== undefined ? LEVELS[raw] : LEVELS.info;
}

function scrub(s) {
  return String(s)
    .replace(/ghp_[A-Za-z0-9]{20,}/g, '[REDACTED_TOKEN]')
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [REDACTED]')
    .replace(/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]');
}

function createLogger(moduleName, opts = {}) {
  const json = !!opts.json || process.env.INTEL_LOG_JSON === '1';
  const mod = moduleName || 'ci';

  function emit(level, msg, meta) {
    if ((LEVELS[level] ?? 99) > currentLevel()) return;
    const ts = new Date().toISOString();
    const text = scrub(typeof msg === 'string' ? msg : JSON.stringify(msg));
    if (json) {
      const line = JSON.stringify({ ts, level, module: mod, msg: text, ...(meta || {}) });
      // eslint-disable-next-line no-console
      console.log(line);
      return;
    }
    const prefix = `[${ts}] [${level}] [${mod}]`;
    const extra = meta ? ` ${scrub(JSON.stringify(meta))}` : '';
    // eslint-disable-next-line no-console
    console.log(`${prefix} ${text}${extra}`);
  }

  return {
    error: (m, meta) => emit('error', m, meta),
    warn: (m, meta) => emit('warn', m, meta),
    info: (m, meta) => emit('info', m, meta),
    debug: (m, meta) => emit('debug', m, meta),
    trace: (m, meta) => emit('trace', m, meta),
    child: (name) => createLogger(`${mod}:${name}`, opts),
    time: async (label, fn) => {
      const t0 = Date.now();
      try {
        return await fn();
      } finally {
        emit('info', `${label} done`, { durationMs: Date.now() - t0 });
      }
    },
  };
}

function smoke() {
  const log = createLogger('smoke');
  log.info('intelligent-logger ok', { source: 'infra:log-smoke' });
  return true;
}

if (require.main === module) {
  smoke();
}

module.exports = { createLogger, scrub, smoke, LEVELS };
