# Architecture workflows and repeated appearances

Architecture JSON 1 `0.5-draft` adds explicit workflows to the canonical registry
and graph selections of `0.4-draft`. JSON 2 `0.4-draft` carries connectivity
geometry and workflow geometry alongside the **complete original model**.
Earlier versions keep their existing behavior. Upgrading a model requires the
new source version and a `workflows` array; an empty array is valid.

## What this answers

A connectivity graph answers which components perform which operations. A
workflow answers how one scoped, recorded interaction path visits those
components. Neither the dependency topology nor the graph question alone
establishes that order.

For the [fictional checkout](../examples/orchestration/model.json), connectivity
has four operations and one Orchestrator component. The workflow records:

```text
Checkout → Orchestrator → Stock → Orchestrator → Pricing → Orchestrator → Payment
         submit        check   reply          calculate reply          charge
```

There are five components, seven appearances, and six interactions. The three
Orchestrator boxes represent **the same component**, not replicas or new services.
A workflow can select a subset of the parent graph's relationships, or invoke
one relationship several times using distinct step IDs. It never removes those
relationships from the connectivity view or the source.

## JSON 1: explicit meaning

Each top-level `workflows` record has:

| Field | Meaning |
|---|---|
| `id`, `title` | Stable workflow identity and a display title. |
| `graphRef` | Included architecture graph whose components and operations it uses. |
| `scope` | Current environment/snapshot, reading question, coverage, abstraction, includes and excludes. |
| `steps` | Individually identified interactions. Storage order has no execution meaning. |
| `order` | Qualified claim listing every step exactly once, in scenario order. |
| `entry.point` | Qualified `{participantRef, itemRef}` declaring where this scoped workflow starts. |
| `entry.trigger` | Separately qualified description of what initiates it upstream. |

A step has `id`, `label`, `kind`, `from`, `to`, and qualified boolean `occurrence`.
The message/reply/event vocabulary reuses the basic sequence scenario semantics:

| Kind | Additional fields and checks |
|---|---|
| `message` | `relationshipRef` is required. It names a selected architecture operation with exactly matching actor-to-resource endpoints. It represents an invocation, including a read/write/queue operation where applicable. It does not imply blocking or data-flow direction. |
| `reply` | `replyTo` names an earlier message in this workflow, with reversed endpoints. No `relationshipRef`: receiving a reply does not invent a reverse architecture dependency. |
| `event` | A local event has the same actor in `from` and `to`. Neither reference is allowed. |

Every interaction has its own occurrence evidence even when several invoke the
same operation. Established occurrences require established-present components
and, for messages, an established-present operation. Reported/inferred
occurrences remain qualified and cannot use an established-absent component or
operation. Validation checks these claims' internal consistency; it does not
verify the evidence or execute the system.

All workflow and nested step IDs are globally unique across the complete model,
including its own ID. Notes may reference workflows and steps. An asserted entry
must name the first ordered step and its actor. Unknown/disputed entries remain
unresolved. An unknown entry allows a drawable known-order path whose first box
says “first recorded actor”; it does not declare that actor the true scoped start.
Disputed entry candidates must be compatible with the recorded order candidates;
unresolved ordering still blocks layout. A known entry does not establish its upstream trigger.

## JSON 2: participation before coordinates

Every workflow has exactly one geometry record under `workflows`:

```json
{
  "ref": "checkout-run",
  "layout": {"engine": "elk-layered@0.12.0", "direction": "RIGHT", "groupingPerspectiveRef": null},
  "canvas": {"width": 1000, "height": 400},
  "appearances": [
    {"id": "appearance-0", "entityRef": "checkout", "afterStepRef": null,
     "box": {"x": 36, "y": 96, "width": 252, "height": 148}}
  ],
  "edges": []
}
```

This is a field illustration, **not a complete valid layout**. The full example
is [generated JSON 2](../examples/orchestration/generated/layout.json).

The compiler creates an initial appearance of the first step's actor and one
arrival appearance after each step. `afterStepRef: null` identifies the initial
slot; every other appearance names its arriving step. `entityRef` always points
to the canonical registry. Appearance IDs are unique within a workflow; their
spelling and array order carry no meaning. They are presentation references,
not stable authored document targets.

