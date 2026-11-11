// cancel(): the auto-answer restart stops the running answer on purpose.
// It aborts the request and rejects `expired` with an error marked cancelled.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { giveUpTimer } = require('../src/give-up');

test('cancel_abortsAndRejectsAsCancelled', async () => {
  const g = giveUpTimer(60000, 'timed out');
  g.cancel();
  assert.equal(g.signal.aborted, true);
  await assert.rejects(g.expired, (e) => e.cancelled === true);
});

test('cancel_afterClear_isHarmless', () => {
  const g = giveUpTimer(60000, 'timed out');
  g.clear();
  g.cancel();
  assert.equal(g.signal.aborted, true);
});
