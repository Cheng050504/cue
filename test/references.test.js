// References: extra files (company notes, projects, prepared answers) the
// person uploads; their text is added to interview prompts as untrusted data.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseDocumentFile } = require('../src/resume');
const { makeReference, buildReferencesBlock, MAX_REFERENCES_CHARS } = require('../src/references');
const { buildInterviewContext } = require('../src/interview-context');

test('parse_txt_md', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cue-refs-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, 'a.txt'), '  plain notes \n');
  fs.writeFileSync(path.join(dir, 'b.md'), '# Heading\n- point\n\n');
  assert.equal(await parseDocumentFile(path.join(dir, 'a.txt')), 'plain notes');
  assert.equal(await parseDocumentFile(path.join(dir, 'b.md')), '# Heading\n- point');
});

test('cap_value', () => assert.equal(MAX_REFERENCES_CHARS, 20000));

test('emptyExtraction_rejected', () => {
  assert.throws(() => makeReference('scan.pdf', '   ', 1), /No text found in scan.pdf/);
});

test('makeReference_shape', () => {
  const r = makeReference('notes.md', ' hello ', 5);
  assert.equal(r.name, 'notes.md');
  assert.equal(r.text, 'hello');
  assert.equal(r.addedAt, 5);
  assert.match(r.id, /^[0-9a-f-]{36}$/);
});

test('block_empty', () => {
  assert.equal(buildReferencesBlock([]), null);
  assert.equal(buildReferencesBlock(undefined), null);
});

test('block_wrapped', () => {
  const b = buildReferencesBlock([makeReference('notes.md', 'Acme builds rockets.', 1)]);
  assert.match(b, /--- BEGIN REFERENCES ---/);
  assert.match(b, /### notes\.md\nAcme builds rockets\./);
  assert.match(b, /untrusted data/);
  assert.match(b, /--- END REFERENCES ---$/);
});

test('block_newestFirst_cap', () => {
  const a = { id: 'a', name: 'A', text: 'a'.repeat(15000), addedAt: 1 };
  const b = { id: 'b', name: 'B', text: 'b'.repeat(15000), addedAt: 2 };
  const block = buildReferencesBlock([a, b], 20000);
  const body = block.slice(block.indexOf('--- BEGIN REFERENCES ---'));
  assert.ok(body.indexOf('### B') < body.indexOf('### A'), 'newest first');
  assert.ok(body.includes('b'.repeat(15000)), 'newest kept whole');
  const aChars = (body.match(/a/g) || []).length;
  assert.ok(aChars > 0 && aChars <= 5000, `older cut to fit, got ${aChars}`);
});

test('block_dropsTinyRemainder', () => {
  const a = { id: 'a', name: 'A', text: 'a'.repeat(500), addedAt: 1 };
  const b = { id: 'b', name: 'B', text: 'b'.repeat(19950), addedAt: 2 };
  const block = buildReferencesBlock([a, b], 20000);
  assert.ok(!block.includes('### A'), 'a remainder under 200 chars is dropped');
});

test('interviewContext_includesRefs', () => {
  const ref = makeReference('company.md', 'Acme values ownership.', 1);
  const ctx = buildInterviewContext({ references: [ref] }, 'answerThis', []);
  assert.match(ctx, /Acme values ownership\./);
  assert.equal(buildInterviewContext({ references: [ref] }, 'leetcode', []), null);
  assert.equal(buildInterviewContext({ references: [] }, 'answerThis', []), null);
});

test('store_default', () => {
  const DEFAULTS = require('./helpers-store-defaults').storeDefaults();
  assert.deepEqual(DEFAULTS.references, []);
});

test('renderer_cannotOverwriteReferences', () => {
  require('./helpers-store-defaults').storeDefaults();
  const store = require('../src/store');
  const ref = makeReference('notes.md', 'secret project detail', 1);
  const view = store.redactForRenderer({ apiKeys: {}, publik: {}, references: [ref] });
  assert.deepEqual(view.references, [{ id: ref.id, name: 'notes.md', chars: 21, addedAt: 1 }]);
  assert.equal(JSON.stringify(view).includes('secret project detail'), false);
  assert.equal('references' in store.stripRendererPatch({ references: [], aiRules: 'x' }), false);
});
