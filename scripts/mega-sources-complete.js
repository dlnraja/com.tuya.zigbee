'use strict';
const { spawnSync } = require('child_process');
function run(c,a){return spawnSync(c,a,{stdio:'inherit',shell:process.platform==='win32'}).status===0;}
function tryRun(c,a){try {return run(c,a);}} catch (error) {return false;}}
function log(m){console.log('[mega]',m);}
function envFlag(name,def){const v=process.env[name];if(v==null||v==='')return def;return /^0|false|no$/i.test(String(v))?false:true;}

(function(){
  const ENRICH_ONLY   = envFlag('ENRICH_ONLY', true);
  const NO_REWRITE    = envFlag('NO_REWRITE', true);
  const NO_DELETE     = envFlag('NO_DELETE', true);
  const DO_MIGRATE    = envFlag('DO_MIGRATE', true);
  const PERSIST_TMP   = envFlag('PERSIST_TMP', true);
  const KEEP_BACKUP   = envFlag('KEEP_BACKUP', true);
  const SKIP_NPM      = envFlag('SKIP_NPM', true);
  const SKIP_VALIDATE = envFlag('SKIP_VALIDATE', true);
  const SKIP_RUN      = envFlag('SKIP_RUN', true);
  const SKIP_GIT_PUSH = envFlag('SKIP_GIT_PUSH', false);
  const PROGRESSIVE   = envFlag('PROGRESSIVE', true);

  process.env.CI='1';process.env.NODE_ENV=process.env.NODE_ENV||'production';

  if (PROGRESSIVE) {
    log('ENRICHMENT MODE: restore → fixpkg → z2m-seed(batch) → enrich-only → reorg(prudent) → verify → diag(--fix) → assets → small → reindex → dash → push');
    if(PERSIST_TMP && KEEP_BACKUP) tryRun('node',['scripts/normalize-backup.js']);
    tryRun('node',['scripts/sources/local/restore-tmp-sources.js']);
    tryRun('node',['scripts/fix-package.js']);
    tryRun('node',['scripts/sources/z2m-seed.js']);
    tryRun('node',['scripts/enrich-drivers.js','--apply','--no-rewrite']);
    if(DO_MIGRATE) tryRun('node',['scripts/migrate-meshdriver-to-zigbeedriver.js']);
    tryRun('node',['scripts/reorganize-drivers.js','--prudent']);
    tryRun('node',['scripts/verify-coherence-and-enrich.js']);
    tryRun('node',['scripts/diagnose-drivers.js','--fix','--fix-assets']);
    tryRun('node',['scripts/assets-generate.js']);
    tryRun('node',['scripts/create-small-png.js']);
    tryRun('node',['scripts/reindex-drivers.js']);
    tryRun('node',['scripts/dashboard-generator.js']);
    tryRun('node',['scripts/organize-reports.js']);
    tryRun('node',['scripts/json-lint.js']);
    tryRun('node',['scripts/validate-compose-schema.js']);
    tryRun('node',['scripts/scan-missing-required.js']);
    tryRun('node',['scripts/pipeline-health-check.js']);
    tryRun('node',['scripts/update-readme.js']);
    if(!SKIP_GIT_PUSH) tryRun('node',['scripts/git-commit-push.js','feat-progressive-batch-' + new Date().toISOString().slice(0,16).replace(/[-:T]/g,'')]);
    log('ENRICHMENT progressive done'); process.exit(0);
  }

  log('normalize backups');       tryRun('node',['scripts/normalize-backup.js']);
  log('restore tmp from backup'); tryRun('node',['scripts/sources/local/restore-tmp-sources.js']);
  log('fixpkg');                  tryRun('node',['scripts/fix-package.js']);
  log('ingest zips');             tryRun('node',['scripts/ingest-tuya-zips.js']);
  if (DO_MIGRATE) { log('migrate'); tryRun('node',['scripts/migrate-meshdriver-to-zigbeedriver.js']); tryRun('node',['scripts/fix-package.js']); }

  log('enrich');                  tryRun('node',['scripts/enrich-drivers.js','--apply']);
  log('reorganize');              tryRun('node',['scripts/reorganize-drivers.js']);
  log('verify');                  tryRun('node',['scripts/verify-coherence-and-enrich.js']);
  log('diagnose --strict');       tryRun('node',['scripts/diagnose-drivers.js','--strict']);
  log('diagnose --fix');          tryRun('node',['scripts/diagnose-drivers.js','--fix','--fix-assets']);
  log('assets');                  tryRun('node',['scripts/assets-generate.js']);
  log('small.png');               tryRun('node',['scripts/create-small-png.js']);
  log('reindex');                 tryRun('node',['scripts/reindex-drivers.js']);
  log('dashboard');               tryRun('node',['scripts/dashboard-generator.js']);
  log('organize reports');        tryRun('node',['scripts/organize-reports.js']);
  log('json lint');               tryRun('node',['scripts/json-lint.js']);
  log('compose schema');          tryRun('node',['scripts/validate-compose-schema.js']);
  log('scan missing');            tryRun('node',['scripts/scan-missing-required.js']);
  log('health');                  tryRun('node',['scripts/pipeline-health-check.js']);
  log('readme');                  tryRun('node',['scripts/update-readme.js']);
  log('sources wildcard');        tryRun('node',['scripts/sources/sources-orchestrator.js','--now']);

  if(!SKIP_NPM){
    log('npm install/ci');        
    if(!tryRun('npm',['ci'])) tryRun('npm',['install','--no-fund','--no-audit']);
    log('npm ls --only=prod');    tryRun('npm',['ls','--only=prod']);
  } else log('SKIP_NPM=1');

  if(!SKIP_VALIDATE){ log('validate'); tryRun('npx',['homey','app','validate']); } else log('SKIP_VALIDATE=1');
  if(!SKIP_RUN){ log('run'); tryRun('npx',['homey','app','run']); } else log('SKIP_RUN=1');

  tryRun('git',['config','--local','user.name',process.env.GIT_USER||'Local Dev']);
  tryRun('git',['config','--local','user.email',process.env.GIT_EMAIL||'dev@localhost']);
  tryRun('git',['add','-A']);
  tryRun('git',['commit','-m','build-full-relaunch-' + new Date().toISOString().slice(0,16).replace(/[-:T]/g,'')]);
  if(!SKIP_GIT_PUSH){ tryRun('git',['push']); } else log('SKIP_GIT_PUSH=1');

  log('done.');
})();
