import Log from './Log.js';
import { applyJqFilter } from './api/ApiCommandJq.mjs';

export function logJsonError(err, argv = {}) {
  if (argv.json) {
    Log(
      JSON.stringify(
        {
          error: err?.message ?? String(err),
        },
        null,
        2,
      ),
    );
    return;
  }

  Log.error(err);
}

export function printStructuredOutput({ value, argv = {}, printHuman }) {
  if (argv.jq) {
    Log(applyJqFilter(value, argv.jq));
    return;
  }

  if (argv.json) {
    Log(value === undefined ? 'null' : JSON.stringify(value, null, 2));
    return;
  }

  printHuman(value);
}

export default {
  logJsonError,
  printStructuredOutput,
};
