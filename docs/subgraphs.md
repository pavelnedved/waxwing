# Subgraphs: explicit abstraction levels

Implemented in JSON 1 **`0.4-draft`** and JSON 2 **`0.3-draft`**. Older
single-graph contracts remain supported without migration. These are experimental
contracts; they are not a universal architecture ontology.

## One registry, several graphs

Entities, relationships, sources, perspectives, memberships, notes, and documents
remain in one canonical JSON 1 registry. A graph selects existing record IDs.
The same Checkout service can appear in the overview and as external context
in an expanded graph without duplicating its identity or claims.

The model has an overall `scope`, plus `graphs` and `rootGraphRef`. Each graph
has its own complete scope, including a question, abstraction, inclusions,
omissions, environment, and snapshot. All scopes remain current and partial.
The overall scope describes the model; it does not silently override a graph's
scope. Validation does not interpret prose to prove that the scopes agree.

```json
{
  "id": "overview",
  "title": "Order system overview",
  "scope": {
    "timeframe": "current",
    "environment": "Fictional production",
    "snapshot": "Fixture v1",
    "coverage": "partial",
    "question": "Who interacts with Order Processing?",
    "includes": ["Listed services and callers"],
    "excludes": ["Service internals"],
    "abstraction": "Services; Order Processing is one box."
  },
  "entityRefs": ["checkout", "orders", "operations"],
  "contextRefs": ["payments"],
  "relationshipRefs": ["checkout-orders", "orders-payment", "ops-orders"],
  "membershipRefs": []
}
```

This is one graph record, not a complete model. See the
[complete authoring example](../examples/subgraphs/model.json).

| Field | Meaning |
|---|---|
| `entityRefs` | Components represented inside this graph's declared scope; at least one. |
| `contextRefs` | Components outside that scope, shown to explain its connections. May be empty. |
| `relationshipRefs` | Exact relationships to show. Both endpoints must appear in this graph. |
| `membershipRefs` | Grouping claims explicitly available at this level. May be empty. |
| `expands` | For a child graph: its parent graph/node, qualified meaning, and boundary mappings. |

Internal/context selections are authored scope declarations, not inferred
ownership or deployment boundaries. They are disjoint within a graph. The
qualified `expands.meaning` explains the interpretation linking a child to its
parent. Being internal at the overview level does not make Checkout internal
to Order Processing when that service is expanded.

IDs are unique across the model ID and all record collections, including graphs.
Every non-root graph expands one internal node in an included parent graph.
The root has no parent. Expansion relationships form an acyclic hierarchy;
ordinary runtime edge cycles remain legal. More than two levels work, and
several separately scoped child graphs may expand the same parent node. A graph
has one parent in this draft. The expanded node cannot appear in its own child
graph as an internal or context node.

Registry records can remain outside all graphs; their complete information still
travels in JSON 2 and is available through the model catalog/source. Layout
must represent every selected node and edge, not every registry record on every
canvas. Selection and omission belong to JSON 1, never the layout algorithm.

## Connections between levels

A child graph records an `expands` object. For example:

```json
{
  "graphRef": "overview",
  "nodeRef": "orders",
  "meaning": {
    "status": "established",
    "value": "This partial graph expands Order Processing.",
    "basis": {
      "sourceRefs": ["fictional-snapshot"],
      "explanation": "The fixture explicitly identifies these internals."
    }
  },
  "boundaries": [
    {
      "relationshipRef": "checkout-orders",
      "detail": {
        "status": "established",
        "value": ["checkout-api"],
        "basis": {
          "sourceRefs": ["fictional-snapshot"],
          "explanation": "The overview submission call lands on Order API."
        }
      }
    }
  ]
}
```

The example above illustrates one mapping. A real expansion must account for
**every parent graph edge touching the expanded node exactly once**. If there
is no known correspondence, record it explicitly:

```json
{
  "relationshipRef": "orders-payment",
  "detail": {
    "status": "unknown",
    "reason": "The snapshot does not identify the internal payment caller."
  }
}
```

`detail` uses the existing knowledge states. An asserted `value` is a nonempty
array of detailed edge IDs. Several IDs mean the correspondence includes those
edges together; it does not define execution order. A dispute has alternative
arrays, each with its own status and basis, and no selected winner. Reordering
the same set does not create a distinct disputed alternative.

For every asserted or disputed candidate, the validator checks:

1. The detailed edge exists and is selected by the child graph.
2. Its operation kind matches the parent edge.
3. The expanded endpoint maps to an internal child component.
4. Any other endpoint retains the same canonical identity, is external context
   in the child, and remains on the same side of the arrow.
5. Its condition is identical to the parent condition as parsed JSON, including
   knowledge status and evidence. Both may omit the condition.

For a parent self-edge, both detailed endpoints must be internal; direction is
still whatever the explicitly recorded detailed edge declares.

