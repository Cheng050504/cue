// Auto-answer: when the interviewer finishes a question, cue answers without
// a keypress — but never twice, never over the person's typing, and restarts
// at most once when the interviewer turns out to still be asking.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { normalizeQuestion, shouldAutoAnswer, isExtension, nextAutoAction, startAuto } = require('../renderer/auto-answer');

const BASE = { enabled: true, text: 'Tell me about yourself?', fromSTT: true, edited: false, lastAnswered: '', busy: false, typingRecently: false, complete: true };

test('answers_completeQuestion', () => assert.equal(shouldAutoAnswer(BASE), true));
test('not_whenDisabled', () => assert.equal(shouldAutoAnswer({ ...BASE, enabled: false }), false));
test('not_whenEdited', () => assert.equal(shouldAutoAnswer({ ...BASE, edited: true }), false));
test('not_whenBusy', () => assert.equal(shouldAutoAnswer({ ...BASE, busy: true }), false));
test('not_whenTyping', () => assert.equal(shouldAutoAnswer({ ...BASE, typingRecently: true }), false));
test('not_whenIncomplete', () => assert.equal(shouldAutoAnswer({ ...BASE, complete: false }), false));
test('not_whenNotFromSTT', () => assert.equal(shouldAutoAnswer({ ...BASE, fromSTT: false }), false));
test('not_whenEmpty', () => assert.equal(shouldAutoAnswer({ ...BASE, text: '  ' }), false));

test('duplicate_ignoresCaseAndPunctuation', () => {
  assert.equal(normalizeQuestion('  Why THIS company?! '), 'why this company');
  assert.equal(shouldAutoAnswer({ ...BASE, text: 'why this company', lastAnswered: normalizeQuestion('Why this company?') }), false);
});

test('extendedQuestion_resendsOnce', () => {
  assert.equal(isExtension('tell me about', 'Tell me about a time you failed'), true);
  assert.equal(isExtension('a', 'b'), false);
  // The renderer's real sequence: answer, extend, restart, extend again.
  const s1 = startAuto('Tell me about a time you failed?', null, 0);
  const base = { fragment: 'at work and what you learned', now: 1500, typingRecently: false, userTyped: false };
  assert.equal(nextAutoAction(s1, base), 'resend');
  const s2 = startAuto(s1.text + ' ' + base.fragment, s1, 1600);
  assert.equal(s2.restarted, true);
  assert.equal(nextAutoAction(s2, { ...base, fragment: 'and how you would do it differently', now: 2000 }), 'none', 'never a second restart');
  assert.equal(nextAutoAction(s1, { ...base, now: 4000 }), 'none', 'too late');
  assert.equal(nextAutoAction(null, base), 'none', 'no auto-answer running');
});

test('restart_ignoresDuplicateAndFiller', () => {
  const s1 = startAuto('Why this company?', null, 0);
  const base = { now: 1000, typingRecently: false, userTyped: false };
  assert.equal(nextAutoAction(s1, { ...base, fragment: 'why THIS company' }), 'none', 'same question again');
  assert.equal(nextAutoAction(s1, { ...base, fragment: 'Mm-hm.' }), 'none', 'filler');
  assert.equal(nextAutoAction(s1, { ...base, fragment: 'take your time' }), 'resend', 'real words still extend');
});

test('restart_respectsTyping', () => {
  const s1 = startAuto('Why this company?', null, 0);
  const base = { fragment: 'and why this role in particular', now: 1000, typingRecently: false, userTyped: false };
  assert.equal(nextAutoAction(s1, { ...base, typingRecently: true }), 'none');
  assert.equal(nextAutoAction(s1, { ...base, userTyped: true }), 'none');
});

test('store_default', () => {
  const DEFAULTS = require('./helpers-store-defaults').storeDefaults();
  assert.equal(DEFAULTS.autoAnswer, true);
});

test('answerThis_prompt_leadsWithSayableLine', () => {
  const { MODES } = require('../src/prompts');
  const sys = MODES.answerThis.buildSystem(null, '');
  assert.match(sys, /Start with one short, direct sentence the user can say immediately, then 2-4 short bullets/);
});

test('restart_ignoresMoreFiller', () => {
  const s1 = startAuto('Why this company?', null, 0);
  for (const f of ['Okay, right.', 'Yeah sure', 'mm-hm uh-huh']) {
    assert.equal(nextAutoAction(s1, { fragment: f, now: 1000, typingRecently: false, userTyped: false }), 'none', f);
  }
});
