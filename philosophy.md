# Philosophy

> If you cannot recreate it, you do not understand it.

We are building a way to explain systems through diagrams that humans and
agents can inspect, share, and continue developing. A useful diagram must carry
enough explicit knowledge to reconstruct its meaning and update it without
guessing the previous author's intentions.

Recreation means more than reproducing an identical picture. It means being
able to reconstruct the decisions behind the picture, introduce a system
change, and generate an appropriate new representation.

## A diagram compresses and enriches

A system diagram is an interpretation of a system at a chosen scope and level
of detail.

It compresses: thousands of lines of code, modules, or operations may become
one service box. The model should explain what that box represents, what has
been grouped together, and what relevant detail has been omitted.

It also enriches: an author may group five services as “System A,” classify a
dependency as “external,” or identify a primary request path. These assertions
may not exist directly in the code. They must be stated explicitly, including
their basis and scope. “External,” for example, is meaningful only relative to
a named boundary.

Compression and enrichment are necessary acts of understanding. Their important
decisions must survive beyond the author's reasoning process.

The intended abstraction level is part of the diagram's meaning: what does one
box represent, and what detail has been collapsed? We must declare that level
and meaningful exceptions without requiring a universal numbered hierarchy.
Grouping assertions are relative to their meaning, perspective, and scope.
Responsibility for an aggregate does not automatically replace or determine
responsibility for every internal component. Expandable subgraphs can come
later; these distinctions must remain expressible now.

## Semantic isomorphism

We use **semantic isomorphism** as a design principle: the model explains the
drawing, and the drawing faithfully expresses the model.

This is a correspondence between the explicit diagram model and the meaning
expressed by its visual representation. It is not a claim that a compressed,
enriched diagram is mathematically isomorphic to the complete underlying
system. Nor does it require every source detail or explanatory note to be
visible on the canvas at once; those details must remain inspectable.

Every visual relationship intended to carry meaning must have an explicit
counterpart in the model or its presentation rules. No important assertion
should survive only as an unexplained position, size, color, or grouping.

## Coordinates are an output, not an explanation

A coordinate records where a box was placed. It does not explain whether that
placement expresses ownership, sequence, a trust boundary, a secondary path,
or simply available space.

The model must record meaningful membership, relationships, ordering, and
presentation intent independently of absolute coordinates. Layout should be
derived from those declarations.

Generated layout is a derived artifact, not an independent source of system
knowledge. Removing coordinates should leave enough information to generate
another faithful, potentially different layout. How optional aesthetic
preferences are supplied remains a design question.

## Interpretation must be inspectable

An LLM may analyze evidence, propose abstractions, introduce explicit
interpretations, and choose an explanatory view. Its important conclusions
must become editable declarations rather than disappear into a finished image.

We need concise reasons, evidence references, assumptions, and scope—not a
transcript of the model's internal reasoning. Observed facts, author-supplied
knowledge, and uncertain interpretations should be distinguishable.

Validation must state what it establishes. A structurally valid graph or a
collision-free drawing does not prove that the represented system is correct.

## Honesty before completeness

An incomplete model is acceptable. Invented completeness is a defect. Unknowns
and disputes must be explicit and remain attached to the particular claims they
qualify. Knowing that a connection exists does not establish when it runs.

A dispute must preserve the competing claims without silently selecting a
winner. Missing information is not evidence that a component or relationship
does not exist. Later stages must preserve these distinctions rather than
complete the architecture with plausible guesses.

The cost of discovering which statements were invented can exceed the cost of
gathering missing information. A polished artifact must not transfer that
debugging burden to its reader.

## Evidence and intent belong together

Existing code, configuration, and documentation are primary inputs. People
should not have to narrate every connection already established by those
sources.

Human conversation is especially valuable for knowledge the implementation
cannot establish: purpose, intended boundaries, rationale, compromises,
migrations, and work in progress. What exists, what is intended, and why they
differ must remain distinguishable. A coherent-looking diagram must not erase
a real architectural conflict.

The system model is authoritative for the diagram within its declared scope.
It is not an infallible statement about reality; its assertions must remain
traceable, revisable, and explicit about uncertainty.

## Meaning, layout, and rendering have separate responsibilities

The system model decides what is being said. Layout decides how to arrange it.
Rendering draws the result. Compression, enrichment, and other semantic
decisions belong in the system model; downstream stages must not silently add,
omit, or reinterpret system information to make a drawing easier to produce.

The final conversion from a visual specification to SVG or HTML is
deterministic code. An LLM may participate upstream without becoming necessary
for rendering an already prepared specification.

## Modularity is a product requirement

Gathering knowledge, generating layout, and rendering must have explicit
contracts and independently usable entry and exit points. A user may bring a
system model from their own process, or take our generated layout to another
renderer. Conversation is one supported ingestion method, not a mandatory
front door.

Each stage should be useful without adopting the entire application.

## Portability includes continued authorship

A standalone HTML or SVG is a useful portable viewing artifact. Our standard
also includes portable authorship: another human or agent can inspect the
model, understand its decisions, modify it, and regenerate the result.

The editable model and the information needed to interpret and render it must
travel with the artifact or be available as an explicit companion. Editing
should not require reverse-engineering SVG or inferring architectural intent
from coordinates.

Visible content and preserved content are different concerns. A canvas may
display only part of the model, but the complete JSON 1 must remain recoverable
from the delivered artifact and its accompanying information. Details may be
accessible through inspection, embedded source, or an explicit companion file.
Presentation choices must not discard qualifications, evidence references,
scope, abstraction, or rationale.

This is a lossless handoff of the authored model, not a claim that the model
contains every fact about the underlying system. Recovering the model should
not require an LLM to guess missing information from a picture.

## Presentation is part of the product

Readable composition, polished SVG/HTML, interactive exploration, a well-defined
structured format, and useful validation are strengths worth carrying forward
from Archify. We can reuse suitable implementation ideas or code with the
required attribution and license notices.

Visual quality should help readers understand explicit knowledge. It must not
substitute for that knowledge. The same underlying model should support human
reading and direct inspection by another agent.

## Different diagrams answer different questions

An architecture view and a sequence scenario can explain different concerns
about the same system. We define each supported diagram's meaning explicitly
and choose it by the question being asked. Shared evidence, documents, and
recovery do not imply that one source model can generate every kind of diagram.

Whenever a visual convention carries meaning, that meaning belongs in the
source. In a sequence diagram, vertical position communicates order: the layout
must follow an explicit claim and must not choose an unknown or disputed order.

## The test

Remove all absolute positions. Introduce a system change. Give the remaining
model to a different author or agent.

Can they identify what the diagram represents, distinguish facts from
interpretations, preserve its intended relationships and scope, and regenerate
a faithful diagram without guessing hidden assumptions?

That is the standard by which we will judge the design. Exact schema fields,
layout algorithms, interfaces, and implementation choices remain open for
discussion.
