# Publish separate models as one collection

Use `build-site` for the views and documents in **one model**. Use
`build-collection` for independent models or already built Waxwing sites, such
as one system architecture and several sequence scenarios.

A collection adds a parent home page, a starting destination, shared text search,
links back to the collection from every member page, and optional links between
specific records/views. It preserves separate source models; matching names or
IDs do not merge component identities.

For evidence and maintenance relationships across these models and explanations
published elsewhere, use a separate [workspace manifest](workspace.md). Link it
from the collection's authoring README; publication links are not lineage claims.

## Define and build

Save this beside your model directories as `collection.json`:

```json
{
  "schemaVersion": "0.1-collection-draft",
  "title": "Order processing",
  "description": "Understand the services, then explore the retry scenario.",
  "sites": [
    { "id": "system", "model": "architecture/model.json" },
    { "id": "retry", "model": "retry/model.json" }
  ],
  "start": { "site": "system" }
}
```

```sh
waxwing build-collection /path/to/collection.json /path/to/published
```

Open `published/index.html`. The directory works on a static host under a
subdirectory, or as local files where browser policy permits. Assets and search
data are included; no CDN, API, source fetch, LLM, or Waxwing server is needed.

Paths resolve relative to the collection JSON, not the shell's working directory.
Each entry requires a unique lowercase `id` matching `[a-z][a-z0-9_-]*` and
exactly one of:

- `model`: authoring JSON 1. Its registered documents are loaded normally.
- `site`: an existing complete, unmodified Waxwing site directory. Its manifest
  and recoverable source are verified before its layout is republished with
  collection navigation. The input site is never edited.

Entries can override `title` and `description` for the parent page. Model entries
can also set `layout`, for example `{"direction":"DOWN"}` or
`{"readingAnchors":{"services":"orchestrator"}}`. These use the layout module's
options; architecture-only options cannot be applied to sequences. Existing-site
entries retain their layout and do not accept layout options.

Entry order is the displayed reading order, not an execution sequence.
Without `start`, the first entry's contents page is the starting destination.

## Connect a box to a separate scenario

Add explicit `links` to the collection configuration:

```json
{
  "from": {
    "site": "system", "kind": "node", "ref": "checkout", "graphRef": "services"
  },
  "to": {
    "site": "retry", "kind": "graph", "ref": "checkout-retry"
  },
  "label": "Explore timeout and retry"
}
```

This is one entry in the `links` array, not a complete collection. Selecting
Checkout exposes the link in its inspector. A page-level `from` attaches the
link to that page. Links are directional; add another entry for a specific
reverse link. Collection navigation is available in either case.

`start`, `from`, and `to` use the same destination shape:

| Field | Meaning |
|---|---|
| `site` | Required member ID. By itself, opens its contents page. |
| `kind`, `ref` | Both required for a record/view: `graph`, `workflow`, `document`, `node`, `edge`, `step`, or `block`. |
| `graphRef` | Disambiguates a component/relationship in several architecture views. |
| `workflowRef` | Selects a workflow appearance of a component or step. |
| `heading` | Document heading slug for a destination. Origins attach to whole document pages. |

The target page and anchor must exist. Missing or ambiguous destinations fail
the build before replacing prior output. These are reading links, not new
architectural claims or cross-model boundary mappings.

See the runnable [collection example](../examples/collection/collection.json),
which includes architecture, a retry sequence, and a separate market scenario.

## Files, updates, and recovery

```text
published/
  index.html
  search.html
  assets/site.css
  assets/search.js
  collection.json
  waxwing-collection.json
  sites/
    system/                  # Complete member site
      index.html
      graphs/...
      workflows/...
      documents/...
      source/model.json
      source/layout.json
      waxwing-site.json
      ...
    retry/...
```

The parent manifest tracks all generated files, including child manifests.
Rebuilding validates the entire output before replacing it. The target must be
new, empty, or an unchanged managed collection. Modified, missing, extra, and
symlinked files are rejected. Inputs cannot be inside the output. Removed members
disappear on a successful rebuild. Edit original inputs, not generated files.
The exported `collection.json` records the original build configuration; its
input paths are not rewritten into a portable authoring project.

Recover one model at a time:

```sh
waxwing recover /path/to/published/sites/system /path/to/recovered-system.json
waxwing recover /path/to/published/sites/retry /path/to/recovered-retry.json
```

Recovering the parent as one model is rejected because its models have not been
merged. Keep the **whole collection directory** together for collection links.
Member recovery remains independent of the original input paths. Member exports
include complete canonical source, including records outside visible graphs.
This command does not implement audience-based export filtering.

Module API: `buildCollection(inputFile, outputDirectory)` from
`@felixfelicis/waxwing/collection`.
