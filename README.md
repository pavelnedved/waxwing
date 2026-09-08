# Waxwing

System architecture diagrams whose meaning can be inspected, reconstructed,
and updated by humans and agents.

> If you cannot recreate it, you do not understand it.

The first local MVP implements **JSON 1 → JSON 2 → SVG / HTML**, with separate
module entry points and recovery of the complete source model from either
export. The contracts are experimental drafts, not stable releases. The example
and all its evidence are fictional.

## Try it

With Node.js 20.19.0 or newer:

```sh
npm ci
npm run demo
```

Open [the generated HTML](examples/order-processing/generated/diagram.html)
directly in a browser; it needs no server or account. Click a node, edge, group,
or open question to inspect its claims and sources. Use **100%** for readable
text and scroll to pan, or **Fit** for an overview. The viewer includes dark
and light themes and downloads for JSON 1, JSON 2, and SVG.

Start with the [fictional example](examples/order-processing/README.md), its
[JSON 1](examples/order-processing/model.json), or its
[generated JSON 2](examples/order-processing/generated/layout.json).

## Attach Markdown documents

Documents can attach to a node, an edge, or the graph. Keep `.md` files in your
existing folders, register their paths and attachments in the model, and build:

```sh
node bin/waxwing.mjs build examples/documented-orders/model.json examples/documented-orders/generated --group system-structure
```

Open [the document example](examples/documented-orders/generated/diagram.html).
Select **Documents**, or select Order Worker and open its attached guide. The
HTML includes all registered Markdown and supported local images; it does not
need the source folders to display them.

The [document and linking rules](docs/documents.md) define exactly what to expect:

- No required directory layout. Registration paths are relative to the model;
  links inside Markdown are relative to that Markdown file.
- Register each local document explicitly. The tool generates navigation from
  typed references; no HTML route configuration is needed.
- Missing destinations, broken headings, and unsupported local assets fail the
  build. Raw HTML is literal text, and remote images do not load automatically.
- Edit files and regenerate. Exported content is a complete snapshot, including
  original Markdown and resolved links.

Single-graph documents use JSON 1 `0.3-draft` and JSON 2 `0.2-draft`.
Subgraphs use JSON 1 `0.4-draft` and JSON 2 `0.3-draft`. Older models remain supported.

## Explore different abstraction levels

```sh
npm run demo:subgraphs
```

Open [the subgraph example](examples/subgraphs/generated/diagram.html). Select
Order Processing and explore its detailed graph. Breadcrumbs return to the
overview. The child shows one known correspondence, an unknown internal payment
caller, and a disputed administrative route; none is silently resolved.

Graphs select components and relationships from one shared registry, explicitly
distinguish internals from external context, and record how parent edges map to
detailed edges. Documents work at every level. The [subgraph rules](docs/subgraphs.md)
cover identity, scope, mappings, references, grouping, and current limits.

## Explicit entry and exit points

```text
Your own producer
       |
       v
    JSON 1 ── model validation
       |
  automatic layout
       |
       v
    JSON 2 ──────────────────> your own renderer
       |
  deterministic rendering
       |
       v
    SVG / HTML
       |
  source recovery
       |
       v
    complete JSON 1
```

| Entry point | Responsibility |
|---|---|
| `waxwing/model` | Validate JSON 1 without laying out or rendering. |
| `waxwing/documents` | Load registered Markdown files and assets into complete JSON 1. |
| `waxwing/graphs` | Inspect graph selections and adapt a graph for layout. |
| `waxwing/layout` | Generate and validate JSON 2; ELK supplies automatic geometry. |
| `waxwing/render` | Render a valid JSON 2 without running the layout engine. |
| `waxwing/artifacts` | Extract embedded JSON 2 and recover JSON 1. |

These are subpath exports of one local npm package. They can be imported
independently; separately published packages are not part of the MVP. See
[module usage](docs/modules.md) for JavaScript examples.

## CLI

Each stage can also run as a separate command:

```sh
node bin/waxwing.mjs validate examples/order-processing/model.json
node bin/waxwing.mjs layout examples/order-processing/model.json /tmp/layout.json --group system-structure
node bin/waxwing.mjs check-layout /tmp/layout.json
node bin/waxwing.mjs render /tmp/layout.json /tmp/diagram.svg
node bin/waxwing.mjs render /tmp/layout.json /tmp/diagram.html
node bin/waxwing.mjs recover /tmp/diagram.html /tmp/recovered-model.json
```

Layout defaults to a flat diagram with no grouping. `--group` explicitly selects
a named model perspective; only established memberships in established groups
become enclosing frames. Other claims remain available in the inspector and
embedded model. `--direction RIGHT|DOWN` changes placement, not relationships.

## What is preserved

JSON 1 holds system facts, qualified interpretations, provenance references,
scope, and abstraction. Unknowns and disputes are valid content. It contains no
coordinates.

JSON 2 contains the **complete JSON 1**, its digest, and geometry linked by
semantic IDs. Validation checks model preservation, element coverage, edge
direction, authorized grouping, and basic geometry. SVG and HTML carry the
same JSON 2 payload for recovery. Key order and whitespace may change during
serialization; the parsed JSON 1 value is preserved.

Validation checks structure and internal consistency. It does not establish
whether supplied sources are truthful, current, or complete. A digest is not
an authenticity signature, and source recovery does not certify that someone
has not edited an exported SVG's visible markup.

## MVP boundaries

- Current implementation only; no future-state topology.
- No repository/document ingestion yet. The future ingestion workflow will use
  source investigation and a checklist, with human input for intent and context.
- No visual editing, automatic factual repair, or live infrastructure discovery.
- Subgraph mappings preserve boundary operations; arbitrary internal workflow
  correspondence and recursive graph-file loading are not implemented.
- Layout and rendering use deterministic code; neither calls an LLM.
- Geometry uses conservative text metrics. Validation can reject difficult
  layouts; it does not silently omit or rewire content to make them fit.

## Development and documents

```sh
npm test
```

- [Philosophy](philosophy.md): semantic reconstruction, honesty, and portability.
- [JSON 1](docs/json-1.md): the current model contract and review decisions.
- [JSON 2](docs/json-2.md): geometry, preservation, and recovery.
- [Modules](docs/modules.md): import paths, CLI, and extension boundaries.
- [Design](design.md): broader direction and deferred work.
- [Third-party dependencies](THIRD_PARTY_NOTICES.md).
- [Verification and browser limitations](docs/verification.md).
- [Pipeline reading experiment](experiments/pipeline-reading/README.md): a reproducible comparison of dependency placement and processing order, including the width tradeoff.
- [Current layout decision](docs/decisions/001-deterministic-layout.md): keep JSON 1 → JSON 2 deterministic, with criteria for revisiting the choice.
- [Documents](docs/documents.md): implemented Markdown authoring, attachment, reference, and export rules.
- [Subgraphs](docs/subgraphs.md): implemented abstraction levels and boundary mappings.
- [Original documents/subgraphs proposal](docs/documents-and-subgraphs.md): historical design discussion.

Archify remains a design reference for structured specifications, SVG/HTML
presentation, and validation. No Archify code has been copied into this MVP.