These are correspondence checks, not proofs that a relationship exists. Edge
existence and mapping knowledge retain their separate qualifications. The
renderer draws only explicitly selected relationship records with their own
existence styling. An unknown mapping creates **no** inferred edge; a disputed
mapping selects **no** winner. Candidate edges must be authored with appropriate
existence qualifications. Software cannot establish their real-world truth.

This first contract describes corresponding boundary operations. It does not
map one overview call to an arbitrary internal path, translate between different
operation kinds, or prove implication between differently worded conditions.
Those require an explicit future extension. Child graphs may show additional
operations absent from the partial overview; a mapping is not a claim that
either graph is exhaustive.

## Ownership and grouping

Each graph explicitly selects `membershipRefs`. Selecting a parent's ownership
claim does not create memberships for the child graph or its internal components.
Perspective records carry their own meaning, scope, and period. Different
ownership responsibilities/scopes use different perspective records. Competing
answers within the same subject and perspective remain a disputed claim.

The current CLI's `--group` selects one perspective for all graph layouts.
Only each graph's selected memberships can produce frames, and only when both
membership and group meaning are established. JSON 2 stores the grouping
selection separately for each graph; another producer can choose it per graph.

## Documents and portable navigation

The existing document loader and Markdown rules still apply. Files can remain
in arbitrary folders. Graph definitions are inline in the canonical model for
this first implementation; there is no recursive graph-file loader or forced
directory convention. A custom producer may assemble JSON 1 however it chooses.

Graph attachments use `{ "kind": "graph", "ref": "order-internals" }`.
Node/edge attachments may add `graphRef` to restrict the attachment to that
graph; without it, the document explains that canonical record in any graph
showing it. Attachments never propagate from a parent node to its internals.

Markdown links can explicitly name their graph:

```markdown
[Internals](#graph=order-internals)
[Checkout in context](#graph=order-internals&node=checkout)
[API submission](#graph=order-internals&edge=checkout-api)
```

The last two resolve to `{kind, ref, graphRef}` targets. A link with only
`#node=id` or `#edge=id` is accepted in authored Markdown only when exactly one
graph shows the record. Otherwise name the graph; the loader does not guess.
Normal relative `.md` links still resolve through registered document IDs.

The portable viewer also handles a manually entered unqualified node/edge URL:
if several graphs show it, it offers a graph choice. A scoped reference whose
record is absent from that graph fails explicitly. Node clicks retain their
current graph context. Reload and browser history use the URL fragment.

HTML contains all graphs, rendered Markdown, supported embedded images, source,
and viewer code in one file. Navigation does not require routes, a service,
separate HTML pages, or the source directories. Direct-file opening remains
unverified in the current browser environment; see [verification](verification.md).

## JSON 2 and module entry points

JSON 2 `0.3-draft` contains `schemaVersion`, `model`, `modelDigest`, and `graphs`.
Each `graphs[]` entry has `ref`, `layout`, `canvas`, `nodes`, `groups`, and `edges`.
Coordinates are local to that graph's canvas. There is one complete source model,
not independent copies under each graph. Coverage and geometry checks run for
every graph. The layout adapter calls the same deterministic ELK implementation
for each explicitly selected graph.

```js
import { graphsOf, rootGraph, projectGraph } from '@isought/waxwing/graphs';
import { layoutModel } from '@isought/waxwing/layout';
import { renderHTML, renderSVG } from '@isought/waxwing/render';

const json2 = await layoutModel(json1);
const html = renderHTML(json2); // All graphs and documents.
const overviewSVG = renderSVG(json2); // Root graph, complete source embedded.
const detailSVG = renderSVG(json2, { graphRef: 'order-internals' });
```

`graphsOf` also presents an older model as its one implicit graph. `rootGraph`
returns its entry graph ID. `projectGraph` is a layout adapter input with selected
records; it intentionally does not contain the complete source or documents.
Use the original JSON 1 for reading, editing, or export. Projection must never
be substituted for the canonical model in an artifact.

```sh
npm run demo:subgraphs
node bin/waxwing.mjs render examples/subgraphs/generated/layout.json /tmp/internals.svg --graph order-internals
node bin/waxwing.mjs recover /tmp/internals.svg /tmp/recovered-model.json
```

`build` emits `layout.json`, one root `diagram.svg`, and an all-graphs
`diagram.html`. SVG is a static picture of the selected graph, with a
`data-graph-ref` attribute and the complete JSON 2 source. Its recovery returns
all original JSON 1, not only that visible graph. The HTML SVG download captures
the current graph; JSON downloads contain the complete model/layout. Ordinary
SVG image viewers do not provide the HTML graph and document navigation.

For separate parent/child HTML pages with generated links, use the optional
[site exporter](site-export.md). The same source relationships and boundary claims
apply; no folder arrangement establishes a parent/child relationship.
