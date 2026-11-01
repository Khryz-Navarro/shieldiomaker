---
version: 1
slug: "src-app-jsx"
primary_target: "src/App.jsx"
related_targets: ["src/index.css"]
---

# Homepage: the badge maker

- **Scope:** the single page (`src/App.jsx`) is the homepage and the tool. Visitor mode: Operate.
- **Audience and job:** a developer arrives with one badge in mind, edits it, copies Markdown or HTML, and leaves.
- **Constraints:** keep the Quiet Workbench world (DESIGN.md). Every current capability stays: label, message, both links, colors, five styles, Simple Icons logo and logo color, and every output format. Keep the browser default focus ring on ordinary controls (user decision). Client-only.
- **Chosen layout:** Live Badge Editor (user locked it on 2026-11-01).
- **Memorable moment:** you type directly on a big badge, and only the half you're editing lights up.
- **Unresolved:** whether the large editable replica needs a per-style fidelity pass beyond corner radius, case and weight.

## Direction contract

THESIS: The badge is the editor. The page refuses the category-default form of stacked fields next to a small preview, and puts text editing on the badge itself.

OWN-WORLD: Quiet Workbench: Graphite Lilac panels with 1px Lilac Border, 6px/10px radii, flat, system-ui, mono only for the pasted snippet. Workbench Violet appears only on the half being edited, the active segment and the selected icon.

STORY: The visitor sees a large badge with a caret in it, understands it's editable, types label and message, picks an icon from the slot on the badge, sets colors in the callout under each half, checks the real Shields.io render, and copies.

FIRST VIEWPORT: Slim header with the title only; the edit hint lives in a status line at the bench foot that names the half being edited. A wide bench panel takes most of the height: a style segmented control centered at the top, and the badge at about 3x centered with its label and message halves as inputs and the icon slot inside the leading half. A row of three callouts sits beneath it (Icon, Label, Message), and the icon picker opens inside the bench. Below the bench is the output strip: the real Shields render, format segments, the mono snippet and Copy. The primary action, Copy, stays visible at 1440×900.

FORM: Live Badge Editor, third of three dealt structures (my ranked list position 3). seed:fdb88ba1bea592b6

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
