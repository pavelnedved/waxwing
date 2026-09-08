# Independently usable modules

The MVP is one unpublished local npm package with subpath exports. Modules are
separate code entry points, not separate services or separately published npm
packages. Install dependencies with `npm ci` before using them. The package
name is `waxwing`; imports below work within this repository or when this local
package is installed by a consuming Node.js project.

## Model

```js
import { validateModel } from 'waxwing/model';

const result = validateModel(json1);
// { ok, diagnostics, summary, unresolved, qualifications, limits }
```

Uses Ajv and the model schema. It does not load the layout engine, render an
artifact, fetch evidence, or require a conversation. Invalid shapes return
diagnostics without the success-only summary fields.

## Layout

For a local model with Markdown file references, first call the optional
[document loader](documents.md):

```js
import { loadModel } from 'waxwing/documents';
const { model, inputFiles } = loadModel('/path/to/model.json');
```

It returns complete canonical JSON 1 and a list of physical input paths. The
following layout API does not read files; supply `model` as its JSON 1 input.

```js
import { layoutModel, validateLayout } from 'waxwing/layout';

const json2 = await layoutModel(json1, {
  groupingPerspectiveRef: 'system-structure',
  direction: 'RIGHT',
});
const result = validateLayout(json2, { expectedModel: json1 });
// Valid results include advisory warnings; these do not change result.ok.
```

The grouping reference is an ID from your own model; it is not a built-in
ownership/system enum. Omitting it selects no frames. Only `RIGHT` and `DOWN`
placement are supported initially. Invalid models, unsupported options, or
failed geometry throw an error, with `diagnostics` when available. Source
models are copied and remain unchanged.

ELK supplies geometry only. The adapter converts its coordinates into absolute
canvas coordinates and subjects the result to Waxwing's preservation checks.
It never invents a primary path or changes operation direction.

## Render

```js
import { renderSVG, renderHTML } from 'waxwing/render';

const svg = renderSVG(json2);
const html = renderHTML(json2);
const editorial = renderHTML(json2, { skin: 'editorial' });
```

Accepts compatible JSON 2 produced by any implementation. The renderer invokes
validation but does not load or execute ELK. It resolves labels and claims from
the model embedded in JSON 2 and returns strings; it does not write files.

To build your own renderer, consume `nodes[].box`, `groups[].box`, and
`edges[].points`/`label`, resolving `ref` against `json2.model`. All system meaning
is available there. Preserve that source payload and its qualifications if your
exports claim Waxwing's recoverability guarantee.

The [viewer reference](viewer.md) documents skins, `selectHighlights` from
`waxwing/render`, and `inspectReadability` from `waxwing/layout`. These helpers
operate independently of the HTML controls; their results do not alter source
facts or geometry.

## Artifacts

```js
import { extractLayout, recoverModel, recoverArtifact } from 'waxwing/artifacts';

const json2 = extractLayout(svgOrHtmlText);
const json1 = recoverModel(json2);
const sameModel = recoverArtifact(svgOrHtmlText);
```

`extractLayout` also accepts a JSON 2 object or its JSON text. Extraction rejects
missing or multiple payloads. `recoverModel` returns a defensive copy. These
functions use validators but neither the renderer templates nor ELK.

## Sequence diagrams

`waxwing/sequence` exports `validateSequenceModel`, `layoutSequence`,
`validateSequenceLayout`, `renderSequenceSVG`, and `renderSequenceHTML`.
It does not load ELK. The general model/layout/render/artifact entry points also
dispatch on `diagramType: "sequence"`, so existing CLI stage names work.
The source contract and geometry differ from architecture diagrams; see the
[sequence API and rules](sequence.md). Documents and complete source recovery
retain their existing behavior.

The same API accepts the [behavior version](sequence-behavior.md), with nested
loop/if blocks and direct-child body orders. Its JSON 2 adds block headers and
body regions; validation preserves source containment as well as order.
Behavior documents can also attach to a block. Version 1 scenarios keep their
original meaning and schema; neither version is converted automatically.

Both drafts accept the additive [entry declaration](sequence-entry.md). Its
participant placement and visible start cue derive from source claims; existing
artifacts without entry metadata remain supported without invented defaults.

## CLI boundary

`bin/waxwing.mjs` dynamically loads the module required for each command. Run
`node bin/waxwing.mjs --help` for command syntax. The old
`scripts/validate-model.mjs` and `lib/validate-model.mjs` remain compatibility
entry points for the initial prototype.

`validate`, `prepare`, `layout`, and `build` resolve explicitly registered
Markdown files. `prepare` saves canonical JSON 1 without laying it out. Existing
canonical models need no preparation. Render/recover do not load source files.

The CLI writes outputs via a temporary sibling file and rename. Render and
layout failures leave a previous output unchanged; inputs cannot be overwritten
by an output. `build` computes all content before writing, but its three file
replacements are individually atomic, not a filesystem transaction across the
whole bundle. Concurrent editing/writing is not coordinated by the MVP.

## Source layout

```text
modules/
  model/       JSON 1 validation
  documents/   Explicit file loading, Markdown resolution and rendering
  layout/      ELK adapter and JSON 2 validation
  render/      SVG/HTML generation, viewer assets, source recovery
  sequence/    Scenario/behavior validation, deterministic layout, SVG/HTML viewer
  shared/      canonical serialization, semantic helpers, text metrics
schemas/       JSON 1 and JSON 2 contracts
bin/           CLI orchestration and filesystem output
examples/      fictional evidence, JSON 1, generated artifacts
test/          contract, preservation, rendering, and independent CLI tests
```

To replace layout, produce JSON 2 and pass it to the renderer. To replace
rendering, consume JSON 2 directly. Neither requires adopting the future
ingestion layer. Splitting dependency installation into separately published
packages can follow later if needed.


## Graphs across abstraction levels

`waxwing/graphs` exports `graphsOf(model)`, `rootGraph(model)`, and
`projectGraph(model, graphRef)`. Projection is an internal adapter input for
layout, not a complete source export. Pass the full model to `layoutModel`;
it produces one validated geometry record per graph and embeds the complete
original source once.

`renderHTML(json2)` includes all graphs and documents. `renderSVG(json2)` draws
the root graph. `renderSVG(json2, { graphRef })` selects another graph while
retaining the complete source. The CLI equivalent is
`waxwing render layout.json detail.svg --graph graph-id`.
See [subgraphs](subgraphs.md) for model selection, mappings, and version rules.
