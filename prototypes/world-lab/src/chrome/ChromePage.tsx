import { useState } from 'react'
import type { GoldenView } from '../golden/golden-spec'
import {
  ACCENTS,
  DIRECTIONS,
  PALETTES,
  SCREENS,
  readChromeParams,
  writeChromeParams,
  type ChromeDirection,
  type ChromeParams,
} from './chrome-spec'
import { DirectionA } from './directions/a/DirectionA'
import { DirectionB } from './directions/b/DirectionB'
import { DirectionC } from './directions/c/DirectionC'
import './chrome.css'
import './palettes.css'

interface ChromePageProps {
  onBack: () => void
}

/**
 * Site chrome gallery. Same world, same copy, same state; only the direction changes.
 * Deep link: ?mode=chrome&dir=a|b|c&screen=landing|world|visit&palette=cream|sand|snow|lilac|mint|dusk&accent=coral|mint|light|olive|ice
 */
export function ChromePage({ onBack }: ChromePageProps) {
  const [params, setParams] = useState<ChromeParams>(readChromeParams)
  const [progress, setProgress] = useState(0.5)
  const [view, setView] = useState<GoldenView>('overview')
  const [hidden, setHidden] = useState(false)

  const go = (patch: Partial<ChromeParams>) => {
    const next = { ...params, ...patch }
    setParams(next)
    if (patch.dir || patch.screen) setView('overview')
    writeChromeParams(next)
  }

  const { dir, screen, palette, accent } = params
  const props = { screen, progress, setProgress, view, setView }
  const Direction = dir === 'a' ? DirectionA : dir === 'b' ? DirectionB : DirectionC

  return (
    <div className="chrome-root" data-dir={dir} data-screen={screen} data-palette={palette} data-accent={accent}>
      <Direction key={`${dir}-${screen}`} {...props} />

      {!hidden && (
        <nav className="chrome-switch" aria-label="Gallery controls">
          <button type="button" onClick={onBack}>
            lab
          </button>
          <span className="chrome-switch-sep" />
          {(Object.keys(DIRECTIONS) as ChromeDirection[]).map((d) => (
            <button key={d} type="button" aria-pressed={d === dir} onClick={() => go({ dir: d })} title={DIRECTIONS[d].name}>
              {d.toUpperCase()}
            </button>
          ))}
          <span className="chrome-switch-sep" />
          {SCREENS.map((s) => (
            <button key={s} type="button" aria-pressed={s === screen} onClick={() => go({ screen: s })}>
              {s}
            </button>
          ))}
          <span className="chrome-switch-sep" />
          <select aria-label="Palette" value={palette} onChange={(e) => go({ palette: e.target.value as ChromeParams['palette'] })}>
            {PALETTES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select aria-label="Accent" value={accent} onChange={(e) => go({ accent: e.target.value as ChromeParams['accent'] })}>
            {ACCENTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <span className="chrome-switch-sep" />
          <button type="button" onClick={() => setHidden(true)} title="Hide gallery controls">
            hide
          </button>
        </nav>
      )}
      {hidden && (
        <button type="button" className="chrome-switch-show" onClick={() => setHidden(false)} aria-label="Show gallery controls">
          g
        </button>
      )}
    </div>
  )
}
