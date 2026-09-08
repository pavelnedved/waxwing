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
