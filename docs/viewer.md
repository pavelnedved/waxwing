# Readability, highlighting, and visual styles

These features interpret the existing source and geometry. They do not change
JSON 1, regenerate JSON 2, resolve uncertainty, or introduce system facts.
The HTML still contains its CSS, JavaScript, documents, and complete source;
viewing requires no framework, remote font, or application service.

On desktop, opening an inspector reserves a right-hand column and keeps the
selected diagram record in view at the current manual zoom. Closing it restores
the full canvas width. At widths of 900 pixels or less, details open in the page
below the content, with their own bounded scroll area, rather than covering it.

Architecture component cards lead with the name, a qualified role, and an excerpt
of the authored `abstraction.represents` claim. An ellipsis marks shortened text;
the full claim remains in the inspector and source. Unknown/disputed meaning is
labeled rather than choosing an alternative. Qualified or absent existence takes
the description line so it remains explicit. The default established presence is
available in the inspector. `EXT` identifies a component selected as external
context. Role colors do not upgrade inferred or reported categories.

Selecting a component emphasizes its direct connections and lowers the emphasis
of other records. Group frames and active claim highlights remain emphasized.
The component inspector begins with what it represents and its direct connections,
then provides documents, detailed graphs, and expandable claims and evidence.
Selection from automatic Fit opens at at least 100% for reading; closing restores
Fit unless the reader changes zoom. Manual zoom is preserved. Transient emphasis
is removed from SVG downloads, including reduced-emphasis context.

The opening view keeps the question prominent, collects scope information under
**About this view**, and groups standalone downloads under **Export**. Architecture
and site toolbars share one row when space allows, then wrap on narrow screens.

## Advisory readability checks

Open **Readability** below the canvas, or run:

```sh
node bin/waxwing.mjs check-layout examples/subgraphs/generated/layout.json
```

`validateLayout()` returns `warnings` for an otherwise valid layout. Warnings
do not change `ok` or the CLI exit status. Invalid layouts retain their hard
diagnostics; readability checks run only after those checks pass. Warnings are
derived results, not new fields stored in JSON 2.

| Warning code | Current measurement |
|---|---|
| `readability/shared-corridor` | Two edges with no common endpoint share a collinear segment of at least 24 drawing units. |
| `readability/crossing` | Two perpendicular route segments cross strictly inside both segments. The crossing is not a junction. |
| `readability/border-run` | An edge follows a grouping frame border for at least 24 drawing units. |
| `readability/label-clearance` | A route comes within 4 drawing units of another edge's label box. Actual intersections already fail geometry validation. |
| `readability/small-text` | Estimated 10-unit node status text falls below 8 pixels at Fit. |

Geometry comparisons use a 0.01-unit tolerance. The shared-corridor measurement
uses the longest overlapping segment pair, not the sum of separate overlaps.
Endpoint contacts do not count as crossings. These limited heuristics do not
certify that a diagram is unambiguous or comprehensible.

The CLI uses a reference viewport of 1200 × 520 pixels. The viewer uses its actual
canvas viewport and recalculates on resize. Its text warning describes **Fit**,
even while the reader uses another zoom level. It estimates scale; it does not
measure rendered glyphs. Use **100%** or zoom in when the overview is too small.
Warnings with affected records provide buttons for inspecting those records.

The independent API accepts already validated drawing geometry:

```js
import { inspectReadability } from '@felixfelicis/waxwing/layout';
const warnings = inspectReadability(json2.graphs[0], json2.graphs[0].ref, {
  width: 1000, height: 500,
});
// Each warning has severity, code, graphRef, refs, message, and measurement.
```

For older single-graph JSON 2, pass `json2` as the drawing and `json2.model.id`
as the graph reference. No checks modify the drawing or the model.

## Interactive meaning and uncertainty

The **Highlight** control operates within the active graph:

- **Selection and direct relationships:** a selected node and its incident
  edges/endpoints, or a selected edge and its endpoints. This is one hop, with
  no inferred execution order, causality, or downstream impact.
