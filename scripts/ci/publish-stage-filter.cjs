'use strict';

/**
 * Decide whether one path is copied into the Athom staging directory.
 * The copy root is `.homeybuild`. Excluding that name must not drop the root,
 * or the staged app is empty. A nested `.homeybuild` or `.homeycompose` is
 * still left out: compose would rebuild held drivers into the payload.
 */
function keepStagedEntry(src, srcDir) {
  const path = require('path');
  const name = path.basename(src);
  if (name !== '.homeycompose' && name !== '.homeybuild') return true;
  return path.resolve(src) === path.resolve(srcDir);
}

module.exports = { keepStagedEntry };
