import { emptyPathModel, pathDocument } from './pathDocument'
import { connectionsFromPairs } from '../../core/pathMaze/traversal'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'

/** Small drawings make each rule inspectable without supplying a completed proof. */
export function proofExamples(): RecursiveMazeDocument[] {
  return [
    {
      id: 'simple-infinite-hop',
      title: 'Simple infinite hop',
      copies: ['A'],
      count: 2,
      pairs: [
        ['1-1', '/A'],
        ['2-2', '/A'],
      ],
      asset: 'simple-infinite.svg',
      height: 300,
    },
    {
      id: 'simple-nested-infinite-hop',
      title: 'Simple nested infinite hop',
      copies: ['A', 'B'],
      count: 3,
      pairs: [
        ['1-1', '/A'],
        ['2-2', '/A'],
        ['2-1', '/B'],
        ['3-3', '/B'],
      ],
      asset: 'simple-nested-infinite.svg',
      height: 340,
    },
  ].map((example) => {
    const doc = pathDocument(
      example.id,
      example.title,
      {
        ...emptyPathModel(),
        type: 'infiniteRule',
        allowedRule: 'infiniteHop',
        copies: example.copies,
        paths: Array.from({ length: example.count }, (_, i) => ({
          id: String(i + 1),
          label: String(i + 1),
          color: ['#478cb6', '#bc6546', '#916abd'][i],
          helper: false,
        })),
        connections: connectionsFromPairs(
          example.pairs,
          'Small example of Siggy’s infinite-hop rule'
        ),
        start: { path: '1', address: [] },
        goal: { path: String(example.count), address: [] },
        notes: [
          'Build both witnesses yourself. Repetition does not create a finite path.',
          'Drawing is schematic. Connection labels define the example; the imported maze artworks retain their original layouts.',
        ],
      },
      {
        asset: 'references/generated/' + example.asset,
        width: 400,
        height: example.height,
        bounds: [0, 0, 400, example.height],
        frames: [],
        traces: [],
      }
    )
    doc.metadata.author = 'Rule examples after Siggy'
    doc.metadata.source =
      'https://freethoughtblogs.com/atrivialknot/2023/10/21/infinite-fractal-mazes/'
    return doc
  })
}
