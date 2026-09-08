# Documents and subgraphs — design proposal

Status: historical discussion draft, 2026-09-08. **Documents and subgraphs are
now implemented.** [Documents](documents.md) and [subgraphs](subgraphs.md) are the
authoritative current contracts. The sections below preserve proposals and open
questions from before implementation; their field syntax and implementation
status are historical, not current instructions.

## Agreed direction

- A **document** attaches to a node, an edge, or a graph to explain it in detail.
- A contract is one possible use of a document, not a special type, terminal
  level, or feature. Documents have no required hierarchy.
- Subgraphs express different levels of abstraction. Documents can attach at
  any level, independently of whether a node has an expansion.
- Use Markdown files for document authoring, subject to this design review.
- JSON 1 → JSON 2 and rendering continue to use deterministic code.

## Documents

Propose a document record with a stable ID, a title, Markdown content, and one
or more explicit attachments. Reusing a document need not duplicate its text.
Attachments are typed references to an existing node, edge, or graph. They
describe what the document explains, not whether every sentence is established.

For example, a resolved record could look like this:

```json
{
  "id": "fulfillment-submission",
  "title": "Submitting an order to Fulfillment",
  "format": "markdown",
  "markdown": "# Submission behavior\n\nThe endpoint accepts...\n",
  "attachments": [
    { "kind": "edge", "graphRef": "order-overview", "ref": "worker-submit" }
  ]
}
```

The exact reference representation depends on the subgraph identity design.
Graph attachments identify the graph itself; node and edge attachments must
resolve in their declared graph. A node's documents do not automatically attach
to every internal component when that node is expanded.

### Author files; export complete content

The normal authoring experience should allow `docs/fulfillment-submission.md`
to remain an ordinary repository file, editable with existing tools. A local
authoring input can reference that file instead of including a long JSON string.
A deterministic loading step resolves those references into complete Markdown
content **before** the canonical JSON 1 is validated and passed to layout.

The resulting pipeline is:

```text
Local authoring input + .md files
              ↓ read and resolve files
       Complete JSON 1
              ↓ deterministic layout
       JSON 2, including complete JSON 1
              ↓ deterministic rendering
       SVG / HTML, including complete source
```

This loading step is filesystem assembly, not LLM ingestion or extraction of
claims from prose. Callers may still provide complete JSON 1 directly, without
using files or the loader. The exact local authoring syntax is not selected yet.

Use one content authority at each stage: a local document supplies either a
file reference or inline Markdown, never conflicting editable copies of both.
A generated artifact is a snapshot. Updating an `.md` file takes effect after
regeneration; opening an export must not silently fetch a newer version.
Relative input paths resolve from the authoring file's directory, not the shell's
working directory. Missing attached files fail assembly with a useful error.

Keep the original Markdown text in JSON 1, including formatting that the viewer
does not display. JSON 2 and SVG/HTML retain it unchanged as a string. Rendered
HTML is derived presentation; do not attempt to reconstruct Markdown from it.

### Markdown behavior and portability

Use an established Markdown parser and renderer; do not implement a custom
language. Initial content should cover headings, paragraphs, lists, links,
quotes, tables, and fenced code. Select and document the precise supported
dialect and library when implementation starts.

Do not execute embedded HTML, JavaScript, or code blocks. Raw HTML can be shown
as literal text. Generated links and image URLs need a safe protocol policy;
escaping raw HTML alone does not establish that all generated HTML is safe.
These rules govern presentation, not deletion of the stored source text.

Relative links are the main portability concern. Proposed behavior:

- Links to other included documents resolve through the exported document IDs.
- Local images and other required local assets must be included and their
  relative references resolved from the originating Markdown file. If this
  support is deferred, report unsupported required assets explicitly rather
  than claiming the document is self-contained.
- External links remain external references. Do not scrape their contents or
  load remote media automatically to make a portable artifact appear complete.
- Preserve original Markdown and keep any link/asset resolution metadata
  alongside it. Resolve presentation URLs during rendering, not by overwriting
  the source text.

Asset support and the exact Markdown dialect still need implementation scoping.
No embedded diagram language or executable Markdown extension is required.

### Linking documents and graphs without depending on a host

Proposed default: one self-contained HTML export containing all included graphs,
documents, local assets, viewer code, and styles. Documents can have separate
reading screens without being separate physical HTML files. This is a packaging
choice for our renderer, not a restriction on other JSON 2 consumers.

Internal references identify a record and, where needed, the graph in which to
show it. They do not identify a filesystem location, server endpoint, or label.
An illustrative viewer URL convention is:

| Destination | Fragment in the current HTML file |
|---|---|
| Document | `#document=fulfillment-submission` |
| Graph | `#graph=fulfillment-internals` |
| Node in a graph | `#graph=order-overview&node=fulfillment` |
| Edge in a graph | `#graph=order-overview&edge=worker-submit` |

The fragment syntax is proposed, not implemented. The viewer should use the
same resolver for attachment clicks, links in documents, subgraph navigation,
initial page load, and browser Back/Forward. Unknown or invalid targets must
produce an explicit unavailable-target message instead of silently opening a
different record. Stable record IDs should survive label and source-file changes.

