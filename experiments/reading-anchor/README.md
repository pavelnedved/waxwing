# Generation-time reading anchor experiment

Run from the repository root:

```sh
node experiments/reading-anchor/run.mjs
```

Open [the comparison](generated/index.html). Each case retains both full
HTML/SVG exports and JSON 2 with complete source. [Measurements](generated/measurements.json)
record the input options, implementation/package-lock hashes, Node version and
1200 × 520 reference viewport. Re-running replaces this experiment's generated
output; the earlier pipeline experiment and its historical measurements are
untouched.

## Criterion set before the comparison

Locate the chosen component at the leading edge, then inspect its recorded
connections. No component may begin before it on the reading axis. Require
unchanged source, graph coverage, operation arrows, qualifications and eligible
grouping, valid geometry, and exact source recovery. Measure dimensions, Fit,
bends and crossings separately. A leading node is not evidence of execution
entry, a complete workflow, or better human comprehension.

## Initial results

| Case | Default canvas | Anchored canvas | Observation |
|---|---|---|---|
| Fulfillment, grouped incoming dependencies | 1488 × 507 | 1568 × 920 | Start is now at the left; height increases substantially. |
| Orchestrator, shared hub | 1449 × 604 | 887 × 808 | Start is at the left; narrower but taller. |
| Upload API, queue pipeline | 930 × 662 | 1272 × 637 | An exclusive first layer makes the view wider. This does not unfold a processing sequence. |
| Worker inside nested groups | 1553 × 590 | 1553 × 606 | Leading placement survives nested containment with a small height increase. |

All eight baseline/anchored exports pass semantic/geometry validation and source
recovery. All four anchored cases meet the stated leading-edge criterion. These
fixtures have zero measured edge crossings in both variants, so this run does
not demonstrate an aesthetic benefit from accepting additional crossings.

## Warning-sign audit

**A real tradeoff appears in multiple cases:** foregrounding the chosen reader
entry can increase width or height, reducing Fit readability. This matches the
documented “legitimate constraints compete” and “fix moves the confusion”
patterns. The grouped incoming case is especially important to review at 100%.
No automatic compactness repair is added here.

The implementation tried a native first-layer constraint, then an exclusive
first layer to keep other source nodes from sharing its column in flat views. Applying the
exclusive constraint at every grouping level failed for an incoming edge into
Fulfillment's group: ELK prohibits incoming hierarchy ports at `FIRST_SEPARATE`.
A general hierarchy rule—exclusive at the outermost anchor unit, ordinary first
inside it—handles that case and the nested fixture. There are no service-name
exceptions or invisible topology. The regression matrix covers all component
anchors in the Order Processing, Subgraphs, and Multi-page fixtures, both
directions and every available grouping perspective: 62 combinations. Additional
tests cover cycles, self edges, disconnected nodes, nesting, renamed IDs,
graph-specific choices, default stability and source recovery.

This is not yet evidence of consistently escalating engine tuning, unexplained
rearrangement under small edits, or repeated manual composition judgment. Those
remain things to watch on real systems. There has been no LLM comparison or
reader study. The accepted deterministic pipeline remains in place; any later
alternative should be compared on these same sources and reading tasks.
