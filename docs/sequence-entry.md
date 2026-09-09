# Explicit workflow entry

A sequence's entry is an evidence-backed claim about **where the workflow begins
within its declared scope**. Its upstream trigger is a separate claim. Neither
is inferred from column position, participant names, or the first arrow drawn.

Both [scenario](sequence.md) and [behavior](sequence-behavior.md) drafts support
an optional `entry` field, defined by
[sequence-entry.schema.json](../schemas/sequence-entry.schema.json):

```json
{
  "entry": {
    "point": {
      "status": "established",
      "value": {
        "participantRef": "collector",
        "itemRef": "load-markets"
      },
      "basis": {
        "sourceRefs": ["fixture"],
        "explanation": "One collection pass begins with the collector loading markets."
      }
    },
    "trigger": {
      "status": "unknown",
      "reason": "The fixture does not establish what launches the pass."
    }
  }
}
```

`point.value.participantRef` names an existing participant. `itemRef` names the
first root step, or in a behavior model, the first root control block. For a
step, the participant must equal `from`: the sender or local actor. For a block,
the point claim explicitly attributes beginning that loop or evaluating that
conditional to the participant. It does not assign that participant every action
inside the block. That attribution needs evidence; layout cannot invent it.

`trigger` is qualified text describing what launches this scoped workflow. An
unknown trigger can coexist with an established entry. Known triggers do not
automatically add participants, messages, or arrows. If a trigger interaction
belongs in the diagram, model it explicitly and review the scope and entry.

## Knowledge and consistency

Both `point` and `trigger` use the existing established/reported/inferred/unknown/
disputed vocabulary. An asserted point has one participant/item pair and basis;
an unknown has a reason and no fallback; a dispute preserves distinct evidenced
pairs without selecting one. Trigger disputes preserve their text alternatives.

Validation checks references, source evidence, matching actors for steps,
explicit absence, root placement, and consistency with order claims:

- An asserted entry item must be first in every known root-order candidate.
  A later interaction or an interaction nested in a loop/branch cannot become
  the global scoped entry merely by naming it here.
- In a disputed point, each candidate must fit at least one known root-order
  candidate. Distinct actors can disagree about a block's entry while its
  position remains established. Conflicting step actors fail because a step
  already declares its sender/local actor.
- Unknown root order defers its first-item comparison, but known nested
  placement still prevents treating that item as a root entry. The entry claim
  never settles an unknown or disputed order; existing layout blockers remain.
- A point cannot reference a step/block explicitly asserted absent. Unknown or
  disputed target definitions retain the existing rendering limitations.

Multiple runtime entry paths are not automatically a knowledge dispute. This
MVP describes one scoped entry declaration. A known first conditional or loop
can itself be the entry item. When attribution is unknown, preserve an unknown
point without inventing an actor or synthetic interaction. If the source
establishes multiple independent starts, explicitly narrow the scope when useful
or report the unsupported requirement; do not relabel known multiplicity as a
knowledge dispute.

## Presentation and preservation

For an established, reported, or inferred point, the deterministic generator
places its participant leftmost and marks both that participant and the entry
step/block with the qualification. Renaming that participant's ID cannot move
the declared start elsewhere. Other participants retain alphabetical ID order;
their column positions do not encode workflow order, ownership, or causality.

Unknown/disputed points do not choose an actor, receive a start marker, or drive
leftmost placement. Columns use the neutral alphabetical rule. The HTML and SVG
explicitly label the entry as unknown/disputed. These claims can be rendered if
the independent ordering and definition claims are drawable.

The existing root/body order and loop/conditional structure continue to define
flow. Entry metadata does not duplicate those structures or create a second
execution order. Unknown triggers do not block drawing and never become guessed
upstream callers.

JSON 2 embeds the complete entry and trigger claims in its original JSON 1.
Its existing label/header geometry reserves space for the cue; there is no
independently editable entry assertion in JSON 2. Validation checks both cue
space and the leftmost-participant convention, because the built-in renderer
explicitly tells readers to expect that convention. A different renderer may
choose a different presentation, but must state its rules and preserve the
authored source rather than silently reinterpret this presentation contract.

In HTML, a **Sequence start** summary names the starting participant and first
step or control block. **Go to start** closes details, returns the canvas to its
beginning at 100% zoom, and focuses the starting participant. Both the participant
and starting item have accent outlines in the diagram and SVG export. These
controls and markers also appear on sequence pages in multi-page exports.
Unknown, disputed, and undeclared entries show their status without choosing a
participant or offering a Go to start action.

**Inspect entry & trigger** opens both claims, their evidence, and links to the
participant and starting item (within Scope & evidence in multi-page exports).
Those records link back to the entry inspector in the single-file viewer.
The inspector URL survives reload and history. SVG retains its visible cue and
the complete recoverable source; all skins preserve the claims and geometry.

## Existing models

This is an additive optional field in the experimental sequence drafts. Older
source and layout artifacts without `entry` remain valid and recover without
injected fields or changed occurrence semantics. Their HTML says **not declared**
and uses neutral placement. Omission means no declaration was authored; it is
not an automatically authored unknown claim. Older Waxwing checkouts whose
schemas predate this extension cannot consume the new field.

New ingestion should always author `entry.point` and `entry.trigger`, explicitly
qualifying unanswered questions. Merely observing a first recorded interaction
is not evidence that it starts the intended workflow. Establish the scope and
entry proposition from sources before making that declaration.
