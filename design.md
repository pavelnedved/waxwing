# Design discussion

This document records the current direction, not a completed technical design.
The local MVP now implements [JSON 1](docs/json-1.md), [JSON 2](docs/json-2.md),
automatic layout, SVG/HTML rendering, and source recovery through
[independent modules](docs/modules.md). The contracts remain experimental.
The implementation uses Node.js, Ajv, ELK, and a standalone vanilla-JavaScript
viewer; ingestion and model-provider decisions remain deferred.

## First development route

The agreed starting point is **JSON 1 → JSON 2 → SVG**. Ingestion is deferred
until the downstream contracts are better understood. We begin with an entirely
fictional, small but messy order-processing system, with no private project
material. The initial JSON 1 represents current implementation only.

Unknowns and disputes are valid model content, not reasons to fill in a plausible
answer. Current rationale may be reported without implying future topology or
proving that the implementation achieves its stated purpose.

The first draft experiments with claim-level knowledge states, independent
system and ownership groupings, explicit abstraction, and a partial scope.
These are reviewable choices with documented limitations, not a finalized
general-purpose ontology.

## Three independent responsibilities

| Module | Input | Output | Owns |
|---|---|---|---|
| Gather | Code, documentation, configuration, human knowledge | JSON 1 | Evidence gathering and explicit architectural interpretation |
| Layout | JSON 1 | JSON 2 | Visual realization without changing system meaning |
| Render | JSON 2 | SVG / HTML | Deterministic drawing and presentation |

The gathering module is optional for users who already produce compatible
JSON 1. The renderer is optional for users who want to consume JSON 2 elsewhere.
These must be documented entry and exit points, not incidental internal files.

## Gathering: sources and a checklist

The proposed ingestion structure is a checklist-driven investigation. For each
item, the system may gather an answer from code or documentation and seek
confirmation where appropriate, or ask a person directly.

Large systems may span multiple repositories and documentation sources. The
workflow should not depend on a person manually describing every connection.
The exact checklist, discovery process, and confirmation policy are still open.

Human conversation can eventually contribute knowledge that implementation alone
cannot establish. The following describes the broader ingestion discussion;
proposed future architecture is excluded from the first JSON 1 draft:

| Knowledge | Example |
|---|---|
| Purpose | A service exists to isolate billing policy. |
| Intended boundary | It should own invoices but not payment execution. |
| Rationale | A queue was introduced to tolerate downstream outages. |
| Transitional state | Two routes coexist during a migration. |
| Known compromise | Direct database access is a temporary exception. |
| Future intent | A worker is intended to take over an operation. |

Observed implementation and intended architecture may conflict. Both statements
and the explanation of their difference should survive ingestion. Documentation
can supply evidence or intent, and can also be stale. A source reference and a
human confirmation are different information; neither should silently stand in
for the other.

No formal intermediate evidence format has been agreed upon yet.

## JSON 1: authority for meaning

JSON 1 represents the system within an explicit scope. It is intended to be
useful independently to a human or another LLM reading documentation or working
on code, without having to infer knowledge from a drawing.

It needs to express:

- Entities, their categories, and their relationships.
- Membership in logical or architectural groups, including virtual boxes.
- Compression: what an aggregate represents and relevant omissions.
- Enrichment: interpretations, classifications, and their basis.
- Non-aesthetic explanatory intent, such as which scenario a diagram explains.
- Purpose, intended boundaries, rationale, and known transitional conditions.
- Evidence, assumptions, uncertainty, and concise justifications where needed.

System assertions and explanatory choices must be distinguishable. “These
services share an owner” and “this is the primary reading path” do not make the
same kind of claim. Reasons mean inspectable conclusions and their basis, not
a transcript of an LLM's internal reasoning.

JSON 1 does not require absolute drawing coordinates. It must contain enough
meaning and explicit constraints to support reconstruction when coordinates
are absent. Its graph may contain cycles; DAG-only behavior is not assumed.

The current draft uses a shared registry with explicitly scoped graph selections,
a parent-node expansion hierarchy, and qualified boundary mappings. See the
[subgraph contract](docs/subgraphs.md) for the implemented rules and limits.

## JSON 2: generated visual specification

JSON 2 describes the visual realization of JSON 1: positions, dimensions,
relationship routes, label placement, and presentation attributes.

It is derived and regenerable. It is not an independently editable authority
for system facts. Semantic edits go through JSON 1 and regenerate the layout.
The input path for purely aesthetic preferences remains open.

