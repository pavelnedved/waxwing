# 001: Use deterministic code for JSON 1 → JSON 2

Date: 2026-09-08

Status: Accepted for the current MVP; may be revisited with concrete evidence.

## Decision

Generate JSON 2 from JSON 1 using conventional deterministic code. The current
implementation continues to use pinned ELK layered layout, explicit layout
options, and deterministic preservation and geometry validation. No LLM is
called to interpret the model, choose composition, or generate coordinates in
this stage. JSON 2 → SVG/HTML also remains deterministic code.

Keep the current production placement policy. The consumer-direction variant
in the experiment remains an experiment; it is not promoted to the default.
Future improvements to static layout can be evaluated independently.

## Evidence and reasoning

The [pipeline reading experiment](../../experiments/pipeline-reading/README.md)
records its exact setup, reproduction commands, original measurements, and
limitations. Its declared reading task was following a successful image through
six stages, with each successive stage positioned farther right.

The current policy achieved 3/5 rightward transitions on a 930.4 × 662 canvas.
A deterministic alternative achieved 5/5 on a 3392.8 × 196 canvas. Both preserved
the same JSON 1 and operation arrows and passed the existing layout validator.
The alternative required substantially more width and smaller text at fit scale.

This establishes a task-specific ordering/compactness tradeoff. It does not
establish inferior overall human comprehension, an inherent limitation of
conventional code, or an advantage for LLM layout. No LLM was tested. The current
evidence does not justify adding an LLM stage, so we retain the reproducible
code-driven pipeline while the contracts and evaluation criteria mature.

## Boundaries

- JSON 1 remains the authority for system meaning. Layout cannot invent facts,
  resolve disputes, drop entities, or change relationship direction.
- Prose notes and the reading question remain preserved information, not
  executable placement instructions in the current implementation.
- Independent consumers can still generate compatible JSON 2 or use their own
  renderer. This decision governs our implementation, not the interchange format.
- This is an implementation decision, not a permanent philosophical prohibition
  on LLMs. Future ingestion is outside its scope.

## When to revisit

Start with a concrete fixture and an agreed reading task. State the evaluation
criteria before comparing approaches, retain semantic validation, and report
tradeoffs including readability, dimensions, reproducibility, cost, and latency.
An LLM or hybrid proposal should demonstrate a useful improvement against a
conventional-code baseline on the same input. Preserve this run as historical
evidence instead of overwriting its conclusion with a later experiment.
