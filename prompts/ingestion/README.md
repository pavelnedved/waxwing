# Construct JSON 1 from sources

This is a first workflow for an agent that can inspect your code and documents,
ask questions, and write files. It is a prompt package, not a built-in ingestion
command, a crawler, or a guarantee of factual accuracy. Adapt it after trying it
on a real system; different questions need different investigation checklists.

## Start a run

Choose the diagram by the question it should answer:

| Question | Workflow |
|---|---|
| What components exist, where are their boundaries, and what depends on what? | [Architecture](workflow.md) |
| How does one recorded path repeatedly visit components in an architecture model? | [Architecture with explicit workflow](architecture-workflows.md) |
| What interactions occur in one scenario, or repeat/branch in scoped current behavior? | [Sequence](sequence.md) |

These are different concerns with separate JSON 1 contracts. Select one useful
scope; do not automatically generate multiple diagram types from the same facts.
The sequence workflow explains the evidence and ordering requirements and limits.

Give your agent the chosen workflow, access to a Waxwing checkout, and
the source locations it may investigate. Copy this kickoff message and replace
the bracketed values:

```text
Construct Waxwing JSON 1 using the workflow at:
  [absolute path to waxwing]/prompts/ingestion/[workflow.md, architecture-workflows.md, or sequence.md]

Waxwing checkout: [absolute path]
Diagram type: [architecture or sequence]
Question the diagram should answer: [one concrete question]
Source locations: [repository paths, documentation locations, supplied files]
Environment and snapshot: [target environment and revisions, or what is unknown]
Initial abstraction: [e.g. deployed services and their dependencies]
Include: [scope boundaries]
Exclude: [scope boundaries]
Output directory: [an appropriate local directory for this system's data]
Human clarification: [ask me targeted questions / produce a draft without asking]
Existing JSON 1, if any: [path or none]

Investigate the supplied sources and construct a partial current-implementation
model. Follow the stages without asking me to approve every extracted fact.
Retain unknowns and disputes explicitly. Do not change the source repositories.
Deliver canonical model.json plus a short ingestion-report.md. Stop after JSON 1;
I will decide when to generate a diagram.
```

Use a project-appropriate output directory. Real-system inputs, outputs, and
human statements do not belong in Waxwing's public fictional examples.
The workflow has no required source folder layout and does not require a
specific model provider. Access to remote documentation depends on your agent's
existing tools and permissions; merely supplying a URL does not supply its text.

For an agent without filesystem access, provide the workflow and the contents
of its referenced schema and contract documents, plus the relevant sources.
It can return the two artifacts as text. Validation must be reported as not run
until someone actually runs the validator. Missing schema/source access is not
permission to guess their contents.

## What the stages produce

| Stage | Working result |
|---|---|
| Scope | A concrete question, source inventory, abstraction, and stopping boundary. |
| Investigate | A task-specific checklist with evidence and unresolved items. |
| Clarify | A few consequential questions, or explicit unanswered issues. |
| Assemble | Canonical JSON 1 using the existing schema and qualification rules. |
| Review | Validator result and an evidence/omission review, with honest limitations. |

Working notes are not a third contract or another source of architectural truth.
Anything necessary to interpret the model belongs inside JSON 1. The short run
report records the investigation and validation outcome for the reviewer.

## Validate the result

From the Waxwing checkout, with dependencies installed using `npm ci`:

```sh
node bin/waxwing.mjs validate /absolute/path/to/output/model.json
```

If authoring with registered Markdown files, resolve them before handing off
canonical JSON 1:

```sh
node bin/waxwing.mjs prepare /absolute/path/to/output/authoring.json /absolute/path/to/output/model.json
```

Later, when you want a diagram:

```sh
node bin/waxwing.mjs build /absolute/path/to/output/model.json /absolute/path/to/output/diagram
```

These commands use the existing CLI. There is no `waxwing ingest` command.

## First real-world review

After a run, useful feedback is: which claims were wrong or overstated, what
important information was missed, which questions were unnecessary, and where
the contract could not express the evidence. Keep a few concrete examples with
source references. A valid schema and an attractive diagram do not establish
that ingestion succeeded.

Basic checks for this package verify its local references, contract vocabulary,
and existing validator commands. The fictional examples illustrate valid output;
they are not independent evidence that this prompt extracts a real architecture
correctly. No model benchmark or automatic evidence-verification service is
included in this first version.
