// P3057-3: node:test reporter that records only leaf failures as JSON lines ({file, name}).
// A parent "N subtests failed" event is skipped so one broken assertion is one baseline entry.
// Uses only the documented reporter stream (async iterable of {type, data}), Node >= 20.
import path from 'node:path';

export default async function* failReporter(source) {
  const root = process.cwd();
  for await (const event of source) {
    if (event.type !== 'test:fail') {continue;}
    const d = event.data || {};
    const err = (d.details && d.details.error) || {};
    if (err.failureType === 'subtestsFailed') {continue;}
    const file = d.file ? path.relative(root, d.file).split(path.sep).join('/') : '';
    yield `${JSON.stringify({ file, name: String(d.name || ''), type: err.failureType || '', msg: String((err.cause && err.cause.message) || err.message || '').slice(0, 300) })}\n`;
  }
}
