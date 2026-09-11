# Maintain explanations across locations

A workspace manifest records **where explanations live**, **which evidence they
use**, and **which models elaborate other models**. Put it in a documentation
repository, a shared working folder, or another location that suits the team.
There is no required filename or repository hierarchy. Link its path from the
project's README or agent instructions so humans and agents can find it.

The manifest is an index of declarations. It is not a merged diagram, collection
layout, code scanner, remote connector, or proof that an explanation is current.
Commands are read-only and work without an agent. The authoring/update skill
uses their output to scope investigation and record review outcomes.

## Register sources and models

```json
{
  "schemaVersion": "0.1-workspace-draft",
  "id": "commerce",
  "title": "Commerce explanations",
  "sources": [
    { "id": "platform-design", "location": "https://docs.example.com/platform", "revision": "document-version-12" },
    { "id": "payments-repo", "location": "https://github.com/example/payments" }
  ],
  "models": [
    {
      "id": "system", "modelId": "commerce-system",
      "location": "./system/model.json",
      "sourceRefs": ["platform-design"]
    },
    {
      "id": "payments", "modelId": "payment-service",
      "location": "../payments-docs/model.json",
      "sourceRefs": ["payments-repo", "platform-design"],
      "elaborates": [{ "model": "system", "element": "payment-service" }]
    }
  ]
}
```

This is a shape example with fictional locations. For a runnable example, use
[examples/workspace/workspace.json](../examples/workspace/workspace.json).

| Field | Contract |
|---|---|
| `id` | Workspace, source, and model registration IDs use `[a-z][a-z0-9_-]*`. Keep them stable when locations move. Source and model IDs have separate namespaces. |
| `title` | Required for the workspace; optional display text on sources/models. |
| `location` | Local path or HTTP(S) locator. Relative paths resolve beside the manifest, never from the shell's working directory. Absolute paths and `../` are allowed; they do not imply hierarchy. |
| Source `revision` | Optional declared revision, such as a commit SHA or document version. It is not automatically fetched or verified. |
| Model `modelId` | Expected canonical JSON 1 ID. Local loading checks it, preventing a path from silently pointing to a different model. Different models can have the same internal IDs; workspace registration IDs remain distinct. |
| Model `sourceRefs` | Required array of declared evidence source IDs. This is model-level coverage, separate from claim-level evidence inside JSON 1. An empty array is allowed but leaves an evidence gap. |
| Model `elaborates` | Optional array of parent references. `model` is a workspace registration ID; optional `element` is a component/group ID **inside that parent model**. Omit `element` for an explanation of the whole parent. Multiple parents are allowed; cycles and self-parenting are rejected. |

Sources can be repositories, individual code files, design documents, decision
records, or other evidence. A source may support multiple models. External
high-level documents normally belong in `sources`; `models` registers Waxwing
JSON 1 explanations. Model locations may also be remote, but the CLI cannot
validate their contents until you make a local copy available and point the
registration to it. Fetching and confirming that copy's provenance remains the
agent/human's responsibility. HTTP(S) locators never grant access automatically.

Local model loading resolves its explicitly registered Markdown and assets,
just like `prepare`. Source paths are checked for local availability only; they
are not read, recursively scanned, or assessed. No URL is fetched, Git command
run, or agent invoked. URL schemes other than HTTP(S) and embedded credentials
are rejected. Existing diagram schemas, rendering, and recovery are unchanged.

## Check the index

```sh
waxwing workspace check /path/to/workspace.json
waxwing workspace check /path/to/workspace.json --format markdown
```

Checks structure, IDs, source references, elaboration cycles, local model
validity/identity, and parent component/group targets. Invalid manifests fail;
invalid local models or targets produce error diagnostics and exit 1.
Missing/inaccessible local files remain in the report as `unavailable`, with
warnings. Hosted locators are `external`, never implicitly considered reviewed.
Their parent targets remain `unverified`. Local model content digests are
reported as `revision`, including resolved documents/assets.

`ok: true` / exit 0 means no validation errors, not complete access or current
evidence. `referencesComplete` requires all models to be locally validated and
all parent targets verified. It does **not** certify sources, lineage truth,
or freshness. A reference can resolve correctly while the architectural
relationship itself is wrong; that still requires review.

## Start from a change

```sh
waxwing workspace affected /path/to/workspace.json --source payments-repo
waxwing workspace affected /path/to/workspace.json --model payments
waxwing workspace affected /path/to/workspace.json --source payments-repo --source platform-design --format markdown
```

The user or agent maps changed evidence to registered IDs. A PR can provide
the change, but no PR integration is required. Repeat `--source` or `--model`
to supply multiple changes. Unknown IDs fail instead of silently returning
an empty queue. A known source with no consumers appears in `unmatchedSources`.

1. A changed source selects every model that lists it; a changed model selects
   that model directly.
2. Follow declared elaboration links **in both directions**: toward overviews
   and toward detailed explanations. This deliberately includes siblings reached
   through a shared parent. The initial queue is conservative, not a claim of
   behavioral impact. A model-wide source reference cannot identify the exact
   parent box affected by a change.
3. Emit each reached model once, with one shortest route for each trigger,
   available evidence locations, content digest when available, and access or
   reference gaps. External/unavailable models remain in the queue, and traversal
   continues through them. No missing parent silently cuts off its neighbors.

Traversal stops at this one manifest. No name matching, folder inference, hidden
registry search, or transitive manifest loading occurs. `unaffected` means not
reached by declared links, not proven unaffected. All queue entries start as
`needs-review`; the command does not determine truth or apply edits.

## Review and update

Save the Markdown output in a separate update working directory (or retain the
JSON when a structured baseline is useful). Keep the workspace and model
revision identifiers with the report. Then, within the authorized task scope:

- Inspect the changed evidence and relevant context. Retrieve external material
  with available authorized tools. Register newly established source/lineage
  relationships explicitly; do not infer architecture from folder names.
- Preserve a resolved model baseline with `prepare`, make evidence-supported
  edits, validate, and use the skill's `review-update` inventory to inspect IDs.
- Record an outcome for each queued model: **updated**, **still-accurate**,
  **blocked**, or **out-of-scope**. Include the evidence revisions actually
  inspected, the model revision reviewed, the reason, and for edits the resulting
  revision. A successful build or identical model digest is not an accuracy check.
- Rebuild affected artifacts and report unresolved work. Finding a related model
  does not expand permission to edit or publish it.

Review outcomes are authored in that report. This release does not persist a
review ledger, automatically monitor source revisions, suppress future queues
based on prior outcomes, or provide a semantic before/after viewer. A new
invocation creates a new pending queue. These are foundations for that later
workflow, not an automatic freshness certificate.

## Relationship to collections

A [collection](collections.md) selects models to publish and adds reading links.
A workspace selects models to maintain and declares evidence/elaboration links.
The sets may overlap without being identical; high-level or private explanations
need not be published together. Keep a link to the workspace manifest in your
collection's authoring README, as the examples do. Existing collection navigation
is not imported as lineage, and workspace paths are not embedded into exports.

## Module API

```js
import { loadWorkspace, affectedModels, workspaceMarkdown } from '@isought/waxwing/workspace';

const workspace = loadWorkspace('/path/to/workspace.json');
const plan = affectedModels(workspace, { sources: ['payments-repo'] });
console.log(workspaceMarkdown(plan));
```

`loadWorkspace` throws for unreadable/malformed manifests or invalid declarations.
For declarations that are valid but point to invalid/unavailable content, inspect
the returned `ok`, statuses, and diagnostics. `affectedModels` accepts that report
and preserves its diagnostics. None of these functions writes files.
