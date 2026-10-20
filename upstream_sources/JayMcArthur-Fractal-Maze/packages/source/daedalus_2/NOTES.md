# Daedalus 2 WIP Notes

Status: WIP/unverified reference-only package.

Observed source:

- Local image: `../../../Maze_Images/Ed_Pegg_Jr/Daedalus_2.jpg`
- Published post reference: `http://numb3rs.wolfram.com/406/`

Current assessment:

- The image shows a smaller recursive circuit maze with numbered recursive blocks `1`, `2`, and `3`, plus `-` and `+` terminals.
- The available local image is a compressed black-and-white JPEG. Several wire crossings, contact points, and block pins are too blurred to safely transcribe into executable logic without manual redraw or a cleaner source.
- No local package-adjacent solver notes, complete pin map, or replayable path were found for this image.

Unresolved questions before executable logic:

- What is the exact terminal order around each numbered recursive block?
- Which black dots are electrical/logical junctions, and which nearby crossings merely pass over/under?
- Does the outer frame define additional boundary terminals, or only visual enclosure?
- Are recursive copies of `+` and `-` traversable, dead ends, or excluded from submaze semantics?
- Is there a known solution path from the Numb3rs/Wolfram source that can be replayed?

Package decision:

Keep `strategy: reference_record` and `source_model: reference_record` until a cleaner trace or authoritative path is available.
