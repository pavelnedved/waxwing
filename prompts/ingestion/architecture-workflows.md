# Agent workflow: architecture with explicit participation

Follow the [architecture ingestion workflow](workflow.md) for source access,
scope, evidence, canonical identities and review. Apply the additions below
when the user wants to trace one recorded interaction path through architecture
components, especially one that revisits an orchestrator. Read the actual
[schema](../../schemas/system-model.schema.json) and
[architecture workflow contract](../../docs/architecture-workflows.md).
Target `0.5-draft`, including the required `workflows` array, instead of `0.4-draft`.

Do not infer an interaction order from dependencies, node labels, filenames,
array order, or a visually pleasing arrangement. Do not automatically add a
workflow when connectivity already answers the user's question.

1. Establish the parent graph, current snapshot, abstraction, and one concrete
   scenario. Identify evidence for its entry, operations, replies, local events,
   order, and stopping boundary. Distinguish a recorded scenario from a claim
   about all possible behavior.
2. Reuse canonical entity IDs. Give every interaction its own globally unique
   step ID and occurrence qualification. A service revisited three times remains
   one entity. Do not create appearance IDs or positions in JSON 1.
3. Map each message to a selected architecture operation with matching
   actor-to-resource endpoints. Repeated invocations may use one relationship ID
   with different step IDs. Replies name their earlier message with `replyTo`
   and reversed endpoints; never add reverse dependency edges just to show replies.
   A local event stays on one actor and has no operation mapping.
4. Record `order` as a qualified complete step list. Qualify the scoped
   `{participantRef, itemRef}` entry separately from its upstream trigger. An
   observed first call does not establish how the workflow was initiated. Keep
   unsupported order, occurrence or trigger claims unknown/disputed.
5. Check the first presentation's limits: one continuous path, where each
   interaction's recipient is the next actor. Do not invent a return, reorder a
   run, or drop uncertainty to make it render. Report discontinuity or unresolved
   ordering as a layout limitation. Loops/branches are currently available in the
   separate [sequence behavior workflow](sequence.md); they are not supported by
   this architecture workflow presentation.
6. Attach Markdown explanations with semantic graph/workflow/node/step references
   where useful. Keep conditions, omissions, why the scope was chosen and evidence
   qualifications in JSON 1 or included documents, not hidden in geometry or an
   external-only report. Preserve the source responsibilities and grouping
   perspectives; do not invent stage boundaries to improve appearance.

Use [the fictional example](../../examples/orchestration/model.json) for shape
only. It is not evidence for another system. Run the normal `validate`/`prepare`
commands and record any drawing blockers in the ingestion report. A successful
validator result establishes internal consistency, not factual truth or visual
quality. Stop at JSON 1 unless the user has also authorized generation.
