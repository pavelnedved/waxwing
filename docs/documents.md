# Markdown documents: authoring, references, and portable links

Implemented for single graphs (JSON 1 `0.3-draft`, JSON 2 `0.2-draft`) and
[subgraphs](subgraphs.md) (JSON 1 `0.4-draft`, JSON 2 `0.3-draft`). Older
document-free JSON 1 `0.2-draft` and JSON 2 `0.1-draft` remain supported.
Examples below use the single-graph contract; the subgraph guide defines the
additional `graphRef` context for multi-graph node/edge targets.

[Sequence scenarios](sequence.md#documents-and-references) reuse these rules:
`node` means participant, `edge` means step, and `graph` means the sequence model.
[Sequence behavior](sequence-behavior.md#documents-and-references) additionally
supports block attachments and links such as `#block=market-loop`. Block targets
are specific to that version; architecture and original sequence contracts do
not accept them.

## What you configure

A document has a stable `id`, a `title`, Markdown content, and explicit
attachments. Attachments may identify a **node**, an **edge**, or the **graph**.
A contract is ordinary document content, with no special type or hierarchy.
One document can attach to multiple subjects. An empty attachment list is valid:
the included document remains available through the document catalog and links.

**There is no required folder structure.** Source files do not have to live
beside the model or inside its directory. Filesystem nesting does not express
graph hierarchy, ownership, or attachment. You register files where they already
live. You do not configure HTML routes for the default exporter.

For example, add this to a model whose `schemaVersion` is `0.3-draft`:

```json
{
  "documents": [
    {
      "id": "worker-guide",
      "title": "Order Worker guide",
      "format": "markdown",
      "file": "../services/worker/README.md",
      "attachments": [{ "kind": "node", "ref": "order-worker" }]
    },
    {
      "id": "submission-details",
      "title": "Submission details",
      "format": "markdown",
      "file": "../interfaces/submission.md",
      "attachments": [{ "kind": "edge", "ref": "worker-submit" }]
    }
  ]
}
```

This is a field excerpt, not a complete model. The existing entities, edges,
scope, evidence, and other model fields are still required. A graph attachment
uses `{ "kind": "graph", "ref": "order-processing" }`, where the reference is
the model's top-level `id`. Node references identify `entities`; edge references
identify `relationships`. IDs must be unique across all records and the graph.

## File resolution rules

1. The `file` path is resolved from the directory of the input model file, not
   the shell's working directory. Both relative and absolute registration paths
   work; relative paths are easier to move with a repository.
2. A registered file must be UTF-8 Markdown with a `.md` extension. The loader
   preserves its text, including line endings and a Markdown byte-order mark.
3. A relative link or image inside Markdown is resolved from **that Markdown
   file's directory**. Symlinks are resolved to physical files first; these
   physical directories supply the base for relative paths.
4. Each physical Markdown file can be registered once. Reuse its ID and add
   attachments instead of registering aliases for the same file.
5. All local document link destinations must be explicitly registered. The
   loader does not crawl directories or automatically include linked documents.
6. Missing files, missing target documents/headings, incorrect attachment types,
   duplicate identities, and unsupported local assets fail the build. Nothing
   is silently omitted to produce an apparently complete export.
7. A file-backed document cannot also supply `markdown`, `links`, or `assets`.
   Files are the editing authority; generated content is a snapshot. Edit the
   file and regenerate to update the export.

No automatic source discovery or LLM is involved. Loading reads only the model,
explicitly registered Markdown files, and supported local images they reference.
The CLI protects all of those input files from output replacement.

## Links inside Markdown

Ordinary Markdown links, including reference-style links, work:

```markdown
Read [submission details](../../interfaces/submission.md#route-selection).

[More details][submission]

[submission]: ../../interfaces/submission.md
```

The loader resolves the path to an included document ID and records the heading
if present. The exporter turns that reference into a clickable internal link.
The original Markdown is retained unchanged. Users do not separately configure
an HTML URL for each link.

For records that have no Markdown file, use ordinary Markdown link syntax with
one of these supported fragments:

| Target | Markdown link destination |
|---|---|
| Included document | `#document=worker-guide` |
| Heading in a document | `#document=worker-guide&heading=responsibilities` |
| Heading in this document | `#responsibilities` |
| This entire document | `#` |
| Node in the current graph | `#node=order-worker` |
| Edge in the current graph | `#edge=worker-submit` |
| Graph | `#graph=order-processing` |
| Node with explicit graph context | `#graph=order-processing&node=order-worker` |

In the single-graph contract, an explicit graph context must name that graph.
In draft 0.4, it must name an included graph showing the node or edge. Unqualified
Markdown node/edge links require exactly one matching graph. Conflicting targets,
unknown parameters, and duplicate parameters are rejected. IDs identify records;
changing a displayed title does not change the destination. Group, note, and
source links are not part of this authored Markdown target vocabulary yet.

Heading anchors use the displayed heading text, Unicode NFKC normalization,
lowercase, letters/numbers/underscores/hyphens, and whitespace converted to
hyphens. Other punctuation is removed; an empty heading becomes `section`.
Duplicates receive `-1`, `-2`, etc., skipping already-used anchors. For example,
`## Route selection` becomes `route-selection`. Changing a heading can change its
anchor; the validator checks references against the current text. Explicit
custom HTML anchors are not supported. Heading IDs are isolated per document.

Local file links must be relative paths without query strings. Filesystem-root
paths, protocol-relative URLs, `file:` URLs, and backslash paths are not portable
document links. Use ordinary forward-slash relative paths or explicit external
URLs. Paths with spaces may use Markdown's angle-bracket destinations or URL
encoding.

## Markdown and asset support

Rendering uses pinned **markdown-it 15.0.1** with its default Markdown syntax,
including tables and strikethrough. HTML, automatic bare-URL linkification, and
typographic replacements are disabled. Headings, lists, quotes, normal links,
images, inline code, and fenced code are supported. No Markdown plugins,
executable code blocks, embedded diagram execution, or contract-specific syntax
are required.

- Raw HTML is displayed as text. Scripts, iframes, and event handlers do not
  become active HTML. Unsupported URL schemes are not emitted as active links.
- Explicit `http:`, `https:`, and `mailto:` links remain external and open
  separately; their content is not included in the artifact.
- Local PNG, JPEG, GIF, and WebP images are embedded as base64 with MIME/header
  checks. Browser image decoding still determines whether the file is viewable.
- Remote Markdown images appear as labeled external links and do not load
  automatically. Required external content is not claimed to be packaged.
- Local SVG, PDF, arbitrary attachments, image fragments, and embedded `data:`
  source URLs are not supported in this slice. Use a supported raster image or
  an explicit external link. Raw HTML image tags remain literal text.

The stored Markdown and assets survive source recovery. A document is not given
one blanket truth status: attaching prose does not certify its claims or resolve
contradictions with structured data. Existing qualified model claims remain
the input to layout; document prose does not become layout instructions.

## Canonical JSON 1 and independent modules

`file` is a local authoring convenience, **not** a field in canonical JSON 1.
The loader replaces it with `markdown`, `links`, and `assets` before validation:

```json
{
  "id": "worker-guide",
  "title": "Order Worker guide",
  "format": "markdown",
  "markdown": "See [submission](../submission.md).\n",
  "attachments": [{ "kind": "node", "ref": "order-worker" }],
  "links": [
    {
      "href": "../submission.md",
      "target": { "kind": "document", "ref": "submission-details" }
    }
  ],
  "assets": []
}
```

Every internal link and local image parsed by Markdown has exactly one resolved
entry. Repeated uses of the same destination share an entry. Unused or duplicate
entries fail validation. Parser-normalized destinations are used as `href` keys.
External links need no resolution entry. Explicit fragment targets cannot be
rebound to a different identity through the resolution table.

An image entry contains `href`, `mimeType`, and `data` (base64). A link target
contains `kind`, `ref`, and optionally `heading` for a document. Canonical
callers can supply these complete records themselves. Validation checks that
targets exist; for relative paths it cannot authenticate their historical file
mapping without the original authoring input.

```js
import { loadModel } from '@felixfelicis/waxwing/documents';
import { layoutModel } from '@felixfelicis/waxwing/layout';
import { renderHTML } from '@felixfelicis/waxwing/render';

const { model, inputFiles } = loadModel('/path/to/model.json');
const json2 = await layoutModel(model);
const html = renderHTML(json2);
```

`inputFiles` lists resolved input paths for clients that need to protect them
when writing outputs. `validateModel`, `layoutModel`, and `renderHTML` never
read document files themselves. They accept complete canonical content.

## CLI and portable export

From the repository root:

```sh
npm ci
node bin/waxwing.mjs validate examples/documented-orders/model.json
node bin/waxwing.mjs prepare examples/documented-orders/model.json /tmp/resolved-model.json
node bin/waxwing.mjs build examples/documented-orders/model.json /tmp/documented-orders --group system-structure
```

`prepare` is optional: `validate`, `layout`, and `build` already use the loader.
`render`, `check-layout`, and `recover` use saved complete artifacts and do not
access the original Markdown files. The older validation-only compatibility
script accepts canonical models only.

The default HTML export packages all included documents and graphs into
one file. Open documents from the header catalog or from a node, edge, or graph
inspector. The reader supports original Markdown display/download, attachment
links, heading navigation, and browser Back/Forward. Reloading a document URL
selects the same document. Invalid URL targets show an explicit error.

Internal navigation uses fragments in the current HTML file. Renaming/moving
that file does not break its internal links. A separately shared full URL still
depends on the published file's location. Cross-model discovery is not implemented. The optional [site exporter](site-export.md)
generates separate linked pages from the same typed references; its whole directory
must move together. Static hosting needs no Waxwing server
or server-side route rewriting. External host policies may constrain JavaScript.

SVG exports retain complete documents and assets in their source payload; a
generic SVG image viewer does not provide the HTML document-reading interface.
The recovery operation returns the complete resolved JSON 1, including the
original Markdown strings and asset bytes, without reconstructing them from
rendered text or opening any input paths.

## Architecture workflow targets

Architecture `0.5-draft` additionally supports `workflow` and `step` document
targets, and `workflowRef` on node/step targets. Markdown can use
`#workflow=checkout-run`, `#workflow=checkout-run&node=orchestrator`, or
`#workflow=checkout-run&step=stock-result`. A global step ID also supports
`#step=stock-result`; its workflow owner is unambiguous. Do not author links to
presentation appearance IDs. Earlier versions retain their existing vocabulary.
See the [complete linking rules](architecture-workflows.md#documents-and-navigation).
