# Can the current layout explain a processing sequence?

This is an experiment, not a change to the production layout or the JSON contracts.
All architecture information is fictional. No LLM is used in either layout.

**Recorded: 2026-09-08.** The decision following this experiment is to keep
[deterministic JSON 1 → JSON 2 generation](../../docs/decisions/001-deterministic-layout.md).

## Exact setup

- Runtime used: Node.js v25.8.0 on macOS (`darwin`, `arm64`); Python 3.9.6
  serves the optional browser preview only. The package declares Node.js >=20;
  the recorded numbers were obtained with the runtime above.
- Dependencies: `elkjs` 0.12.0 and `ajv` 8.17.1, installed from the root
  [package lock](../../package-lock.json).
- Input: [fixture.mjs](fixture.mjs) produces [generated/model.json](generated/model.json),
  a JSON 1 `0.2-draft` with six entities, five established relationships, one
  established behavior note, and no groups, memberships, or perspectives.
  [evidence.md](evidence.md) stipulates the complete fictional scenario.
- Baseline: the unmodified [production layout module](../../modules/layout/index.mjs).
  Comparison: [placement.mjs](placement.mjs). Evaluation: [run.mjs](run.mjs).
- Both use ELK layered layout, RIGHT direction, ORTHOGONAL routes,
  INCLUDE_CHILDREN hierarchy handling, ROOT edge coordinates, seed `1`, and
  ID-sorted input. Node spacing is 80; between-layer node spacing 110;
  edge-to-node spacing 35 (also between layers); edge-label spacing 16;
  canvas padding 36 on every side. Edge labels are centered. These options
  are fixed in the code, with no search over seeds or hand-tuned positions.
- The comparison reuses the baseline's measured node and label sizes. For
  this fixture each node is 232 × 124. Labels use the production wrapping
  and conservative text metrics. The only placement-policy difference is
  reversing the two `consumes` relationships in the temporary graph.
- The 1200px viewport is an evaluation reference, not the browser window's
  required size. Fit scale is `min(1, 1200 / canvas.width)`.

[recorded-run.json](recorded-run.json) preserves the original measurements,
runtime information, and SHA-256 hashes of the relevant source files. Unlike
`generated/`, the experiment runner does not overwrite that historical record.

## Criterion declared before running the layout

Reading task: follow one successfully processed image from upload to its index
record. The fixture explicitly establishes this sequence:

Upload API → Upload Queue → Resize Worker → Resized Queue → Index Worker → Index DB.

With a RIGHT layout, a transition passes when the next stage's left boundary is
at or beyond the preceding stage's right boundary. Report the count out of five;
do not change the criterion after seeing the drawing. A complete left-to-right
reading requires 5/5. This is a task-specific proxy, not a universal readability
score or a measured human-comprehension result. Also report canvas dimensions
and the scale needed to fit a 1200px-wide viewport, so a wider drawing cannot be
declared unconditionally better.

The operation contract is unchanged: a worker **consumes from** a queue, so its
arrow points worker → queue. The processing sequence comes from the explicitly
stipulated fixture behavior, not from assuming every chain of dependencies is a
runtime sequence. Retries and failure paths are out of scope.

## Comparison

- **Current:** call the actual exported `layoutModel(model, {direction: 'RIGHT'})`.
- **Experimental:** use the same node/label dimensions and ELK configuration,
  reversing `consumes` edges **only in the temporary placement graph**. Restore
  their original direction by reversing the resulting route points before
  creating JSON 2. This narrow rule fits this fixture's established processing
  sequence; it is not proposed as a default or as a general causality inference.

Both results must pass the existing JSON 2 validator against the same original
JSON 1, and both rendered SVG/HTML artifacts must recover that exact model. The
experimental engine identifier records the altered placement policy. Labels,
semantic endpoints, arrowheads, and evidence are preserved. No coordinates are
hand-tuned. There are no groups, to isolate edge direction from containment.

The experiment also changes only `scope.question` to ask about dependencies and
checks whether the current layout geometry changes. Identical geometry would
confirm that current placement ignores the question; it would not by itself
prove that a different arrangement is necessary.

## Reproduce

From the repository root:

```sh
npm ci
node experiments/pipeline-reading/run.mjs
python3 -m http.server 4178 --bind 127.0.0.1 --directory experiments/pipeline-reading
```

If the preview server is already running on 4178, reuse it; a second server is
unnecessary. Python is not needed to run the measurement and preservation checks.

Open `http://127.0.0.1:4178/generated/`. The runner writes the input model, both JSON 2s,
SVG/HTML exports, a comparison page, and `results.json`. Results are descriptive:
the runner does not assert that the current approach must fail. It does assert
source preservation, original arrow direction, and valid geometry. If a future
implementation meets the criterion, this counterexample no longer holds.

The runner prints its results and writes:

| File in `generated/` | Contents |
|---|---|
| `model.json` | Complete input JSON 1 |
| `current.json`, `processing.json` | Baseline and comparison JSON 2 |
| `current.svg`, `processing.svg` | Rendered diagrams with embedded source |
| `current.html`, `processing.html` | Full diagram inspectors |
| `index.html` | Comparison page with view and scale controls |
| `results.json` | Transition coordinates, scores, sizes, and validation checks |

Compare the new `results.json` against the `results` field in `recorded-run.json`.
Different source hashes or engine/runtime versions should be recorded when
revisiting the result. Reproduction regenerates `generated/` in place. The
existing project suite is separately runnable with `npm test`; all 52 tests
passed at the time of this record.

## Observed result with elkjs 0.12.0

| Measurement | Current layout | Experimental processing placement |
|---|---:|---:|
| Transitions entirely to the right | 3/5 | 5/5 |
| Transitions moving left | 2 | 0 |
| Canvas | 930.4 × 662 | 3392.8 × 196 |
| Scale to fit 1200px width, capped at 100% | 100% | 35% |

The current output places Upload API at bottom left, Resize Worker at middle
left, and Index Worker at top left; their resources occupy the right column.
Following an image zigzags from bottom to top. The experimental output arranges
the six stages in a single row. Both layouts pass the unchanged validator and
recover the same JSON 1 from SVG and HTML. Changing only `scope.question` leaves
current geometry identical.

Browser inspection confirmed both drawings. The alternate view's small labels
at fit width are a real cost visible in the comparison, not just a numeric
footnote. Its 100% view requires horizontal scrolling.

This result falsifies “the current RIGHT policy always follows an established
processing sequence from left to right.” It does **not** establish that the
current drawing is harder for humans to understand overall. That stronger claim
would require an agreed reading task and reader testing. Nor does this result
demonstrate any advantage for LLM layout: the alternative is conventional code.

## What this can establish

A failure can show that one current policy is suboptimal for a specified reading
task. An experimental pass shows a conventional rule can address that case.
Neither result establishes LLM superiority. Selecting among processing,
dependency, ownership, or other reading tasks remains a separate design question.

## Revisit without changing the historical conclusion

Record a new run and its setup separately. Agree on the reading task and success
criteria first, and include compactness and label readability alongside ordering.
An LLM comparison, if attempted later, must use the same JSON 1 and preservation
checks and report its model/version, instructions, attempts, cost, and latency.
Neither a different criterion nor a newly tuned baseline should be presented as
the original experiment. No LLM layout was evaluated in this recorded run.
