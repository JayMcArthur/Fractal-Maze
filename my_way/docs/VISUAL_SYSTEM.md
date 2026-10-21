# Interface surfaces

The [generated reference](design/surface-reference.png) guides the interface's
spacing, contrast and hierarchy. Its sample maze shapes, authors, tabs and proof
checkbox are illustrative. Actual maze documents, movement rules and checked
witnesses define behavior; a visual reference never supplies proof evidence.

The reference was generated with the built-in image generation tool. Its prompt
is retained in [surface-reference-prompt.txt](design/surface-reference-prompt.txt).

## Style ownership

`src/index.css` imports Tailwind and the authored surface styles in order:

| File | Owns |
| --- | --- |
| `styles/base.css` | Color tokens, typography, buttons, fields, navigation, dialogs and shared states |
| `styles/home.css` | Home content and Build entry cards |
| `styles/library.css` | Author collections, cards, filters, artwork references and cover picker |
| `styles/play.css` | Native/path play, sessions, depth, controls, replay transport and credits |
| `styles/tools.css` | Grid editor, inspector and solver surfaces |
| `styles/workbench.css` | Tracing, path models, authoring controls and their responsive layouts |
| `styles/proof.css` | Witness boards, proof fields, checked states and proof-specific modal layout |

Change a surface in its owner. Do not add a later global override to compensate
for an earlier conflicting declaration. Layout utilities remain useful; use
semantic surface/text/action classes for interface colors instead of remapping
Tailwind's color names to a different theme.

## Shared rules

- Cream page, warm light panels, dark forest navigation, green primary actions.
  Blue identifies the current proof corridor. Maze colors remain domain data.
- Use `--font-ui` in component font shorthands. Mixing a shorthand with a later
  `font-family: inherit` override can produce invalid optimized CSS. Review
  typography against the production preview; browser checks protect label hierarchy.
- Use one clear primary action in each region. Keep related secondary actions
  aligned with it, with consistent padding and borders.
- Regular controls are at least 40px high, 44px on narrow screens. Inputs/selects
  keep readable text and flexible widths. Checkbox/radio controls stay beside
  their labels. Avoid styling them as ordinary text fields.
- Use `Dialog` for modal focus containment, Escape handling, focus restoration,
  background scroll locking, fixed header/footer and a scrollable body. The finish
  dialog retains its restart/save/next actions and cannot be dismissed without
  taking one of those actions. Proofs keep their large paired-board layout inside the same dialog structure.
- Keep titles, control labels, status and credits readable at phone widths.
  Scroll long lists within their owning panel; avoid horizontal page scrolling.
- Do not scale or redraw maze geometry as a styling fix. Canvas/SVG aspect ratios,
  playable transitions, recording snapshots and solver/proof semantics stay in
  their existing owners.

Browser workflows cover native dialog focus/scrolling, narrow layouts, meaningful
errors and existing play/proof/replay/authoring interactions. Route/state review
records and release acceptance belong to the scoped SilverBullet project plan.
