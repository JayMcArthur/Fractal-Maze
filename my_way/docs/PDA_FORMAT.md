# Path PDA interchange and connection text

The browser imports and exports `path-pda/1` JSON (`.pda.json`). Import creates a separate maze with a fresh ID. A named export retains its title. Use `.fmaze` for the complete project, including source artwork and proof notebooks; PDA JSON carries the movement model and guide input, without saved proof claims.

The format records path states and labels, connection IDs, input symbols, stack symbols, start/finish addresses, alternate finishes and optional root-identity symbols. Addresses and push arrays run from bottom to top. Empty input is epsilon. Acceptance requires an exact declared path/address; physical Play also requires reaching the drawn finish.

For every stack top `T` (including the bottom marker), an ordinary connection expands as follows:

| Connection | Pop | Push |
| --- | --- | --- |
| Enter copy C | T | T, C |
| Walk at this level | T | T |
| Exit copy C | C | empty |

The bottom marker never names a copy and cannot be popped by an exit. Export chooses an unused bottom symbol, including when a copy is literally named `⊥`.

Import checks every expanded guard in each source-connection family. Missing/duplicate rules, altered destinations, conflicting input/stack alphabets and unsupported compound or stack-dependent operations are errors. Guards are never discarded to make a file playable. Earlier app exports lacking title, representation, explicit movement-rule or evidence fields remain readable; recovered transition provenance is marked as imported. The declared infinite/Cantor rule remains separate from ordinary transitions. Its proof must be constructed or imported as a checked complete project/replay.

Build's **Enter connections as text** accepts existing IDs or unique path labels:

```text
1 -> A.2
A.2 -> 3
3 <-> 4
```

`->`/`→` adds only the directed connection. `<->`/`↔` also adds its reverse. Bare endpoints stay at the same level; a prefixed endpoint enters or exits one declared copy. Each line has at most one prefixed endpoint. Multi-copy and copy-replacement guards require a separate compound representation and are rejected by this input syntax.

All lines validate before the model changes. Errors identify the invalid line; a failed batch adds nothing. IDs remain distinct even when two connections share an input label. Editing marks the model WIP. The dropdown form also retains full path IDs, including hyphens.

Proof setup trails are independent: editing a left/right setup invalidates that side's repeat while retaining the other side. Every proof edit invalidates the prior check; the checker revalidates both witnesses before a claim can be saved or used. The supported infinite/Cantor certificate rules require bidirectional ordinary connections; one-way models retain their finite traversal rules.
