# JSON 1: first contract draft

**Status: experimental `0.4-draft`, with `0.2-draft` and `0.3-draft` compatibility.** This is a concrete proposal to inspect with
one example, not a finished schema or a commitment to an application stack.
The [schema](../schemas/system-model.schema.json),
[example](../examples/order-processing/model.json), and
[validator](../modules/model/index.mjs) are the executable counterparts.

## What it represents

JSON 1 describes a partial model of current implementation in a named environment
and snapshot, with an explicit diagram-level `scope.abstraction`. It contains semantic information and explicit interpretation,
without drawing coordinates. It can be authored independently of Waxwing's
future ingestion workflow.

This iteration excludes intended future topology. A reported explanation of why
an existing queue was introduced is still relevant current architectural
knowledge; it is not a promise about behavior or a future architecture.

## Top-level structure

| Field | Responsibility |
|---|---|
| `schemaVersion`, `id`, `title` | Draft format and authored model identity. |
| `scope` | Current timeframe, environment, snapshot, explanatory question, inclusions, and omissions. |
| `sources` | Named provenance records; the validator does not fetch or authenticate them. |
| `perspectives` | Explicit grouping meanings, scopes, and periods. |
| `entities` | Stable identities, existence, categories, and declared abstraction. |
| `groups` | Named virtual groups with a grouping perspective and qualified meaning. |
| `memberships` | Assertions about which group contains a member in a given perspective. |
| `relationships` | Directed, typed propositions about entities, with qualified existence and optional conditions. |
| `notes` | Additional qualified behavior, rationale, or interpretation tied to explicit subjects. |
| `documents` | From draft 0.3, complete Markdown, typed attachments, resolved links, and embedded raster images. |
| `graphs`, `rootGraphRef` | In draft 0.4, explicitly scoped graph selections and their expansion hierarchy. |

Draft 0.3 and 0.4 require `documents` (an empty array is valid); draft 0.2 does not accept
that field. Model and graph IDs are reserved against record IDs in drafts 0.3 and 0.4.
See the [document rules](documents.md) for authoring `.md` files and resolving them
into canonical JSON 1. A file path alone is not canonical document content.

Draft 0.4 adds one shared registry with multiple scoped graphs; see the
[subgraph contract](subgraphs.md). Older drafts describe one implicit graph. IDs are unique across all record collections, and references must
resolve to the correct kind of record. Collection order does not prescribe
layout or execution order.

## Claim-level knowledge

A value with architectural meaning carries a knowledge state. The draft uses:

| State | Meaning | Required content |
|---|---|---|
| `established` | The author declares the value established by the cited evidence. | Typed `value` and `basis`. |
| `reported` | An attributed source reports the value; independent verification is not asserted. | Typed `value` and `basis`. |
| `inferred` | An interpretation drawn from sources that still needs to remain qualified. | Typed `value` and explanatory `basis`. |
| `unknown` | No answer is established. | `reason`; optional inspected `sourceRefs`; no `value`. |
| `disputed` | Conflicting answers remain unresolved. | `reason` and at least two distinct, supported alternatives; no selected `value`. |

“Established” is an author declaration, not a badge bestowed by validation.
The tool can check that source IDs exist, but cannot establish that those sources
prove the claim. Fabricated sources or misleading prose cannot be detected by
this structural validator. No probability score implies precision we do not
have.

Each `basis` names `sourceRefs` and provides a concise `explanation`. A source
can support multiple claims, and the explanation identifies why it is relevant
to this claim. The packet is intentionally repetitive so the first design can
be inspected without implicit evidence inheritance. We should review that
verbosity before considering provenance shorthand.

For example, a relationship's `existence` may be established while its condition
is independently unknown:

```json
{
  "id": "direct-submit",
  "from": "checkout-api",
  "to": "fulfillment",
  "kind": "calls",
  "label": "Submits orders directly",
  "existence": {
    "status": "established",
    "value": true,
    "basis": {
      "sourceRefs": ["runtime-connections"],
      "explanation": "Explicitly listed in the current fictional implementation."
    }
  },
  "condition": {
    "status": "unknown",
    "reason": "The condition selecting direct submission is unavailable."
  }
}
```

