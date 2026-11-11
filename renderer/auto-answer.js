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

  // A new fragment needs this many real words (3+ letters, not filler) to
  // count as the question going on, so "Mm-hm." or "Okay, right." never
  // cancels a good answer.
  const MIN_EXTENSION_WORDS = 2;
  const FILLER = new Set(['okay', 'yeah', 'yes', 'yep', 'right', 'sure', 'great', 'cool', 'hmm', 'uhh', 'umm', 'nice', 'good', 'got', 'see', 'thanks', 'thank', 'the', 'and']);
  function realWords(frag) {
    return frag.split(' ').filter((w) => w.length >= 3 && !FILLER.has(w)).length;
  }

  /**
   * The auto-answer now running. `prev` is the one it replaces (a restart):
   * then `restarted` is set and carried, so a question restarts at most once
   * however many pieces the interviewer adds.
   * @returns {{ text: string, startedAt: number, restarted: boolean }}
   */
  function startAuto(text, prev, now) {
    return { text: String(text || ''), startedAt: now, restarted: !!prev };
  }

  /**
   * auto = startAuto(...) or null; s = { fragment, now, typingRecently, userTyped }.
   * 'resend' when new interviewer words extend the question shortly after cue
   * started answering it; otherwise 'none'.
   */
  function nextAutoAction(auto, s) {
    if (!auto || auto.restarted || !s) return 'none';
    if (s.typingRecently || s.userTyped) return 'none';
    if (!(s.now - auto.startedAt < EXTEND_WINDOW_MS)) return 'none';
    const frag = normalizeQuestion(s.fragment);
    if (!frag || realWords(frag) < MIN_EXTENSION_WORDS) return 'none';
    if (normalizeQuestion(auto.text).includes(frag)) return 'none'; // the same words again
    return 'resend';
  }

  const api = { EXTEND_WINDOW_MS, normalizeQuestion, shouldAutoAnswer, isExtension, startAuto, nextAutoAction };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.cueAutoAnswer = api;
})(typeof window !== 'undefined' ? window : globalThis);