- **Unknown claims / Disputed claims:** affected visible records and links to
  their qualifications. Unknown membership does not create a grouping frame.
- **All qualified claims:** unknown, disputed, reported, and inferred claims.
- **External context:** nodes explicitly selected as context for this graph.
- **Calls / Reads / Writes / Publishes / Consumes:** the corresponding explicit
  operation edges and their endpoints. Direction stays actor → resource.

Other records remain visible. Highlights add emphasis without removing dashed
qualification styles or replacing claim text. Zero matching recorded claims
does not establish certainty or completeness. Scope and model details remain
available through the existing inspector; highlighting is not an evidence audit.

**Highlight correspondence** connects the overview and a child graph using its
recorded boundary mapping. An unknown mapping highlights only recorded external
context; it does not guess an internal caller. A disputed mapping highlights
every recorded alternative and displays the dispute without selecting a winner.
The parent view distinguishes uncertainty about a child correspondence from
uncertainty about the existence of the parent relationship.

The viewer generates shareable fragment routes such as
`#graph=order-internals&boundary=orders-payment`. Reload and browser history
restore that correspondence. This is a viewer route, not a new authored
Markdown reference type; the [document linking rules](documents.md) still apply.
General filter and style choices are session presentation controls and are not
encoded in these fragment routes. **Clear highlights** returns to selection
mode and closes the selected record.

Other viewers can reuse the pure selection function:

```js
import { selectHighlights } from '@felixfelicis/waxwing/render';
const { refs, findings } = selectHighlights(json1, graph, { mode: 'unknown' });
```

`graph` is a graph selection from `@felixfelicis/waxwing/graphs` or JSON 1's `graphs[]`.
Returned semantic refs are candidates for emphasis: a renderer should intersect
them with its drawn elements, since qualified groups need not have frames.
Findings retain links to relevant records even when they have no visible shape.

## Skins

**Standard** is the existing neutral style. **Engineering** uses cooler colors,
squarer frames, and monospace page accents. **Editorial** uses warmer colors and
serif page headings. Each supports light and dark themes.

All three retain diagram font metrics, coordinates, operation direction,
qualification labels, and dashed styles. Style switches do not run layout.
The selected style carries across graph switches within the open viewer.

```js
import { renderSVG, renderHTML } from '@felixfelicis/waxwing/render';
const svg = renderSVG(json2, { graphRef: 'overview', skin: 'engineering' });
const html = renderHTML(json2, { skin: 'editorial' });
```

The accepted skin values are `standard`, `engineering`, and `editorial`;
omitting the option selects `standard`, and an unsupported value throws.
The CLI currently renders Standard; use the HTML selector or module API for
other skins. JSON 2 has no skin setting, so another renderer can supply its own.

The viewer's SVG export retains its selected skin/theme and complete source,
while removing temporary selection/highlight classes and viewport sizing.
JSON exports preserve the source independently of presentation choices.
See [verification](verification.md) for automated coverage and browser export
limitations.

## Architecture workflow view

Models with explicit architecture workflows gain a **View** selector for each
parent graph. Connectivity keeps its existing selection/uncertainty filters and
grouping frames. A workflow opens at 100% for scrolling; Fit gives an overview.
Repeated component IDs are visible, selecting one highlights all its appearances,
and its inspector lists each participation. Step details show occurrence evidence,
operation references or reply references. **Workflow entry & order** opens the
source claims, including the separately qualified trigger.

Workflow labels carry occurrence qualification; grouping appears as direct
membership labels in the selected perspective. The current architecture filter
toolbar is available in Connectivity. The document reader, skins, theme,
Back/Forward, deep links, and full source recovery work across both views.
SVG download uses the current view. Wide paths can trigger readability warnings;
see [workflow rules](architecture-workflows.md) and
[warning signs](layout-warning-signs.md).

## Several linked pages

The optional [site exporter](site-export.md) renders separate graph, workflow and
document pages with a generated index. Its CSS/JavaScript are shared local files,
and recovery uses the complete directory rather than an individual page.