Unknown cannot contain a hidden fallback value. Disputed cannot contain a
preferred candidate or a default winner. Every alternative retains its own
status and basis. This also means two reports of the same value are not a
dispute; cite both sources as support for one value instead.

Omitted optional fields are unspecified, not confirmed empty or false. An
explicit false existence claim differs from an omitted entity or relationship.
The model is open to additional facts: absence from a partial model does not
establish absence from the system. Expected but unanswered questions should be
represented explicitly with `unknown`, not silently omitted.

## Identity and relationship conventions

Labels identify an authored entity or proposition; evidence and qualification
belong to the accompanying claims. Entity category is one of `service`,
`datastore`, `queue`, or `actor`, and can itself be unknown or disputed. This is
a small draft vocabulary, not a claim to cover enterprise architectures yet.

A relationship's `from`, `kind`, and `to` define a proposition whose `existence`
is qualified. The relationship kinds currently read as sentences:

| Kind | Interpretation |
|---|---|
| `calls` | From calls to. |
| `writes` | From writes to. |
| `reads` | From reads from to. |
| `publishes` | From publishes to. |
| `consumes` | From consumes from to. |

Direction follows the actor-to-object proposition. It is not a universal data
flow direction. For example, a consumer points to its queue. No caller timing,
protocol, delivery guarantee, or causal ordering follows solely from these
types. Directed runtime cycles are allowed.

Conflicting endpoint or relationship-kind claims are not fully modeled by this
first draft: separate qualified propositions can be written, but there is no
machine-enforced mutual-exclusion structure between them yet. Do not represent
them as two established facts or treat the draft as supporting all conflicts.

## Grouping and compression

Groups define explicit virtual boxes through named perspectives. Each perspective
has a label, meaning, scope, and period. Groups and memberships reference it
using `perspectiveRef`. A disputed owner must not invalidate an established
system boundary. A perspective implies only the meaning it explicitly declares;
containment does not automatically imply network isolation or ownership.

A group has a qualified `meaning`; membership is a separate qualified claim.
The example declares catalog system membership and exclusive deployment-approval
authority as two distinct perspectives.
A disputed membership retains alternative group references without selecting
containment. All candidate references are checked. A group may nest within a
group of the same perspective; asserted containment cycles are invalid.

The initial draft permits one parent claim per member per perspective. This is a
prototype restriction, not a philosophical requirement. Joint ownership and
overlapping groups need an explicit extension; a dispute is not joint ownership.
Missing memberships are unspecified and should not be interpreted as external.

Each entity's `abstraction` explains what it represents, what this model omits,
and why this level of compression was chosen. The represented contents are
qualified knowledge; omissions and the reason are authored scope decisions.
Draft 0.4 adds explicit graph selections and qualified boundary mappings alongside
these prose descriptions. Layout cannot independently aggregate or drop selected
entities. See the [subgraph rules and limits](subgraphs.md).

## Notes and rendering obligations

Notes retain knowledge that does not yet have a dedicated typed field. Their
`subjectRefs` connect a statement or question to entities, relationships,
memberships, or groups. Their `answer` uses the same knowledge states.

Notes are inspectable information, not executable layout constraints. The first
draft does not yet define a formal language for explanatory ordering or visual
emphasis. A future layout stage must not silently turn prose into new topology.

The full JSON 1 must travel downstream and remain recoverable, including content
not shown on the canvas. An inspector is one possible reading interface; source
embedding or an accompanying file can provide recovery. A selected subset of
metadata is insufficient. The [JSON 2 contract](json-2.md) now embeds the full model, and both SVG and HTML
carry the same payload for deterministic recovery.
A relationship with unknown existence cannot become an ordinary established
edge, and a disputed owner cannot become unqualified containment.

## Executable checks and limits

The Node.js/Ajv development validator checks:

- Strict schema shape, typed values, allowed draft vocabulary, current timeframe,
  and explicitly partial scope; extra fields such as `pos` fail.
