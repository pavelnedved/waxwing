# Layout warning signs

These are reasons to pause and investigate the layout approach, **not conditions
that automatically require switching to an LLM**. The accepted implementation
remains deterministic JSON 1 → JSON 2 → SVG/HTML. A useful alternative could be a
smaller scope, another view, better deterministic rules, a different layout
engine, an LLM-assisted composition proposal, or a hybrid. It needs evidence.

## Concrete patterns to watch

| Warning sign | What it looks like in Waxwing | Evidence to retain |
|---|---|---|
| A fix repeatedly moves the confusion | Unfolding a hub makes order followable but turns a page into a very long strip. Compacting it hides the revisits again. | Same source, both exports, reading task, canvas and viewport sizes, what a reader could/could not locate. |
| Legitimate constraints compete repeatedly | Workflow order wants Stock between two Orchestrator appearances; system grouping wants all Commerce services enclosed together; compactness wants fewer repeated boxes. | Explicit constraints and the tradeoff each candidate makes. Distinguish required meaning from optional styling. |
| Rules become specific to particular systems | “If the service is named orchestrator, put it on the second row”; exceptions for each queue/product/team; a new fixture breaks a previous exception. | Actual rule changes and regression fixtures. Renaming IDs should not change the declared meaning. |
| Small edits cause large, unexplained rearrangements | Adding one operation changes many unrelated positions, making a reader relearn the map even though their task is unchanged. | Before/after source diff and artifacts; identify which movement was necessary and which was incidental. |
| Composition choices require repeated manual judgment | Someone repeatedly chooses which equally faithful path to foreground, where to fold it, or which secondary view to offer, but the choices do not follow the existing explicit inputs. | The alternatives, task, stated rationale and user feedback. If the decision adds system meaning, record it in JSON 1 first. |
| Engine tuning outgrows a general rule | Successive ELK-option combinations, invisible helper nodes or route repairs solve isolated examples without a comprehensible contract. | Reproducible fixtures, option changes, failures elsewhere and maintenance cost. Replacing ELK may be enough. |

No fixed number of nodes, crossing count, development hours, or failed attempts
acts as a migration threshold. A repeated pattern across representative cases
is stronger evidence than one unattractive screenshot. No warning does not
prove comprehensibility.

## Problems to separate before comparing approaches

- **Missing meaning:** the graph records who calls whom but not order or scoped
  entry. Neither ELK nor an LLM may quietly fill that gap. Improve the source
  contract/evidence, or preserve the unknown.
- **Implementation defects:** overlap, wrong wiring, clipped required labels or
  lost qualifications need a fix. They do not demonstrate that deterministic
  layout is inherently insufficient.
- **Presentation limitations:** our first workflow compiler only accepts a
  continuous linear interaction path. A discontinuous path is a declared MVP
  limit, not a demonstrated limit of ELK or conventional code.
- **Reading-task tradeoffs:** one identity per component emphasizes dependency;
  repeated appearances emphasize participation. Evaluate each against its stated
  question, rather than treating one as universally better.

## Current observation: repeated orchestration

The [synthetic checkout run](../examples/orchestration/README.md) supplies one
canonical registry, an explicit six-step scenario, qualified scoped entry, and
an unknown upstream trigger. The same build includes connectivity and workflow
views. The workflow has seven appearances of five services; Orchestrator appears
three times, and the two replies create no reverse dependency records.

The source order is now visible as a monotonic path. The cost is a much wider
canvas and small text at Fit. The UI opens the path at 100% and permits scrolling,
selection of each participation, and switching back to connectivity. That makes
the tradeoff inspectable; it does not establish faster comprehension. There has
been no controlled reader study and no LLM comparison. This observation is an
instance of the first warning sign, not a reason to declare a winner.

The earlier [pipeline reading experiment](../experiments/pipeline-reading/README.md)
records a related ordering/width tradeoff and remains unchanged historical evidence.

## When investigating a warning

Save the exact JSON 1, package versions, layout options, generation command,
exports, viewport, and reading question. Before tuning anything, state an
observable task: for example, “identify the component called immediately after
the stock reply, and establish whether all three orchestrator boxes are one
service.” Record correctness, observed confusion, and navigation effort; report
geometry separately from comprehension. Keep regression cases, including simpler
ones that already work.

If comparing an LLM-assisted approach, hold the source and semantic validation
constant. Make every proposed composition choice explicit and reproducible as an
artifact. Retain complete JSON 1 and test coverage of identities, participation,
qualifications and mappings. Compare readability and task performance alongside
latency, cost, stability under edits and maintenance effort. The LLM may propose
presentation; it cannot gain permission to invent system facts from a bad layout.

An improvement on those criteria can justify revisiting the
[implementation decision](decisions/001-deterministic-layout.md). A warning alone
changes neither the architecture nor the tool choice.