Each edge references a source step and exact `fromAppearanceRef` and
`toAppearanceRef`, plus orthogonal `points` and a `label` box. Validation checks
slot coverage, canonical identity, source/arrival wiring, visual progression in
the declared direction, text space, canvas bounds, overlaps, and route collisions.
A custom JSON 2 producer can choose different coordinates and appearance IDs
while satisfying these same rules. It cannot duplicate services or rewrite the
workflow to obtain a convenient layout.

Deterministic code derives this appearance path; pinned ELK places it. Arrows
follow the workflow's explicit order, RIGHT or DOWN. The renderer numbers steps
from `order`, displays occurrence/entry qualifications, marks replies with dashes,
and labels repeated canonical identities. Spacing has no time or duration meaning.

## Grouping and abstraction

A workflow is scoped to one existing graph level. It does not inherit workflow
steps across subgraph expansions or create its own abstraction hierarchy.
The parent graph remains available with all its selected relationships and its
usual grouping frames.

With `--group`, workflow appearances carry direct membership labels for that
perspective, including reported/inferred/unknown/disputed qualification. These
are labels, not enclosing workflow frames. Nested group details remain in the
source and inspector. There are no inferred stage groups, copied ownership facts,
or frames that accidentally imply new boundaries around repeated appearances.

## Documents and navigation

Markdown remains the single document format. In `0.5-draft`, attachments and
link targets additionally support `workflow` and `step`; `workflowRef` can scope
a `node` or `step` target. It is mutually exclusive with `graphRef`.

```json
{"kind":"workflow","ref":"checkout-run"}
{"kind":"node","ref":"orchestrator","workflowRef":"checkout-run"}
{"kind":"step","ref":"stock-result","workflowRef":"checkout-run"}
```

These are separate target examples. Write corresponding Markdown links as:

```markdown
[Workflow](#workflow=checkout-run)
[Same orchestrator](#workflow=checkout-run&node=orchestrator)
[Reply](#workflow=checkout-run&step=stock-result)
[Reply, unambiguous by global ID](#step=stock-result)
[Connectivity](#graph=services)
```

The exporter resolves these references into offline HTML navigation. A step ID
has one workflow owner. A node attachment without a scope applies to that
canonical component wherever it appears; a workflow-scoped attachment only
appears in that workflow. Nodes link to their shared canonical inspector, which
lists each participation. A viewer URL may also include `appearance` to focus
one box, but documents should use semantic references that survive regeneration.
No source-folder layout or hosted service is required.

The HTML **View** selector keeps connectivity and workflow presentations in one
artifact. Workflows open at 100% with scrolling; **Fit** gives an overview. Node
selection highlights all appearances of that canonical component. The current
operation/uncertainty highlight filters remain in Connectivity; workflow steps
show qualification in their labels, and details and open questions remain
inspectable. JSON 1/2 downloads preserve everything; SVG download exports the
current view with the full embedded payload.

## Current limits

This first workflow presentation handles one continuous linear scenario: each
step's recipient is the next step's actor. Consecutive operations without that
recorded handoff remain valid JSON 1 but block this layout. Do not invent a reply,
reorder steps, or weaken a claim to make it drawable. An unknown/disputed order
or an absent/unresolved occurrence likewise remains valid source and blocks
layout. Layout failure does not write a partial replacement artifact.

A build currently generates every included workflow, so one undrawable workflow
blocks the complete build. Use the earlier connectivity-only model version, or
an explicitly scoped model with no workflows, when that is the artifact needed;
do not describe such an export as containing an unresolved workflow it omits.

Branches, loops, concurrency, automatic folding/wrapping, hand-authored stage
frames, and combining several workflows in one path are deferred. Existing
[sequence behavior](sequence-behavior.md) supports loops and conditionals for a
different reading task. A long unfolded workflow consumes substantial space;
this is a documented tradeoff, not a claim of universal readability or evidence
that an LLM would improve it. See [layout warning signs](layout-warning-signs.md).