Ordinary relative Markdown links remain useful in the authoring repository:

```markdown
[Submission details](./submission.md)
```

When both files are included, the loader resolves the file target to its document
ID and records that mapping alongside the unmodified Markdown. The renderer
uses it to generate an internal fragment link. Multiple documents cannot
ambiguously register the same file. A linked Markdown file is not automatically
promoted to an attached document merely because it is reachable; the authoring
input explicitly identifies the documents to include. Missing local targets
must be reported. Ordinary external URLs stay external.

Links to nodes/edges/graphs can use the documented target convention through
ordinary Markdown link syntax; no new Markdown grammar is needed. Link routing
can open a graph and then its inspector or a document reading screen. Ordinary
heading anchors within Markdown need their own per-document resolution so they
do not accidentally replace the active graph/document route.

Fragment navigation is handled in the browser; the fragment is not sent in the
request to the server ([MDN](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment)).
This avoids requiring server route rewrites, a root-domain deployment, or a
Waxwing backend. [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
can serve HTML, CSS, and JavaScript from a configured repository publishing
source. Uploading to a repository and enabling Pages are distinct steps.

Moving or renaming the HTML file leaves its internal fragment links intact.
An externally shared full URL still depends on the file's published location;
no export can preserve that URL after an arbitrary move without a redirect or
another location-maintenance mechanism. Separately exported files likewise
cannot discover each other's new locations. For now, include connected content
in one export and treat links outside it as explicit external references.

The cost is export size and snapshot-based updates. Large models or attachments
may later justify a generated static directory with relative links, without
changing record identities. That alternative is not needed for the first slice.
Direct-file opening, hosted paths beneath a repository prefix, reload with a
fragment, and Back/Forward must all be tested; existing direct-file verification
remains incomplete, so portability here is a design requirement rather than a
newly verified capability.

### Relationship to existing claims

Documents provide explanation; attaching them does not automatically turn prose
into structured facts or into executable layout constraints. Existing notes
continue to hold concise qualified assertions. They and other claims can cite
a document through provenance when appropriate, with their own status and basis.

Do not assign one blanket truth status to an entire document containing mixed
claims. Authors can explain uncertainty in Markdown, but software cannot promise
to identify or reconcile every contradiction between prose and structured data.
Document attachment does not establish such consistency.

## Subgraphs

Propose separately identified graphs, each with an explicit scope, question,
abstraction description, and references to the entities and relationships it
shows. A subgraph explicitly expands a node in a parent graph. This differs
from a grouping frame: a frame groups records at the current level, while an
expansion explains the represented contents at another level.

For example, an overview has `Order Worker → Fulfillment`. Opening Fulfillment
shows Dispatcher, Warehouse Adapter, and Shipment Store. The subgraph records
that it expands the overview's Fulfillment node and which internals are omitted.
An expansion must not imply that its partial inventory is exhaustive.

The parent relationship must correspond explicitly to the detailed boundary:
if the worker's call reaches Dispatcher, record that mapping with evidence and
qualification. If the internal endpoint is unknown or disputed, record that
state and do not silently select an internal node or draw an established edge.
Direction and relationship meaning must remain consistent across levels.

Ownership and grouping do not automatically inherit from parent to child.
Each graph's scope and perspective remain explicit. Do not copy parent claims
onto children or reuse one ID for unrelated components to make navigation work.
Expansion links must not create an infinite parent/child loop; runtime graph
cycles remain permitted.

Before implementation, settle entity identity across graphs and the exact
qualified boundary-mapping structure. One canonical registry of entities and
relationships, referenced by graphs, is a candidate; independent duplicate
copies would need an explicit correspondence and consistency mechanism. This
draft does not silently select a new multi-graph JSON schema.

## JSON 2 and viewing

Generate one layout per graph using deterministic code, with its own canvas and
coordinates. Preserve all graphs, documents, and attachment/mapping information
in the complete embedded JSON 1. Navigation references identify the destination
graph; screen position never determines which graph expands a node.

The HTML viewer should expose documents from a node/edge inspector and from the
graph itself, display Markdown readably, and allow access to the original text.
Opening a subgraph shows its scope and a clear path back to its parent. A
document may remain available while inspecting a different abstraction level.

A standalone SVG can display one graph while preserving the full source. Rich
document reading and graph navigation belong in HTML or a consuming tool; do
not claim that an ordinary SVG image viewer supplies the same interaction.

## Proposed implementation order and acceptance checks

1. Implement documents on the existing single graph: local Markdown loading,
   typed attachments, embedded source, rendering, and access to original text.
2. Finalize the graph identity and boundary-mapping contract using one fictional
   two-level example, including an unknown mapping.
3. Implement per-graph layout, navigation, and complete source recovery.

Check that documents attach to all three supported subjects; editing a file and
regenerating updates its content; a copied export still exposes the captured
content without the original files; Markdown cannot execute code in the viewer;
and relative links/assets follow the declared support policy. For subgraphs,
check parent/child correspondence, scoped uncertainty, and recovery of every
graph and document without interpreting drawing positions.
