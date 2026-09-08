# Basic sequence diagrams

The first sequence implementation explains **one explicitly scoped scenario**.
It has participants, individually identified steps, and an evidence-backed order.
It is a separate JSON 1 contract, not a new skin or an automatic conversion from
architecture dependencies. Use `npm run demo:sequence` to try the
[fictional timeout-and-retry example](../examples/sequence/README.md).

## JSON 1: scenario meaning

The schema is [sequence-model.schema.json](../schemas/sequence-model.schema.json).
It reuses the architecture schema's scope, knowledge, evidence, note, and
document definitions, without requiring architecture entities or dependencies.

| Field | Meaning |
|---|---|
| `schemaVersion` | `0.1-sequence-draft`. |
| `diagramType` | `sequence`; existing architecture models keep their existing contracts. |
| `id`, `title`, `scope` | Identity, question, current environment/snapshot, abstraction, inclusions/exclusions, and partial coverage. |
| `sources` | Explicit evidence locators, not automatically fetched. |
| `participants` | Each has `id`, `label`, and a qualified `meaning` describing what it represents. |
| `steps` | Individually identified messages, replies, and local events. Repeated interactions remain separate records. |
| `order` | A qualified claim whose value lists every step ID exactly once, in semantic order. |
| `notes` | Qualified answers to behavior/rationale/interpretation questions, attached through participant or step IDs. |
| `documents` | The same registered Markdown and complete-source mechanism used by architecture diagrams. |

Each step has `id`, `label`, `kind`, `from`, `to`, and `occurrence`.
`occurrence` is a boolean knowledge claim about that described step in this
scenario; its qualification applies to the assertion as a whole. Use separate
notes/documents for additional unresolved details. `kind` is one of:

- **`message`**: a directed interaction from sender to receiver. This does not
  assert synchronous execution, blocking, a protocol, or a response.
- **`reply`**: a response to the message named by required `replyTo`. Participants
  must be reversed, and that message must occur earlier in every asserted order.
  Replies are explicit; the tool never generates them automatically.
- **`event`**: a local event such as a timeout, with `from` and `to` naming the
  same participant. Its loop is not a call to another service.

A self-directed message is also drawable. `replyTo` is not allowed on other
kinds. IDs are unique across the model, including its diagram ID.

For example, the demo contains distinct `submit` and `retry` steps with the same
participants. Its order is explicitly asserted as:

```json
{
  "status": "established",
  "value": ["submit", "charge", "timeout", "paid", "retry"],
  "basis": {
    "sourceRefs": ["fixture"],
    "explanation": "This order is stipulated by the fictional scenario."
  }
}
```

The physical order of records in `steps[]` has no ordering meaning. The order
claim concerns the modeled interactions and local events only; it does not
establish a total order over unmodeled internal work. Message transmission is
represented as one interaction, without separate send/receive instants.

## Uncertainty and the rendering boundary

JSON 1 accepts unknown and disputed claims, including order and occurrence.
The basic renderer draws one asserted sequence, so:

- `order` must be `established`, `reported`, or `inferred`, with a complete
  permutation of the step IDs. The qualification appears above the drawing.
- Every step must have an asserted true occurrence. Reported/inferred occurrences
  receive explicit text and visual qualification.
- Unknown/disputed order, unknown/disputed occurrence, or an asserted absent
  occurrence stops layout with a located diagnostic. Model validation can still
  succeed. It does not delete a step, select a disputed winner, or guess ordering.
- Unknowns/disputes in participant meaning and explanatory notes remain available
  in the diagram/inspector, source, and documents.

When evidence is insufficient for a drawable scenario, keep the honest JSON 1
and report the limitation. Do not promote uncertainty merely to produce SVG.

## JSON 2 and deterministic rendering

[sequence-layout.schema.json](../schemas/sequence-layout.schema.json) defines
`0.1-sequence-layout-draft`, with `diagramType: sequence`, complete `model`,
`modelDigest`, engine/version, canvas, participant boxes/lifelines, and step
routes/label boxes. Geometry records refer to source IDs and do not reauthor
labels, operation kinds, qualifications, or ordering.

The generator sorts participants by ID for reproducible horizontal placement,
then lays out rows in `order.value` order with space for wrapped labels. Left/right
position does not imply responsibility or precedence. Downward position does
express the asserted order. Spacing does not measure time. There are no activation
bars or implied blocking intervals.

Validation checks source equality/digest, exact record coverage, participant
geometry, labels, correct endpoints, local loops, and vertical source order.
Alternative JSON 2 producers can use different coordinates if they satisfy this
contract. Architecture readability heuristics are not applied to lifelines;
the sequence validator currently returns an empty advisory warning list.

SVG and HTML embed the full JSON 2 using the same metadata format and recovery
API as architecture exports. Standard, Engineering, and Editorial skins retain
identical geometry. The sequence HTML includes zoom, evidence inspection, source
downloads, notes, documents, and light/dark themes. It uses Fit width and scrolling
for tall scenarios; choose 100% when text is small on a narrow screen.

## Modules and CLI

```js
import {
  validateSequenceModel, layoutSequence, validateSequenceLayout,
  renderSequenceSVG, renderSequenceHTML,
} from 'waxwing/sequence';

const result = validateSequenceModel(json1);
const json2 = layoutSequence(json1);
const html = renderSequenceHTML(json2, { skin: 'engineering' });
```

The sequence module does not import ELK. The existing `validateModel`,
`layoutModel`, `validateLayout`, `renderSVG`, `renderHTML`, and artifact recovery
entry points also dispatch sequence input. The CLI uses the same commands:

```sh
node bin/waxwing.mjs validate examples/sequence/model.json
node bin/waxwing.mjs build examples/sequence/model.json examples/sequence/generated
node bin/waxwing.mjs recover examples/sequence/generated/diagram.html /tmp/sequence-model.json
```

Architecture `--group` and `--direction` options are rejected for sequences.
Sequence layout has no options yet. `--graph` on SVG can name only this scenario.
The architecture-specific `waxwing/graphs` helpers are not sequence helpers.

## Documents and references

Reuse the existing [document rules](documents.md), with explicit local meanings:
`graph` names the sequence model ID, `node` names a participant, and `edge` names
a step, including a local event. This retains one reference vocabulary; it does
not convert steps into architecture dependencies. Single-scenario links need no
`graphRef` field. Examples: `#node=checkout`, `#edge=retry`,
`#graph=checkout-retry`, and `#document=reading-sequence`.

The loader resolves `.md` files and registered links. The exported HTML contains
all documents and supported images; no assumed source folder structure is needed.

## Deliberate first-version limits

One model contains one scenario. There are no branches, loop fragments,
concurrency blocks, activation bars, measured durations, message transport modes,
subsequence expansion, or automatic architecture-to-sequence conversion.
Cross-model component identity and packaged navigation between architecture and
sequence artifacts are also deferred; explicit ordinary external links still work.
We will extend this contract using concrete feedback from real projects.
