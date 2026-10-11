export interface Annotation {
  id: string
  type: 'note' | 'highlight' | 'arrow'
  row: number
  col: number
  blockPath: string[]
  content?: string
  color?: string
}
