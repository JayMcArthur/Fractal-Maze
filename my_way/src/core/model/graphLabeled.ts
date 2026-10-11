// Borrowing: koteitan repeated-maze terminal/port canonicalization, one-way terminal semantics

export interface Portal {
  id: string
  label: string
  isOneWay: boolean // borrowed from koteitan repeated-maze
  connectsTo: string[] // portal IDs at same or deeper level
}

export interface SubmazeNode {
  id: string
  label: string
  portals: Portal[]
  children: SubmazeNode[] // nested submazes
}

export interface GraphLabeledDefinition {
  type: 'graphLabeled'
  root: SubmazeNode
  entryPortal: string
  exitPortal: string
}
