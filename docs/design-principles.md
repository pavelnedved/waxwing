# Design principles

## Deliver useful work before asking for human input

The system should complete everything it can establish independently, present
a useful result with its evidence and limits, then invite the human to fill the
remaining consequential gaps. A person should be able to improve something
they can already use. Each question should make clear what their answer will
improve or unblock. Missing answers should leave explicit unknowns while
independent work continues.

This is a product rule for analysis, authoring assistance, review and future
interfaces. It is not a requirement that a person approve routine machine work,
or a reason to delay necessary input when the task truly cannot proceed.

## Ask humans for meaning

Human contributions are especially valuable for:

1. **Terms and verbs:** what domain language means in this system.
2. **Intended boundaries:** what a component should handle and what it should
   exclude or avoid.
3. **Goals, intentions and assumptions:** why the system exists, why a choice
   was made, and what must hold for that choice to remain appropriate.

Use code and available tooling to establish literal behavior, declarations,
references and relationships to the extent supported by the evidence. Search
existing explicit explanations before asking their authors to repeat them.
Do not promote implementation patterns into claims about these three categories
unless the intent is explicit in the available evidence. An enforced condition
is evidence of that condition; it does not by itself explain why it was chosen.

Keep the source and status of explanations visible. A code observation, a human
statement, an inference and an unknown have different meanings. Re-analysis
should preserve human contributions and flag possible conflicts for review.

## Connect specialized models

Architecture, source code and formal proofs answer different questions. Share
evidence and reference conventions where useful, and connect model families
through explicit mappings. Do not force every declaration into an architectural
component or every relationship into containment.

Repositories, services and documents can relate many to many. Trees, diagrams
and document sequences are reading choices over that knowledge. A valid JSON
model or an attractive view does not establish that its explanation is true.
Any formal guarantee must name the proposition, assumptions and verification
that support it.
