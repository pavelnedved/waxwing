# Update an existing explanation

Start from the existing canonical model, not a fresh reconstruction. Consult its
question, scope, components, workflows, and relevant records with `query`.
Read the matching contract topics before editing its fields.

## Establish the review scope

If the user supplies a workspace manifest, or the project's instructions link to
one, load `guide workspace` and run `workspace check`, then `workspace affected`
with the declared IDs of changed sources/models. A PR is one possible change
input; select its corresponding source explicitly. The CLI does not scan the PR.
Follow the reasons in the review queue across abstraction levels. Elaboration
means potentially related explanations, not guaranteed impact or permission to
edit every reachable model. Keep the user's authorized scope; list other models
as follow-up work when needed.

When no manifest is known, use the selected model/collection as the explicit
scope. If cross-model maintenance is requested, register known sources and
relationships in a workspace manifest at a user-appropriate location. Use
evidence actually consulted and relationships the user supplied or that are
supported by explicit documentation. Ask only for missing architectural context;
never infer a parent from a folder name or impose a repository layout. Explain
that unregistered dependents cannot be found.

Obtain external evidence through available authorized tools; a URL or an
available local file does not mean it has been reviewed. Preserve unresolved
access and target-reference gaps. Save the generated queue in the separate
update working directory as a review report, retaining its workspace/model
revisions. For each affected model, record `updated`, `still-accurate`, `blocked`,
or `out-of-scope`, with the evidence revisions actually inspected and rationale.
Use `still-accurate` only after assessment; a successful build or an unchanged
model is insufficient. The report is an authored assessment, not an automated
freshness certificate. These commands never write review outcomes into models.

## Preserve a baseline

Create a separate working directory for this update. Resolve registered documents
into a baseline outside all managed export directories:

```sh
node "<skill>/scripts/waxwing.mjs" prepare /project/docs/system/model.json /project/update-work/before.json
```

If only an artifact exists, use `recover` to obtain the baseline. Recover a
collection member individually; a collection is not a merged source model.
Keep original authoring JSON/Markdown as the ongoing input when available.
The resolved snapshot is for comparison and recovery, not a reason to replace
file-backed Markdown authoring with embedded content.

## Make the requested change

Inspect the changed sources and their context. Keep IDs for the same component,
relationship, workflow, step, or document; a label or description change does not
by itself create a new identity. Preserve authored rationale and qualifications.
Remove a record only when the requested change and evidence justify its removal;
check its appearances, attachments, workflow use, and boundary mappings.

Use normal edits when the user authorized updating the model. If they asked only
for a proposal, edit a candidate instead. When relocating file-backed authoring
inputs, preserve or deliberately adjust document paths; use a resolved snapshot
as a candidate when appropriate. Do not edit generated HTML as model source.

```sh
node "<skill>/scripts/waxwing.mjs" validate /project/docs/system/model.json
node "<skill>/scripts/waxwing.mjs" review-update /project/update-work/before.json /project/docs/system/model.json
```

`review-update` validates and resolves both inputs. It reports model identity,
scope changes, and added, removed, changed, and unchanged record IDs, including
workflow steps and document assets. Inspect every removal and addition together:
an unnecessary rename appears as remove/add. It does not prove identity continuity,
evaluate evidence truth, automatically merge, or accept changes.

If the model ID or diagram type changes, the report flags the identity boundary.
Explain an intentional migration; otherwise preserve the original identity/type.
This inventory is a review aid, not a substitute for explaining how behavior or
responsibilities changed. Read the ordinary source diff alongside it as needed.

## Rebuild and deliver

Rebuild the requested artifact after validation and inspection of the update.
Managed output must be unchanged since its last build; on a conflict use a new
output directory or reconcile the known edit, rather than deleting the directory
blindly. Open the updated view and the directly affected links/workflow.

Report what changed and why, any intentional removals/identity changes, preserved
unknowns, and the actual checks. Keep the baseline available through delivery.
Do not turn a user's authorized edit into a mandatory extra approval round.
