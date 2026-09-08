# MVP verification

The first end-to-end slice was checked on 2026-09-08.

## Automated

`node --test` now passes 91 tests (52 original pipeline tests, 20 document
tests, and 19 subgraph tests) covering JSON 1 qualification and references,
grouping perspectives, JSON 2 coverage and geometry, source tampering,
deterministic generation, independent CLI stages, and complete model recovery
from both SVG and HTML. Tests include unknown existence, explicit absence,
runtime cycles, and Unicode/markup-like model content.

The generated SVG was also parsed as XML, and the saved JSON 2's embedded model
was compared against the original example. Viewer JavaScript passed a syntax
check. Local documentation links were checked.

## Browser

The generated HTML was visually inspected in the Codex in-app browser through
a loopback-only preview. Checks exercised the ownership-dispute inspector,
complete model details, readable zoom, fit, and theme switching. Both ownership
reports remained visible and no browser errors were reported during those
checks. A narrow viewport measurement showed no page-level horizontal overflow;
the graph itself supports scrolling at readable zoom.

Two checks remain unverified in this browser environment:

- Browser policy blocked direct `file://` navigation. Direct-file opening was
  not tested here; the HTML uses inline assets and requires no application server.
- Clicking the JSON 1 export control did not produce an observable download
  event through the browser automation interface. Browser-initiated downloads
  are therefore not claimed as verified. CLI-generated files and recovery are
  verified independently.

These checks do not establish layout quality for arbitrary graphs, the truth of
supplied evidence, or authenticity of externally modified exported markup.

## Markdown documents, 2026-09-08

Automated checks cover all attachment types, arbitrary source directories,
per-file relative links, reference-style links, heading identities, invalid
references, duplicate registration, unsupported assets, raw HTML and URL handling,
source snapshot updates, input-file protection, schema compatibility, and
recovery of Markdown and raster images after deleting the test source folders.
Adding documents was also checked to leave the architectural geometry unchanged.

Browser checks on the fictional documented-orders example verified:

- Opening Order Worker's attached Markdown document from its inspector.
- Following a relative link into a heading in another document.
- Reloading a document/heading URL.
- Navigating from a document to a relationship and back/forward through browser
  history, with the original edge meaning and qualifications still available.
- Copying just the HTML file to a deeper directory with a different filename and
  using its embedded documents and links there. No Markdown files were copied.
- Displaying an explicit error for an unknown document URL target.
- The document catalog and reader at a narrow browser width.

The generated viewer JavaScript passed a syntax check. Direct `file://` opening
and browser-triggered downloads remain unverified for the reasons above; these
limitations were not bypassed. CLI output and embedded source recovery are tested.


## Subgraphs, 2026-09-08

Automated checks cover canonical identity reuse; exact per-graph node/edge
coverage; deterministic generation; two- and three-level hierarchies; explicit
unknown and disputed boundary mappings; multi-edge mappings; missing mappings;
invalid parent/context references; expansion cycles; operation, direction, and
condition preservation; independent grouping selection; graph-qualified
Markdown references; old-version compatibility; and complete recovery from HTML
or either level's SVG. CLI checks render a selected child SVG, rename it, remove
the input JSON 2, and recover the full original model from that SVG alone.

The full suite passes 91 tests. Viewer JavaScript passed a syntax check, and
`npm run demo:subgraphs` generated the complete example successfully.

After the user restarted the app, the remaining subgraph browser checks passed:

- Parent-node inspection exposes the expansion entry; opening it selects the
  correct child graph with external-context labels and qualified mappings.
- A parent-edge inspector links to its detailed correspondence and displays the
  unknown mapping without inventing an internal caller.
- Breadcrumbs return to the overview. Close and Escape dismiss the inspector
  while retaining the active graph.
- Attached Markdown opens from the catalog, displays attachments across levels,
  and links to the correct detailed edge.
- Reload preserves a child-edge URL; Back returns to its document and Forward
  restores the child edge and inspector.
- Theme survives graph switches; 100% zoom works and switching graphs refits the
  newly selected canvas.
- An unqualified shared-node URL presents a graph choice. A scoped node URL
  naming a graph that does not show the node reports an explicit error.
- A copy of only the HTML, renamed and placed two directory levels deeper,
  displays its Markdown and navigates to the child graph with all qualified
  mappings. No source Markdown, images, or JSON files were copied.
- A screenshot confirmed the rendered child graph. No browser console errors
  were captured in the successful test tab.

No product-code changes were needed during these checks; the existing 91-test
result remains current. The old loopback preview process returned empty
responses after restart; it was replaced on the same port, with logs redirected
to a file. The current preview is `http://127.0.0.1:4180/diagram.html`.

Direct `file://` opening and browser-triggered download events remain unverified
under the earlier environment limitations. They were not retried or bypassed.
CLI export and complete source recovery are verified independently.

## Readability, highlighting, and skins, 2026-09-08

The full suite passes 103 tests. New coverage checks shared corridors, proper
crossings versus endpoint contacts, border runs, near-label clearance, viewport
text estimates, advisory warnings that leave validation successful, direct-only
relationship selection, graph scope, unknown and disputed correspondence,
qualified memberships/notes, and unchanged source/geometry across all three
skins. All three current demos were regenerated; historical experiment outputs
remain unchanged.

Browser checks on the regenerated subgraph example verified:

- Selecting Order Worker highlights only direct incident edges and endpoints.
- Consumes highlights the worker-to-queue operation without reversing it.
- Unknown mode in the overview links to the child's unresolved payment mapping;
  the child highlights only Payment Provider and states that no internal edge
  is invented.
- Disputed correspondence highlights both recorded repair alternatives and
  displays the dispute without choosing a winner.
