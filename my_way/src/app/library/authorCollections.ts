export function authorCollections<Entry>(entries: Entry[], author: (entry: Entry) => string) {
  const groups = new Map<string, Entry[]>()
  for (const entry of entries) {
    const name = author(entry) || 'Unknown constructor'
    const group = groups.get(name) ?? []
    group.push(entry)
    groups.set(name, group)
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([author, entries]) => ({ author, entries }))
}
