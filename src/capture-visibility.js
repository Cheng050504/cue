// Whether cue's windows show up in screen shares and recordings. By default
// they are hidden (setContentProtection(true)); the toolbar's eye button sets
// settings.allowCapture to let a capture see them. main.js passes the platform
// facts in `env`, so this stays testable without Electron.

/**
 * @param {Array<{ setContentProtection(v: boolean): void, isDestroyed(): boolean }>} windows
 * @param {boolean} allowCapture
 * @param {{ isLinux: boolean, winSupports: boolean, localConsole: boolean, noProtectEnv: boolean }} env
 * @returns {'visible'|'hidden'|'unsupported'}
 */
function applyCaptureVisibility(windows, allowCapture, env) {
  // Same conditions main.js has always used before calling setContentProtection:
  // no-op on Linux, unsupported on Windows < 19041, and skipped on a remote
  // Windows session (it blanks the window for the user too) or with CUE_NO_PROTECT.
  if (env.noProtectEnv || !env.localConsole || env.isLinux || !env.winSupports) return 'unsupported';
  for (const w of windows || []) {
    if (!w || (typeof w.isDestroyed === 'function' && w.isDestroyed())) continue;
    w.setContentProtection(!allowCapture);
  }
  return allowCapture ? 'visible' : 'hidden';
}

module.exports = { applyCaptureVisibility };
