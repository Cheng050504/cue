// Auto-answer rules (pure functions). Loaded in the renderer as
// window.cueAutoAnswer before renderer.js, and required by
// test/auto-answer.test.js in Node. renderer.js owns the timers and state;
// this file only decides.
(function (root) {
  // How soon after an auto-answer starts the interviewer may still "extend" the
  // question and have cue restart on the full text.
  const EXTEND_WINDOW_MS = 4000;

  function normalizeQuestion(s) {
    return String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  /** s = { enabled, text, fromSTT, edited, lastAnswered, busy, typingRecently, complete } */
  function shouldAutoAnswer(s) {
    if (!s || !s.enabled || !s.fromSTT || s.edited || !s.complete || s.busy || s.typingRecently) return false;
    const q = normalizeQuestion(s.text);
    return !!q && q !== (s.lastAnswered || '');
  }

  function isExtension(prev, next) {
    const a = normalizeQuestion(prev), b = normalizeQuestion(next);
    return !!a && b.length > a.length && b.startsWith(a);
  }

  /** s = { answeringText, resentFor, newText, msSinceStart } -> 'resend' | 'none' */
  function nextAutoAction(s) {
    if (!s || !s.answeringText) return 'none';
    if (s.resentFor === s.answeringText) return 'none';
    if (!(s.msSinceStart < EXTEND_WINDOW_MS)) return 'none';
    return isExtension(s.answeringText, s.newText) ? 'resend' : 'none';
  }

  const api = { EXTEND_WINDOW_MS, normalizeQuestion, shouldAutoAnswer, isExtension, nextAutoAction };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.cueAutoAnswer = api;
})(typeof window !== 'undefined' ? window : globalThis);
