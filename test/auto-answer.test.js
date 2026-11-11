// Auto-answer: when the interviewer finishes a question, cue answers without
// a keypress — but never twice, never over the person's typing, and restarts
// at most once when the interviewer turns out to still be asking.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { normalizeQuestion, shouldAutoAnswer, isExtension, nextAutoAction } = require('../renderer/auto-answer');

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
  assert.equal(isExtension('same question', 'Same question.'), false);
  const s = { answeringText: 'Tell me about', resentFor: '', newText: 'Tell me about a time you failed', msSinceStart: 1500 };
  assert.equal(nextAutoAction(s), 'resend');
  assert.equal(nextAutoAction({ ...s, resentFor: 'Tell me about' }), 'none', 'only once per question');
  assert.equal(nextAutoAction({ ...s, msSinceStart: 4000 }), 'none', 'too late');
  assert.equal(nextAutoAction({ ...s, newText: 'Something else entirely' }), 'none');
  assert.equal(nextAutoAction({ ...s, answeringText: '' }), 'none', 'no auto-answer running');
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
