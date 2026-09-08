# Construct JSON 1 from sources

This is a first workflow for an agent that can inspect your code and documents,
ask questions, and write files. It is a prompt package, not a built-in ingestion
command, a crawler, or a guarantee of factual accuracy. Adapt it after trying it
on a real system; different questions need different investigation checklists.

## Start a run with one file

Give the agent **[AGENT_GUIDE.md](../../AGENT_GUIDE.md)** plus its system sources,
Waxwing checkout path, reading question, output directory, and desired output
stage. That file contains the kickoff, exact supported source fields, complete
examples, uncertainty rules, subgraphs/workflows, sequence behavior, document
references, validation, pipeline commands, and error handling. No other Markdown
file or separately supplied schema is needed to understand the authoring contract.
The agent still needs source access to learn the actual system and a checkout to
run validation. Without execution access, it must report validation as not run.

The focused prompts remain optional references for readers who prefer a narrower
view: [architecture](workflow.md), [architecture workflows](architecture-workflows.md),
and [sequence](sequence.md). They are not additional required steps or files for
the single-file kickoff.

Keep real-system inputs, outputs and human statements outside Waxwing's public
fictional examples. The guide deliberately duplicates internal reference material
as a user-facing interface; update it with contract changes. Its complete examples
are exercised directly by `test/agent-guide.test.mjs`.

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
