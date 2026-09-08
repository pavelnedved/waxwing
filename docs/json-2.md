# JSON 2: visual specification and complete source

**Status: experimental `0.3-draft`, containing JSON 1 `0.4-draft`.** Older JSON 2
`0.1-draft` / JSON 1 `0.2-draft` and JSON 2 `0.2-draft` / JSON 1 `0.3-draft`
remain supported. The schema
is [layout.schema.json](../schemas/layout.schema.json). A renderer can consume
this document without the original repositories, another source file, or an
LLM session.

## Contract

For multi-graph draft 0.3, the top level contains `schemaVersion`, `model`,
`modelDigest`, and `graphs`. Each `graphs[]` item identifies its graph with `ref`
and contains the `layout`, `canvas`, `nodes`, `groups`, and `edges` fields below.
Node/edge coverage is exact for that graph's JSON 1 selection. Older formats keep
these drawing fields at the top level and cover the single implicit graph.
See [subgraphs](subgraphs.md) for the full selection and correspondence rules.

| Field | Meaning |
|---|---|
| `schemaVersion` | Visual contract version. |
| `model` | Complete JSON 1, including claims not displayed on the canvas. |
| `modelDigest` | SHA-256 of recursively key-sorted JSON 1; array order is retained. |
| `layout` | Engine identity, placement direction, and explicit grouping perspective or `null`. |
| `canvas` | Width and height of the graph canvas in drawing units. |
| `nodes` | One `ref` and bounding `box` for every selected entity, including external context. |
| `groups` | Frames for eligible established grouping memberships in the selected perspective. |
| `edges` | One `ref`, unchanged `from`/`to`, orthogonal `points`, and label box per relationship. |

Boxes have `x`, `y`, `width`, and `height`. Points have `x` and `y`. All positions
are absolute in the canvas coordinate system, with the origin at the top left.
Node positions and group frames are generated; no absolute positions are
required in JSON 1. Cycles in runtime relationships are permitted.

Document-enabled models retain every original Markdown string, attachment,
resolved link, and embedded image in `model.documents`. There is no document
layout geometry: HTML document reading uses normal text flow. Documents do not
change graph topology or node placement. See [document rules](documents.md).

Labels and qualifications resolve from the embedded model through stable IDs.
They are not independently reauthored copies of system facts. Because the model
is embedded, this is still a standalone visual specification. An external
renderer can use the same geometry with its own styling.

The first renderer places node text at fixed offsets inside each box and wraps
labels with shared conservative monospace metrics. JSON 2 records edge label
boxes but not individual glyph coordinates. A custom renderer owns its font
metrics and must keep its content inside those boxes or produce a new validated
layout. This is not a universal typography interchange format yet.

## Grouping without invented authority

The caller selects one `groupingPerspectiveRef`, or none. A frame is eligible
only when membership and the referenced group's meaning are `established`.
Unknown, reported, inferred, or disputed membership does not become unqualified
containment. Empty/nonselected groups remain in the embedded model and catalog.

Nested established groups can have frames. Expandable subgraphs use separate
graph records and canvases; neither mechanism implies ownership inheritance. A parent's ownership never
silently replaces its children's assertions. The sample system view encloses
Order Worker in Order Processing while keeping its deployment-approval dispute
in the inspector. Selecting its ownership perspective produces no ownership
frame because there is no established assignment.

## Checks

`validateLayout(document, { expectedModel })` checks:

- Both schemas and JSON 1's internal consistency rules.
- Source digest; optionally exact parsed-value equality with the caller's
  original model. The layout generator always supplies that original.
- Complete, unique coverage of all graph selections and their entities/relationships.
- No invented frame, selected disputed owner, or reversed/rewired edge.
- Finite geometry, canvas containment, node overlap, correct edge endpoints,
  and orthogonal routing.
- Expected physical group containment, without enclosing unrelated entities.
- Minimum text space, label overlap, routes through nodes, and routes crossing
  another edge's label.

The validator is read-only and rejects a failed candidate rather than silently
editing system meaning. It does not prove perceptual quality, detect every
ambiguous edge crossing or shared corridor, or verify the truth of provenance.
Visible group-title clearance and actual browser font metrics still need visual
review. Arbitrary large or dense graphs are not guaranteed to lay out cleanly.

## Determinism and recovery

Deterministic code for JSON 1 → JSON 2 is the
[accepted current decision](decisions/001-deterministic-layout.md), informed by
the [recorded pipeline experiment](../experiments/pipeline-reading/README.md).
There is no LLM composition or coordinate-generation step in our implementation.

Automatic placement uses the pinned ELK version with a fixed seed and stable
input ordering. Repeated generation of the same model and options is tested for
equal JSON 2 output. A future engine/version may change geometry. SVG and HTML
rendering are pure deterministic transformations for a fixed implementation and
valid JSON 2; there are no network requests or model calls.

Both exports embed canonical JSON 2 as UTF-8/base64 inside SVG metadata:

```xml
<metadata id="waxwing-source" data-encoding="base64">...</metadata>
```

The HTML includes this SVG and a local details viewer. Base64 prevents authored
text from becoming executable markup; it is an encoding, not encryption. The
inspector uses DOM text operations for model content. Source locators are shown
as data and are not fetched automatically.

`recoverArtifact` reads the payload, validates JSON 2, and returns a copy of the
complete JSON 1. It can also accept JSON 2 directly. The recovery guarantee is
parsed JSON equality, including every unknown, alternative, evidence reference,
and explanation. Original whitespace/key ordering is not preserved. No missing
system facts or referenced document contents are reconstructed.

Source recovery verifies the embedded specification, not every pixel or XML
element of an externally edited SVG/HTML file. A recomputed digest also cannot
prove authenticity. Compare against an independently trusted JSON 1 through
`expectedModel` when that distinction matters.
