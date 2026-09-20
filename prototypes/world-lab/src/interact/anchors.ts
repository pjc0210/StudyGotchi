/**
 * DOM nodes that follow a world position. The projector inside the canvas hands this
 * registry a screen point per frame; the registry writes the DOM. React never re-renders
 * for pointer motion.
 */
export type AnchorKind = 'point' | 'callout'

export interface AnchorNode {
  el: HTMLElement
  kind: AnchorKind
}

const EDGE = 16
/** the leader rises diagonally from the object by this much before it runs level under the label */
const RISE_X = 44
const RISE_Y = 56

export class AnchorRegistry {
  nodes = new Map<string, AnchorNode>()

  attach(id: string, kind: AnchorKind) {
    return (el: HTMLElement | null) => {
      if (el) this.nodes.set(id, { el, kind })
      else this.nodes.delete(id)
    }
  }

  /** Places one node at canvas pixel (x, y); callouts also get their leader and parked label. */
  place(id: string, x: number, y: number, behind: boolean, width: number, height: number) {
    const node = this.nodes.get(id)
    if (!node) return
    node.el.style.visibility = behind ? 'hidden' : 'visible'

    if (node.kind === 'point') {
      node.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      return
    }

    const rise = node.el.querySelector<SVGLineElement>('line[data-seg="rise"]')
    const run = node.el.querySelector<SVGLineElement>('line[data-seg="run"]')
    const dot = node.el.querySelector('rect')
    const label = node.el.querySelector<HTMLElement>('[data-callout-label]')
    if (!rise || !run || !dot || !label) return

    const lw = label.offsetWidth
    const lh = label.offsetHeight

    // The card floats diagonally beside the object, toward the side with more room, and the
    // leader is an elbow: a 45 degree rise from the object, then a level run that becomes the
    // card's baseline. If the card would leave the frame it flips side, then drops below.
    let dir = x < width / 2 ? 1 : -1
    let ex = x + dir * RISE_X
    if (dir === 1 && ex + lw > width - EDGE) dir = -1
    if (dir === -1 && x - RISE_X - lw < EDGE) dir = 1
    ex = x + dir * RISE_X

    let ey = y - RISE_Y
    let above = true
    if (ey - lh < EDGE) {
      // no room above: hang the card below, and push it further out so it clears the object
      above = false
      ey = y + RISE_Y
      ex = x + dir * (RISE_X + 88)
      if (dir === 1 && ex + lw > width - EDGE) ex = width - EDGE - lw
      if (dir === -1 && ex - lw < EDGE) ex = EDGE + lw
    }
    ey = Math.min(Math.max(ey, EDGE + (above ? lh : 0)), height - EDGE - (above ? 0 : lh))

    const left = dir === 1 ? ex : ex - lw
    const top = above ? ey - lh : ey
    label.style.left = `${left.toFixed(1)}px`
    label.style.top = `${top.toFixed(1)}px`
    label.style.right = 'auto'
    label.dataset.side = dir === 1 ? 'right' : 'left'
    label.dataset.above = above ? 'true' : 'false'

    dot.setAttribute('x', (x - 2).toFixed(1))
    dot.setAttribute('y', (y - 2).toFixed(1))
    rise.setAttribute('x1', x.toFixed(1))
    rise.setAttribute('y1', y.toFixed(1))
    rise.setAttribute('x2', ex.toFixed(1))
    rise.setAttribute('y2', ey.toFixed(1))
    run.setAttribute('x1', ex.toFixed(1))
    run.setAttribute('y1', ey.toFixed(1))
    run.setAttribute('x2', (ex + dir * lw).toFixed(1))
    run.setAttribute('y2', ey.toFixed(1))
  }
}