- Global record identity and correctly typed references, including disputed
  alternatives and evidence links.
- Unknown/disputed structures without hidden answers, and distinct alternatives.
- Membership perspectives, duplicate assignments, self-containment, and cycles
  among asserted group assignments.
- Established relationships do not silently promote uncertain endpoints; an
  asserted existing relationship cannot use an endpoint established as absent.

Validation is read-only. Unknowns and disputes appear in the result and do not
cause failure. `reported` and `inferred` qualifications are also returned.
It checks neither prose truth nor evidence accessibility or freshness. It does
not prove absence of every contradiction, nor does it validate hypothetical
combinations of disputed containment alternatives. JSON 2 preservation and geometry checks are implemented separately in the
[layout validator](../modules/layout/validate.mjs); perceptual review is separate.

```sh
npm ci
npm run validate -- examples/order-processing/model.json
npm test
```

The original validation-only script prints one JSON result: exit `0` for a pass,
`1` for contract errors, and `2` for usage/input failure. The new unified CLI
uses exit `1` for any failed command.
It never requests model credentials, reads the source locators, or calls an LLM.

## Decisions from the first contract review

Historical review notes below describe the initial single-graph MVP. Subgraphs
were subsequently implemented in draft 0.4 as described above.

### Keep claim-level evidence explicit

Retain the existing per-claim status, value, and basis. Do not introduce basis
inheritance or another evidence shorthand for the MVP. Some repetition is
acceptable at this diagram scale. Larger abstraction and subgraph facilities
are post-MVP work, not a reason to hide qualification now.

### Use operation/dependency direction

The MVP adopts the actor-to-object operation definitions above. Labels describe
the individual relationship; the typed operation makes its direction explicit
to software. Neither the arrow nor a chain of arrows establishes payload flow,
execution order, or runtime causality beyond the stated operations. The
vocabulary can be extended later with explicit definitions.

### Grouping depends on perspective, scope, and hierarchy

Ownership is a virtual grouping, not necessarily the system's operational
structure. Product accountability, operational responsibility, and an
organization's reported perspective may all group the same entities differently.
Different assignments are not automatically contradictory.

Before calling claims a dispute, establish that they concern the same subject,
responsibility meaning, scope, and period. Different diagrams must carry these
qualifications; simply separating conflicting pictures does not resolve their
meaning. Connected diagrams must preserve the perspective or explicitly state
its change.

A parent box may express accountability for a whole platform while expanded
children have more specific owners. Neither assertion automatically overrides
the other. Containment alone does not imply ownership inheritance. Subgraph
implementation and a general hierarchy format are deferred.

The diagram's intended abstraction level must be stated explicitly, including
meaningful per-entity exceptions. We are not defining universal numbered levels.
For this example, the proposed description is: deployed services and
infrastructure resources, with service internals collapsed.

**Implemented in draft 0.2:** named perspectives replace the two hardcoded
dimensions. Each has a declared responsibility or grouping meaning, scope, and
period. The fictional ownership reports now concern the same exclusive
production-deployment approval authority. `scope.abstraction` is required;
`entities[].abstraction.level` can describe a meaningful exception. The draft
still permits one parent claim per member per perspective; joint/overlapping
membership and expandable subgraphs remain future work.

### Preserve meaning whether or not it is displayed

Record purpose, scope, abstraction, and supporting explanation in JSON 1. The
display may expose some of this through details rather than canvas labels.
Authored primary paths and narrative ordering are deferred for the MVP. Layout
may choose a readable arrangement, but may not invent primary, fallback, or
exclusive behavior.

The rendered diagram plus its accompanying information must allow recovery of
the complete JSON 1. Carrying the original model forward is preferable to
reconstructing it by interpreting SVG. No unsupported answer may be introduced
while recovering the model.

This preserves the authored model; it does not recover system details that were
never recorded. The MVP embeds the complete JSON 1 inside JSON 2 and embeds that payload in SVG
and HTML. The HTML inspector exposes records, claims, and sources, with JSON
downloads for complete inspection. Recovery is implemented without interpreting
SVG coordinates; see the [module entry points](modules.md).
