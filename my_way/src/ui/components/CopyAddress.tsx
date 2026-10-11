export function CopyAddress({ address }: { address: string[] }) {
  const groups: { copy: string; count: number }[] = []
  for (const copy of address) {
    const previous = groups.at(-1)
    if (previous?.copy === copy) previous.count++
    else groups.push({ copy, count: 1 })
  }
  const shown = groups
    .slice(-10)
    .map(({ copy, count }) => (count > 1 ? `${copy} × ${count}` : copy))
  return (
    <strong title={['Surface', ...address].join(' ← ')}>
      {[
        'Surface',
        ...(groups.length > 10 ? [`… ${groups.length - 10} groups`] : []),
        ...shown,
      ].join(' ← ')}
    </strong>
  )
}
