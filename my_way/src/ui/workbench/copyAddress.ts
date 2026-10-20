export function parseCopyWord(value: string, copies: string[]): string[] {
  if (!value.trim()) return []
  return copies.every((copy) => copy.length === 1)
    ? value.replace(/\s/g, '').split('')
    : value.trim().split(/\s+/)
}