- Correspondence survives reload, Back, and Forward. Clear removes highlights.
- Engineering and Editorial were visually inspected in light and dark themes;
  Engineering's selected style also persisted across graph navigation.
- The Readability panel reports the Fit estimate (6.1px in the checked viewport)
  and suggests full-size reading. Qualification dashes and text remain visible
  during highlighting.
- No browser console errors were captured in the successful test tab.

Generated viewer JavaScript passes syntax checking. Automated source recovery
checks pass for every skin. Browser-triggered downloads and direct `file://`
opening remain unverified under the earlier environment limitations; no bypass
was attempted. The SVG download cleanup is implemented, but its browser download
event is not claimed as verified.

## Default demo coverage

`npm run demo` now builds the example containing both subgraphs and attached
Markdown. The previous default built the original single-graph example, which
is still available as `npm run demo:basic`.

A regression test first reproduced the missing subgraph in the default output.
It now builds the demo in an isolated temporary checkout and recovers both graph
levels and attached Markdown from the resulting HTML. A separate fixture check
verifies graph, node, and edge attachments plus links across graph levels.
The full suite passes 105 tests. This correction changes the default command
and walkthrough; the existing viewer and example content are unchanged.

## Basic sequence diagrams

The full suite passes 120 tests, including 15 sequence tests. Coverage includes
explicit order independent of array storage, complete/unique step coverage,
repeated interactions, reply targets and ordering, local events, qualified
occurrences, unknown/disputed ordering, absent/unresolved occurrence blockers,
source/digest equality, rejected geometric reordering/rewiring, long Unicode
labels, document targets, all skins, source text escaping, generated script
syntax, and a sequence module import without ELK. CLI tests build in a temporary
directory and recover complete source/Markdown after removing input files.

Browser checks on the fictional five-step demo verified:

- The timeout loop stays at Checkout, the payment reply points back to Orders,
  and the retry has a separate numbered row.
- Inspecting the payment reply exposes its evidence and a working reference to
  the original payment message.
- The order inspector displays all five step references with their common
  ordering evidence. The retry note displays its explicit unknown answer.
- The embedded document links to the retry and other steps. Reload retains a
  selected step; Back returns to the document and Forward restores the step.
- The document and diagram were visually inspected at a narrow browser width.
  Standard/light and Engineering/dark display correctly; 100% and Fit width work.
- No browser console errors were captured.

The regenerated sequence example includes JSON 2, SVG, and self-contained HTML.
Browser-triggered downloads and direct `file://` opening remain unverified under
the earlier environment limitations. Automated CLI export and source recovery
are verified; no bypass of those browser limitations was attempted.

## Sequence loops and if/else

The full suite passes 140 tests, including 20 behavior tests. The separate
`0.2-sequence-draft` contract preserves the original scenario version. New
coverage includes nested collection loops/conditionals, explicit empty arms,
storage-order independence, qualified predicates and visitation order, unresolved
body-order blockers, unsupported execution modes, containment cycles, multiple
parents, orphan definitions, and reply validation across branches and loop
contexts. Geometry checks reject moved interactions, swapped regions, missing
frames, and false containment. Complete source and Markdown recover from SVG/HTML
in every skin, including after CLI input files are removed. Failed layout leaves
the previous HTML intact.

Browser checks on the fictional market collector verified:

- The conditional and its two arms sit inside the collection loop. The save
  follows the selected arm inside the loop; completion sits outside the loop.
- Selecting loop and conditional headers opens the corresponding definitions,
  evidence, body references, and attached Markdown. The loop inspector retains
  unknown visitation order separately from established sequential execution.
- Markdown links navigate to a block and an interaction. Reload preserves the
  block URL; Back restores the document and Forward restores the block inspector.
- Standard/light and Engineering/dark were visually inspected, as were the
  document reader, 100% zoom, and Fit width. At the narrow preview width, Fit is
  an overview; 100% requires scrolling to read the full diagram.
- No browser console errors were captured.

Browser checking found that a whole-frame accessible button could select an
interior arrow at its center. The accessible target now covers the frame header;
selection was rechecked successfully, and generated-markup coverage guards it.

Both sequence demos were regenerated. The default architecture demo remains
unchanged. Browser-triggered downloads and direct `file://` opening retain the
earlier unverified status; no bypass was attempted. These checks do not establish
program correctness, predicate equivalence, concurrency behavior, or arbitrary
diagram readability.

## Explicit sequence entry

The full suite passes 152 tests, including 12 entry tests. Coverage checks both
sequence contracts; separate trigger qualification; ID renaming and storage-order
independence; omitted, unknown, disputed, reported, and inferred entries; entries
at a root step, loop, or conditional; actor/reference/evidence consistency;
rejection of later or nested starts; unresolved ordering remaining unresolved;
leftmost placement and label/header space in JSON 2; source/digest preservation;
all skins; and complete recovery. Trigger-only changes preserve geometry while
remaining covered by the source digest. Existing sequence CLI recovery tests
now also exercise entry claims after input files are removed.

The regenerated market demo was checked in the browser. The declared entry
participant and starting interaction display their qualification. The entry
inspector shows evidence, links to the participant and interaction, and a
separately unknown upstream trigger. Entry-to-step links and the return link
work; reload retains the entry URL, Back returns to the step, and Forward
restores entry inspection. The cue was visually inspected at 100% in Standard
light and Engineering dark, and Fit width still works. No browser console errors
were captured. Both sequence demos were regenerated with explicit scoped entry.

Documentation links and viewer script syntax were checked. The earlier
limitations on browser-triggered downloads and direct `file://` verification
remain; they were not bypassed.
