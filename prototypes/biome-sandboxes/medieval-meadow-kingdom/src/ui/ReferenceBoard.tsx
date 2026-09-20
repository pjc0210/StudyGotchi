const ROOT = '/@fs/Users/philote/projects-local/StudyGotchi/docs/design/world/refs/biome-library/medieval-meadow-kingdom'

const REFERENCES = [
  {
    file: '01-medieval-forest-village.jpg',
    title: 'Irregular timber hamlets',
    take: 'Unequal roofs · civic clearings · garden edges',
    fallback: 'https://i.pinimg.com/736x/00/51/e3/0051e33edcfb5f44a00499e4d77c13d2.jpg',
  },
  {
    file: '02-castle-courtyard-ferris-wheel.jpg',
    title: 'Open castle court',
    take: 'Axial gate · hedge rooms · limestone contrast',
    fallback: 'https://i.pinimg.com/736x/26/49/49/264949b6ec9b0fd16f5df80ed6fab8cd.jpg',
  },
  {
    file: '03-cartoon-land-and-trees.jpg',
    title: 'Icon-scale silhouette',
    take: 'Chunky turf edge · unequal grouped crowns only',
    fallback: 'https://i.pinimg.com/736x/ff/f3/75/fff375cf19071932212c1a9d375cfbbd.jpg',
  },
  {
    file: '04-castle-landform.jpg',
    title: 'Castle fused to headland',
    take: 'Deep gate · stepped masonry · broken side walls',
    fallback: 'https://i.pinimg.com/736x/7f/d6/0b/7fd60b68ec4553959ca4ad9ca422107a.jpg',
  },
  {
    file: '05-meadow-river-village.jpg',
    title: 'Meadow negative space',
    take: 'Broad river pause · one crossing · separated homes',
    fallback: 'https://i.pinimg.com/736x/ed/ee/fd/edeefde0fad5f2ec7fef2ce00e405218.jpg',
  },
  {
    file: '06-low-poly-medieval-village.jpg',
    title: 'Working river language',
    take: 'Mill wheel · dock fragments · faceted water',
    fallback: 'https://i.pinimg.com/736x/8f/75/be/8f75be1858aba9f631844170bfa37404.jpg',
  },
  {
    file: '07-castle-water-trees.jpg',
    title: 'Asymmetric landmark',
    take: 'Castle held to one side · sparse meadow outliers',
    fallback: 'https://i.pinimg.com/736x/f2/95/ff/f295fffcc3a3691331b5a702de8fb2fe.jpg',
  },
] as const

export function ReferenceBoard({ onClose }: { onClose: () => void }) {
  return (
    <section className="reference-board" aria-label="Actual reference comparison board">
      <header>
        <div>
          <span className="lab-kicker">Actual folder references · Green Crown Commons</span>
          <h2>Reference → authored world comparison</h2>
          <p>Motifs are cross-woven across districts; no source is copied one-to-one.</p>
        </div>
        <button type="button" onClick={onClose}>Close board</button>
      </header>
      <div className="reference-grid">
        {REFERENCES.map((reference, index) => (
          <figure key={reference.file}>
            <img
              src={`${ROOT}/${reference.file}`}
              alt={reference.title}
              onError={(event) => {
                if (event.currentTarget.src !== reference.fallback) event.currentTarget.src = reference.fallback
              }}
            />
            <figcaption>
              <span>0{index + 1} · {reference.file}</span>
              <strong>{reference.title}</strong>
              <small>{reference.take}</small>
            </figcaption>
          </figure>
        ))}
        <article className="reference-result">
          <span className="lab-kicker">Synthesis result</span>
          <strong>Green Crown Commons</strong>
          <p>Five separated working grounds, a cool river spine, 39% open meadow/water, and one castle headland below the northern crown.</p>
        </article>
      </div>
    </section>
  )
}