JSON 2 must be independently renderable at its exit point. It therefore needs
the resolved labels and relevant properties required for drawing, rather than
only references that force an external renderer to retrieve JSON 1. Semantic
references should remain available for traceability and correspondence checks.
The MVP embeds complete JSON 1 in JSON 2 and resolves labels through its IDs,
avoiding independently authored copies of system facts. The exported SVG/HTML
contains the complete JSON 2 payload for recovery.

Its categories and visual roles should be understandable without depending on
our particular HTML template or CSS implementation. External renderers may
choose another visual style while preserving the represented meaning.

Layout must not invent a service, rewire a relationship, redefine membership,
or silently omit information because the canvas is crowded. Decisions to
aggregate or omit system detail belong upstream in JSON 1.

The MVP uses deterministic ELK layout with preservation and geometry checks.
This is the [accepted current implementation decision](docs/decisions/001-deterministic-layout.md)
following the pipeline reading experiment. JSON 1 → JSON 2 uses no LLM; the
experimental consumer-placement variant remains outside production. The decision
can be revisited against explicit reading tasks and measured tradeoffs.
An independently implemented layout stage may also produce compatible JSON 2.

## Rendering

The conversion from JSON 2 to SVG / HTML is deterministic code, with no LLM in
this stage. It renders the prepared specification without making new
architectural interpretations.

The rendering module accepts saved JSON 2 without repository access or an
active gathering session. The HTML viewer provides element inspection, source
and perspective details, unknown/dispute navigation, zoom, themes, and downloads.
The SVG carries embedded source but no interactive script.

## Preservation and validation

The main contract is that JSON 2 preserves JSON 1's system meaning and adds no
new system assertions. An LLM-generated layout does not exempt that boundary
from deterministic checks.

Candidate checks discussed so far include:

- Semantic visual elements reference existing model identities.
- Required model elements have a declared representation.
- Relationship endpoints and group membership remain consistent.
- Resolved labels and semantic categories match the source model.
- A layout can be associated with the exact model revision it realizes.
- Geometry and generated artifacts satisfy explicit readability and structural
  checks.

These preservation checks and basic geometry checks now run in the
[layout validator](modules/layout/validate.mjs). Every entity and relationship
selected by a graph has a visual representation in that graph. Eligible established groups in the selected
perspective have frames; all other grouping claims and details remain in the
embedded model and inspector. No information loss does not mean all information
must occupy the canvas simultaneously. Perceptual quality and every possible
geometric ambiguity are not guaranteed by these checks.

Spatial proximity, size, and emphasis can imply meaning even without explicit
edges. Visual conventions and review must address those implications; reference
checks alone cannot establish faithful communication or real-world accuracy.

## What to borrow from Archify

Its useful precedents include a strict structured specification, competent
SVG/HTML output, standalone viewing, geometry checks, and actionable validation
feedback. We may reuse suitable ideas or code with appropriate notices.

The architectural departure is the explicit separation of system meaning from
generated placement, plus independently usable ingestion, layout, and rendering
interfaces. We have not selected Archify's renderer as a dependency.

## First contract review

The following records the initial review; draft 0.4 subsequently adds subgraphs.

The [recorded decisions](docs/json-1.md#decisions-from-the-first-contract-review)
retain explicit claim-level evidence and adopt operation/dependency arrow
direction for the MVP. Grouping meaning depends on perspective, scope, and
abstraction level; ownership does not automatically follow containment. Subgraph
implementation is deferred, while the diagram's abstraction level must be
explicit. JSON 1 draft 0.2 reflects these clarifications through named
perspectives and a required diagram-level abstraction description.

The complete JSON 1 must remain recoverable from the exported diagram and its
accompanying information, even when only some of it is displayed. The MVP uses
an embedded model and an HTML inspector, with standalone JSON downloads.
Preserve the authored model rather than relying on reverse inference
from SVG; this is not a claim to recover facts never included in JSON 1.

## Questions to discuss next

[Markdown documents](docs/documents.md) now attach to nodes, edges, or the graph,
with explicit file-loading and portable-reference rules.
[Subgraphs](docs/subgraphs.md) now implement expansion across abstraction levels
with one shared registry and explicitly qualified boundary mappings.

- Does the first generated example communicate scope and uncertainty clearly?
- Which difficult layouts need better geometry support after this first slice?
- Which additional aesthetic preferences are useful beyond direction and grouping?
- When should the single package become independently published packages?

Further graph composition, richer correspondence between levels, checklist
design, and automated source discovery remain discussion topics.
