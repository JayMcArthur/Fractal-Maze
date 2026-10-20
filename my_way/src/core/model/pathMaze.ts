export interface PathState {
  path: string
  /** Stack from surface to current copy; some imports retain an explicit surface symbol. */
  address: string[]
}

export interface PathConnection {
  id: string
  from: string
  to: string
  operation: 'enter' | 'exit' | 'walk'
  copy: string
  input: string
  evidence: string
}

export interface MazePath {
  id: string
  label: string
  color: string
  helper: boolean
}

export type InfiniteRule = 'finite' | 'infiniteHop' | 'cantorHop'
export interface ProofStep {
  kind: 'edge' | 'lemma' | 'hypothesis'
  reference: string
  reverse: boolean
}
export interface ProofClaim {
  id: string
  rule: InfiniteRule | 'connection'
  from: PathState
  to: PathState
  period: string[]
  scope: string[]
  first: ProofStep[]
  second: ProofStep[]
  /** Finite approaches to the two repeat anchors, before their repeating witnesses. */
  setup?: { first: ProofStep[]; second: ProofStep[] }
  /** Joint Cantor hypotheses: every declared connection needs its own finite derivation. */
  companions?: { id: string; from: PathState; to: PathState; witness: ProofStep[] }[]
}

export interface PathMazeDefinition {
  type: 'pathPushdown' | 'infiniteRule'
  paths: MazePath[]
  copies: string[]
  /** Internal surface symbols retain mutable root identity without adding a maze level. */
  surfaceSymbols?: string[]
  connections: PathConnection[]
  start: PathState | null
  goal: PathState | null
  /** Additional valid finishes, such as any of Alice’s surface exits. */
  alternateGoals?: PathState[]
  allowedRule: InfiniteRule
  /** Source fixtures are optional examples, never an automatically revealed proof. */
  providedInput?: string
  claims: ProofClaim[]
  draftClaim?: ProofClaim
  review: 'wip' | 'reviewed'
  notes: string[]
}

export interface ArtworkTrace {
  id: string
  path: string
  color: string
  points: [number, number][]
  /** Arrowed strokes can only be followed in point order. */
  directed?: boolean
  /** Original SVG curves and transforms stay exact until edited. */
  svg?: { d: string; matrix: number[] }
}
export interface CopyFrame {
  id: string
  x: number
  y: number
  width: number
  height: number
}
export interface MazeArtwork {
  /** Empty for an authored corridor layout with no source image. */
  asset: string
  /** Cell width for orthogonal block geometry; omitted on source drawings. */
  blockSize?: number
  width: number
  height: number
  bounds: [number, number, number, number]
  traces: ArtworkTrace[]
  frames: CopyFrame[]
  /** Coordinates on each side of a gate, in the local artwork of that level. */
  gates?: {
    edge: string
    from: [number, number]
    to: [number, number]
    /** An exit arrow continues from the child boundary through the parent drawing. */
    arrivalFrom?: [number, number]
  }[]
  start?: [number, number]
  goal?: [number, number]
  finishes?: { state: PathState; point: [number, number] }[]
  /** Room substitutions can show the source template for the current path. */
  views?: { paths: string[]; bounds: [number, number, number, number] }[]
}
