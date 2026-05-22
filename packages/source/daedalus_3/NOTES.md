# Daedalus 3 WIP Notes

Status: WIP/unverified reference-only package.

Observed source:

- Local image: `../../../Maze_Images/Ed_Pegg_Jr/Daedalus_3.gif`
- Published image reference: `http://www.mathpuzzle.com/DaedRecursive.gif`
- Local discussion reference: `../../../Papers/mathpuzzle.com_fractalmaze.txt`

Current assessment:

- The image is a rectangular recursive circuit maze with numbered recursive blocks `1` through `7`, a `-` start, and a `+` goal.
- The drawing uses colored wires and visible junction dots; this should be traceable by hand, but the package does not yet include the audited netlist.
- The local discussion notes report that a hand solution exists with chip depth `6` and `42` chip-entry/exit steps.
- The repository notes checked for this package do not include the actual 42-step path.

Unresolved questions before executable logic:

- What terminal numbering convention should be used for the rectangular drawing and the smaller block pin counts?
- Do all same-color wire intersections connect, or only those with visible junction dots/continuous segments?
- Which side contacts on the outer frame are active recursive maze terminals?
- Are `+` and `-` conductive inside recursive copies?
- Can the reported 42-step hand solution be reconstructed and independently replayed against an audited Port Graph?

Package decision:

Keep `strategy: reference_record` and `source_model: reference_record` until the pin netlist and transition replay are derived.
