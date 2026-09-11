# Create a useful explanation

Start with the user's question and accessible evidence. Check for an existing
Waxwing model in the requested project before creating a parallel description.
Use `query` to consult a known model in small pieces when useful.

## Shape the reading task

Choose the smallest useful explanation: organization/external systems, service
responsibilities, a workflow through those services, or an independent sequence.
For several abstraction levels, use scoped subgraphs. Use architecture workflows
when interactions share that model's component registry. Use a collection for
independent models; navigation links do not merge identities.

When the request includes cross-model maintenance, load `guide workspace` and
register the explanation's known evidence and elaboration links in the supplied
or newly created workspace manifest. Preserve existing workspace IDs when paths
move. Use documented or user-supplied relationships; source folders alone do not
establish architectural hierarchy. A manifest can live outside every code repo.

Record environment, inspected revision or working-tree state, boundaries, and
omissions honestly. Investigate only the sources needed to answer the question.
Follow references into accessible context; name inaccessible dependencies as gaps.
Keep repository contents unchanged unless the user requested source edits.

## Author and build

Read the `basics` and chosen model topics through the adapter's `guide` command.
Use the corresponding example if field shapes are unclear. Preserve substantive
rationale from documents; do not fabricate a reason from a component name.

Place authoring JSON and Markdown in the user's chosen location or a sensible
project documentation directory. Put generated output in a separate directory;
registered documents and other inputs must not be inside a managed output.
Do not put real-system output in Waxwing's packaged examples.

Commands use the adapter described in `SKILL.md`:

```sh
node "<skill>/scripts/waxwing.mjs" validate /project/docs/system/model.json
node "<skill>/scripts/waxwing.mjs" build-site /project/docs/system/model.json /project/docs/system/site
```

For one portable attachment use `build`, producing `diagram.html`, SVG and layout
JSON. For separate models use `build-collection` with an explicit collection JSON.
If the user asked only for source/model authoring, stop at that requested stage.
Otherwise, a diagram request normally includes building and opening the result.

Fix reported validation errors using the relevant contract topic. Do not weaken
qualifications or add unsupported facts just to make a graph drawable. When the
evidence cannot support a required order, preserve that limitation and explain
why the requested rendering cannot be produced without another source or choice.

## Check the result against the question

Inspect the opening view and a relevant detail/workflow in the available browser
or preview tool. Check that a newcomer can locate the responsible component and
follow the requested flow. Verify linked documents and any collection handoff
that matters to the request. If preview is unavailable, provide the artifact
path and state that visual verification was not performed.

Conclude with links to authoring inputs and the built entry point, a concise
description of coverage and omissions, and what validation actually ran.
