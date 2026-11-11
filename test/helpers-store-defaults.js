// Loads src/store.js's DEFAULTS in plain Node: store.js requires electron's
// `app`, which only exists inside Electron, so a stand-in is placed in the
// require cache first. Not a test file (no .test.js suffix).
const path = require('node:path');
const os = require('node:os');
function storeDefaults() {
  const id = require.resolve('electron');
  if (!require.cache[id] || !require.cache[id].exports.app) {
    require.cache[id] = { id, filename: id, loaded: true, exports: { app: { getPath: () => os.tmpdir() } } };
  }
  return require(path.join(__dirname, '..', 'src', 'store')).DEFAULTS;
}
module.exports = { storeDefaults };
