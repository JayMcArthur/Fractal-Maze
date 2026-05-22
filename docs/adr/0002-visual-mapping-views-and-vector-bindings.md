# Visual Mapping Views And Vector Bindings

Accepted.

Fractal Maze Lab will keep visual presentation in an optional package-adjacent Visual Mapping file rather than making graphics part of source logic. A Source Package starts with at most one `visual.yml`, which may contain multiple Visual Views; default playback prefers Authored Vector Views, then Generated Views when natural for the maze family, then Image Overlays as a fallback or source-reference view. For Authored Vector Views, an external SVG may be the canonical geometry source, but Visual Mapping is the canonical package binding source between SVG elements and logical objects. This preserves high-quality vector rendering and path playback without letting SVG markup define legal movement.
