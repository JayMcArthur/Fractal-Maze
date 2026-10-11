import { useMemo } from 'react'
import { RepeatedRenderer } from '../../core/render/svg/RepeatedRenderer'
import { indexRepeatedRoute } from '../../core/replay/repeatedReplay'
import type { RepeatedRoute } from '../../core/replay/repeatedReplay'
import type { RepeatedDirectedDefinition } from '../../core/model/repeatedDirected'

export function RepeatedReplay({
  def,
  route,
  step,
}: {
  def: RepeatedDirectedDefinition
  route: RepeatedRoute
  step: number
}) {
  const index = useMemo(() => indexRepeatedRoute(route), [route])
  const begin = Math.max(0, step - 255)
  const trail = Array.from({ length: step - begin + 1 }, (_, offset) =>
    index.stateAt(begin + offset)
  )
  return <RepeatedRenderer def={def} current={index.stateAt(step)} trail={trail} />
}
