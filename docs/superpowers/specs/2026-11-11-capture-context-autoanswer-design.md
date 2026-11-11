# Capture toggle, references, auto-answer — design

Fork: github.com/Cheng050504/cue · branch `features/capture-context-autoanswer` · base: upstream v0.2.15 (`49dde4f`).

## Goal

Make a self-built cue usable, then add three features for interview use:
a switch that lets cue's own windows be captured, uploadable reference
material beside the résumé, and automatic answers to interviewer questions.

## Out of scope

- Saving meeting audio. The transcript stays text-only, saved by the existing `meeting-memory`.
- Any change to official (token-carrying) builds' publik behaviour.
- Retrieval/embeddings for long documents. A character cap is enough for now.

## 0. Self-built builds skip the publik sign-in

**Problem:** `src/publik.js` throws "This build has no publik app token" when
no `pat_` token is found (env `PUBLIK_APP_TOKEN`, `publik-app-token.txt`, or
`src/publik-build.json`). The gate runs before any window, so a build from
source cannot start.

**Change:** `ensureSignedIn` returns a "no publik" result instead of showing
the gate when no token is found. Start-up then continues with the person's own
provider. If the saved provider is `publik`, it is switched to the first
provider that has a key (else `anthropic`). Settings hides or disables the
publik provider and shows one line: "publik isn't available in this build — use
your own key." Token-carrying builds behave exactly as before.

## 1. "Can be captured" switch

- Setting `allowCapture: boolean`, default `false` (today's behaviour: hidden).
- Toolbar button (eye icon) toggles it; IPC `capture:set` → main saves the setting
  and calls `setContentProtection(!allowCapture)` on every cue window (overlay,
  transcript sidebar, any child windows), honouring the existing platform guards
  (Linux skip, old Windows builds, non-console sessions).
- The button has an "on" style while cue is capturable; tooltip says
  "Visible to screen share" / "Hidden from screen share".
- Applied at window creation from the saved value, so it survives restarts.

## 2. References

- Setting `references: Array<{ id, name, text, addedAt }>`, default `[]`.
- Settings gets a "References" section next to Résumé / Job description:
  "Add file" (PDF, DOCX, TXT, MD; multi-select), a list with name + size + remove.
- Text extraction: extend `src/resume.js` `parseDocumentFile` with `.txt`/`.md`
  (read as UTF-8). Text is extracted once at import and stored; the file itself is not kept.
- Prompt: `src/profile-context.js` gains `appendReferences(systemPrompt, references)`,
  applied wherever `appendResumeContext` is applied (same modes; not LeetCode).
  References are wrapped as untrusted data, each with its name as a heading.
  Total cap `MAX_REFERENCES_CHARS = 20000`. Newest files are kept first, and older
  ones are trimmed or dropped when over the cap.
- Prompt wording: use the résumé and references for questions about the user's
  background, projects or the company; never invent experience; say so when the
  material doesn't cover it.
- `store.redactForRenderer` keeps sending reference names/sizes to the renderer;
  full text stays in main.

## 3. Auto-answer

- Setting `autoAnswer: boolean`, default `true`, toggle in Settings.
- Hook: the existing `questionFinalizeTimer` in `renderer/renderer.js` (1.8 s
  after the last interviewer text). When `autoAnswer` is on and
  `isLikelyCompleteQuestion(input.value)` is true, send the question through the
  same path as pressing Enter, instead of showing "Press Enter to answer".
- Guards (pure function `shouldAutoAnswer(state)` so it can be unit-tested):
  - input came from the interviewer's speech (`inputFromSTT`), and the user hasn't edited it since (`lastSTTValue` matches);
  - normalized question text differs from the last auto-answered one;
  - no answer is currently streaming;
  - the input is not focused with a recent keystroke (user typing).
- If new interviewer text arrives within ~4 s after an auto-answer started and
  extends the same question, cancel the running answer and re-send with the
  full question (once per question).
- Answer style: auto-answers use the existing interview "What should I say"
  prompt with an added instruction to put a short, direct first line first, then
  2–4 bullets.

## Testing

`npm test` (node:test). New tests:
- publik: no token → `ensureSignedIn` returns no-publik result, no throw; a `pat_` token keeps the old path.
- capture: setting default false; toggle applies `setContentProtection` with the inverse (mock window).
- references: TXT/MD parsing; `appendReferences` empty → unchanged prompt; cap/trim order; untrusted-data wrapper present.
- auto-answer: `shouldAutoAnswer` truth table (complete vs incomplete, edited, duplicate, streaming, typing).

Then `npm run pack`, install to /Applications, and try a practice call:
toggle capture in a Zoom/QuickTime screen recording, upload a reference, and
check that a spoken question gets answered with no keypress.

## Notes

- Self-built apps are signed ad-hoc, so each rebuild can create a new Screen
  Recording entry in macOS. Remove the stale "cue" entry and grant access again after installing.
