// A build from source has no publik app token. The gate must not block it:
// ensureSignedIn returns a "no publik" result without showing any screen, and
// a saved provider of "publik" is swapped for one the person has a key for.
// The token-carrying path is covered by publik-module.test.js.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MODULE = path.join(__dirname, '..', 'src', 'publik.js');

const HARNESS = `
const m = require(process.env.PUBLIK_MODULE);
(async () => {
  let screens = 0;
  const ui = { show() { screens++; return new Promise(() => {}); }, openUrl() {} };
  const gate = await Promise.race([m.ensureSignedIn(ui), new Promise((r) => setTimeout(() => r('TIMEOUT'), 3000))]);
  console.log('RESULT ' + JSON.stringify({ gate, screens }));
  process.exit(0);
})();
`;

function runHarness({ withCredential = false } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cue-notoken-'));
  if (withCredential) {
    // Left behind by an earlier official build (darwin path; the harness runs with this HOME).
    const base = process.platform === 'darwin' ? path.join(home, 'Library', 'Application Support') : path.join(home, '.config');
    const dir = path.join(base, 'publik', 'apps');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'cue.json'), JSON.stringify({ key: 'pk_live_old', base_url: 'http://127.0.0.1:9', install_id: 'x', choice: 'publik' }));
  }
  const env = { ...process.env, HOME: home, PUBLIK_MODULE: MODULE, DO_NOT_TRACK: '1' };
  delete env.XDG_CONFIG_HOME; delete env.PUBLIK_APP_TOKEN; delete env.PUBLIK_API_KEY; delete env.PUBLIK_SELF_TEST;
  return new Promise((resolve, reject) => {
    execFile(process.execPath, ['-e', HARNESS], { env, cwd: home, timeout: 10000 }, (err, stdout) => {
      if (err) return reject(err);
      const line = stdout.split('\n').find((l) => l.startsWith('RESULT '));
      resolve(JSON.parse(line.slice(7)));
    });
  });
}

test('noToken_returnsNoPublik', async () => {
  const { gate, screens } = await runHarness();
  assert.equal(screens, 0);
  assert.deepEqual(gate, { key: null, wallet: null, choice: 'own_key', noPublik: true });
});

test('noToken_switchesPublikProvider', () => {
  const { pickOwnProvider } = require('../src/own-provider');
  assert.equal(pickOwnProvider({ provider: 'publik', apiKeys: { openai: 'k' } }), 'openai');
  assert.equal(pickOwnProvider({ provider: 'publik', apiKeys: { anthropic: 'a', openai: 'k' } }), 'anthropic');
  assert.equal(pickOwnProvider({ provider: 'publik', apiKeys: {} }), 'anthropic');
  assert.equal(pickOwnProvider({ provider: 'publik' }), 'anthropic');
  assert.equal(pickOwnProvider({ provider: 'gemini', apiKeys: {} }), 'gemini');
});

test('noToken_withOldCredential_stillSkipsGate', async () => {
  const { gate, screens } = await runHarness({ withCredential: true });
  assert.equal(screens, 0);
  assert.equal(gate.noPublik, true);
});
