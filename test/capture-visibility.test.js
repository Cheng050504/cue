// The "can be captured" switch: cue's windows are hidden from screen capture
// unless the person turns allowCapture on.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { applyCaptureVisibility } = require('../src/capture-visibility');

const MAC = { isLinux: false, winSupports: true, localConsole: true, noProtectEnv: false };
function fakeWin(destroyed = false) {
  return { calls: [], setContentProtection(v) { this.calls.push(v); }, isDestroyed() { return destroyed; } };
}

test('default_hidden', () => {
  const w = fakeWin();
  assert.equal(applyCaptureVisibility([w], false, MAC), 'hidden');
  assert.deepEqual(w.calls, [true]);
});

test('toggle_visible', () => {
  const w = fakeWin();
  assert.equal(applyCaptureVisibility([w], true, MAC), 'visible');
  assert.deepEqual(w.calls, [false]);
});

test('applies_toAllWindows', () => {
  const a = fakeWin(), b = fakeWin(true), c = fakeWin();
  applyCaptureVisibility([a, b, c], true, MAC);
  assert.deepEqual(a.calls, [false]);
  assert.deepEqual(b.calls, []);
  assert.deepEqual(c.calls, [false]);
});

test('linux_unsupported', () => {
  const w = fakeWin();
  assert.equal(applyCaptureVisibility([w], false, { ...MAC, isLinux: true }), 'unsupported');
  assert.deepEqual(w.calls, []);
});

test('oldWindows_or_remoteSession_or_envOptOut_unsupported', () => {
  for (const env of [{ ...MAC, winSupports: false }, { ...MAC, localConsole: false }, { ...MAC, noProtectEnv: true }]) {
    const w = fakeWin();
    assert.equal(applyCaptureVisibility([w], false, env), 'unsupported');
    assert.deepEqual(w.calls, []);
  }
});

test('store_default', () => {
  const DEFAULTS = require('./helpers-store-defaults').storeDefaults();
  assert.equal(DEFAULTS.allowCapture, false);
});
