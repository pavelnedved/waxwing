# Restart handoff — completed

Updated 2026-09-08 after the user restarted/resumed. **The pending browser checks
are complete.** See [verification.md](verification.md) for observed results and
the remaining direct-file/download environment limitations. No further user
input or product-code fixes were required. The instructions below are historical
handoff context, not unfinished work.

## Complete

- JSON 1 draft 0.4: one canonical registry, scoped graph selections,
  internal/context distinction, root graph, parent-node expansion, and qualified
  boundary mappings. Explicit membership selection per graph; no inheritance.
- JSON 2 draft 0.3: complete original source once and independently validated
  geometry per graph. Old single-graph versions still work.
- Markdown graph references and optionally graph-scoped node/edge attachments.
- HTML graph switching, breadcrumbs, node expansion entries, parent-edge
  correspondence links, scope/abstraction text, mapping inspection, and scoped
  unknown/dispute lists. Source-only records remain inspectable in the catalog.
- SVG API/CLI selection with `--graph`; each SVG still retains the full source.
- Fictional example in `examples/subgraphs/`, with regenerated outputs.
- Full suite: **91 tests pass** (19 new subgraph tests). Syntax check passes.
- Current rules: [subgraphs.md](subgraphs.md). README and other contract/module
  docs updated; the old design proposal is explicitly historical.

## Original resume instructions (completed)

1. Read [verification.md](verification.md), especially the remaining subgraph UI
   checks. Do not claim these are complete from the earlier document-only tests.
2. Preview `examples/subgraphs/generated/diagram.html`. A loopback server was
   started on **4180**, command:
   `python3 -m http.server 4180 --bind 127.0.0.1 --directory examples/subgraphs/generated`.
   Check whether it survived before starting another. Previous server session
   ID was 4964; it may not survive restart.
3. The visible in-app tab was ID 4 at `http://127.0.0.1:4180/diagram.html`.
   A separate hidden test tab was ID 5 with a direct child-node URL. Discover
   current browser state after restart; do not reuse stale bindings or indices.
4. Exercise the remaining browser cases listed in verification.md. The user was
   interacting with the visible preview during development, so a separate test
   tab avoids taking over their navigation.
5. Fix any observed issues, run appropriate checks, regenerate with
   `npm run demo:subgraphs`, and update verification status.

One successful screenshot showed the detailed graph, its context components,
and qualified edges. Accessibility checks showed known/unknown/disputed mappings
and a correctly selected Order API inspector from a direct child-node URL.
Some later viewer refinements have not been browser-tested yet.

Earlier `file://` navigation was blocked by browser URL safety policy. Do not
bypass that restriction with another transport/browser; retain the limitation.
Browser-triggered download events were also unverified. CLI export and source
recovery are tested. No deployment, publishing, or git commit was performed.

## Contract choices to preserve

- Each non-root graph has one parent; several graphs can expand the same node.
- Every visible parent edge incident to that node has exactly one mapping.
- A mapping can identify a set of detailed edges, be unknown, or retain
  disputed alternative sets. No generated connections or selected winner.
- Mappings preserve operation, direction, outside identity, and exact recorded
  condition. Arbitrary internal workflow paths need a later extension.
- Documents remain just documents; no contract subtype or required level.
- JSON 1 remains the only authority for system meaning. Full source travels
  through JSON 2 and all artifacts. No LLM layout step.


## Completion

The local preview was restarted on port 4180 after its previous orphaned process
returned empty responses. Current process session: 70924; log:
`/tmp/waxwing-subgraph-preview.log`. The verified preview tab is now in-app tab 3,
marked as a deliverable at `http://127.0.0.1:4180/diagram.html#graph=order-internals`.
Temporary copied HTML was removed after its navigation checks passed.
No product code changed, so the 91 passing automated tests remain current.
