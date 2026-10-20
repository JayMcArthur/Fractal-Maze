import { expect, it } from 'vitest'
import { pathDocs } from '../app/library/pathCatalog'
import { createBlockArtwork } from '../core/play/blockArtwork'
import { walkSource } from '../core/play/sourceWalking'
import { availableMoves } from '../core/pathMaze/traversal'
import { initialPathSession, walkPathSession, pathCrossing, crossPathSession, pathSessionFinished, sessionPathRoute, undoPathSession } from '../core/play/pathSession'
import { buildNativeReplay } from '../core/replay/nativeReplay'
import { importReplay } from '../core/replay/importReplay'

it('bound block mazes keep mixed walks and crossings legal through undo and immutable replay import', () => {
  let reviewed = 0
  for (const doc of pathDocs) {
    const model = doc.definition
    if ((model.type !== 'pathPushdown' && model.type !== 'infiniteRule') || !model.start || !doc.artwork?.gates?.length) continue
    const original = structuredClone(doc)
    const artwork = createBlockArtwork(doc.artwork, model)
    let session = initialPathSession(model, artwork)
    for (let turn = 0; turn < 6; turn++) {
      const current = session.positions.at(-1)!
      if (pathSessionFinished(model, artwork, current)) break
      const gates = availableMoves(model, current.state)
      const stops = gates.flatMap(({ edge }) => artwork.gates?.filter(gate => gate.edge === edge.id).map(gate => gate.from) ?? [])
      const walk = ([1, 2, 4, 8] as const).map(direction => walkSource(artwork, current.state.path, current.point!, direction, stops)).find(Boolean)
      if (walk) session = walkPathSession(session, walk)
      const crossing = gates.filter(({ edge }) => pathCrossing(model, artwork, session.positions.at(-1)!, edge.id))
      if (crossing.length) session = crossPathSession(session, model, artwork, crossing[turn % crossing.length].edge.id)
    }
    if (session.moves.length) expect(undoPathSession(session).positions.at(-1)).toEqual(session.positions.at(-2))
    const replay = buildNativeReplay(doc, { type: model.type, ...sessionPathRoute(session), physical: session }, 'human', false)
    replay.playArtwork = artwork
    expect(() => importReplay(JSON.stringify(replay)), doc.metadata.id).not.toThrow()
    expect(doc).toEqual(original)
    reviewed++
  }
  expect(reviewed).toBeGreaterThan(20)
})
