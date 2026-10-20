# Daedalus 1 WIP Notes

Status: WIP/unverified reference-only package.

Observed source:

- Local image: `../../../Maze_Images/Daedalus_1.gif`
- Published image reference: `https://www.astrolog.org/labyrnth/maze/fractal2.gif`
- Local discussion reference: `../../../Papers/mathpuzzle.com_fractalmaze.txt`

Current assessment:

- The image is a recursive circuit maze with numbered recursive blocks `1` through `7`, a `-` start, and a `+` goal.
- The drawing uses colored wires, apparently to make overlapping routes visually separable.
- The local discussion notes report that a hand solution exists with chip depth `7` and `66` chip-entry/exit steps.
- The repository notes checked for this package do not include a full pin netlist or replayable solution path for this specific Daedalus image.

Unresolved questions before executable logic:

- What is the canonical numbering/order for all external terminals on each recursive block?
- Do colored wire crossings connect only at marked same-color junctions, or are some overdrawn crossings logical joins?
- Are `+` and `-` terminals inside recursive copies conductive, forbidden, or ordinary local terminals?
- Which visible contacts on the outer boundary are entrances/exits versus decorative frame stubs?
- Can the reported 66-step hand solution be recovered as an ordered transition sequence?

Package decision:

Keep `strategy: reference_record` and `source_model: reference_record` until a complete audited pin-to-pin netlist and replayable solution are available.
