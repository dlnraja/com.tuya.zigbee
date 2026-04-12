import { spawnSync } from 'node:child_process';

function toJsonInput(value) {
  if (typeof value === 'undefined') {
    return 'null';
  }

  return JSON.stringify(value);
}

export function applyJqFilter(value, expression) {
  if (typeof expression === 'undefined' || expression === null || expression === '') {
    return null;
  }

  const jqResult = spawnSync('jq', [expression], {
    encoding: 'utf8',
    input: toJsonInput(value),
  });

  if (jqResult.error) {
    if (jqResult.error.code === 'ENOENT') {
      throw new Error('The `jq` binary is required for --jq but was not found in PATH.');
    }

    throw new Error(`Failed to execute jq: ${jqResult.error.message}`);
  }

  if (jqResult.status !== 0) {
    const stderr = String(jqResult.stderr || '').trim();
    const stdout = String(jqResult.stdout || '').trim();
    const details = stderr || stdout || 'Unknown jq failure.';

    throw new Error(`jq failed: ${details}`);
  }

  return String(jqResult.stdout || '').trimEnd();
}

export default {
  applyJqFilter,
};
