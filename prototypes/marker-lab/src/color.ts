export const MIN_LIP_SIDE_DELTA_E = 12

type Lab = readonly [number, number, number]

const degrees = (radians: number) => (radians * 180) / Math.PI
const radians = (degreesValue: number) => (degreesValue * Math.PI) / 180

function hueDegrees(a: number, b: number) {
  if (a === 0 && b === 0) return 0
  const value = degrees(Math.atan2(b, a))
  return value >= 0 ? value : value + 360
}

export function hexToLab(hex: string): Lab {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new TypeError(`Expected a six-digit hex colour, received "${hex}"`)

  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
  const [r, g, b] = channels.map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))

  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047
  const y = (r * 0.2126729 + g * 0.7151522 + b * 0.072175) / 1
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883
  const pivot = (value: number) => (value > 216 / 24389 ? Math.cbrt(value) : (24389 / 27) * value / 116 + 16 / 116)
  const fx = pivot(x)
  const fy = pivot(y)
  const fz = pivot(z)

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

/** CIEDE2000 using the Sharma, Wu and Dalal reference equations. */
export function deltaE2000([l1, a1, b1]: Lab, [l2, a2, b2]: Lab): number {
  const c1 = Math.hypot(a1, b1)
  const c2 = Math.hypot(a2, b2)
  const cMean = (c1 + c2) / 2
  const cMean7 = cMean ** 7
  const g = 0.5 * (1 - Math.sqrt(cMean7 / (cMean7 + 25 ** 7)))
  const a1Prime = (1 + g) * a1
  const a2Prime = (1 + g) * a2
  const c1Prime = Math.hypot(a1Prime, b1)
  const c2Prime = Math.hypot(a2Prime, b2)
  const h1Prime = hueDegrees(a1Prime, b1)
  const h2Prime = hueDegrees(a2Prime, b2)

  const deltaLPrime = l2 - l1
  const deltaCPrime = c2Prime - c1Prime
  const hueDifference = h2Prime - h1Prime
  const deltaHPrimeDegrees =
    c1Prime * c2Prime === 0
      ? 0
      : Math.abs(hueDifference) <= 180
        ? hueDifference
        : hueDifference > 180
          ? hueDifference - 360
          : hueDifference + 360
  const deltaHPrime = 2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(radians(deltaHPrimeDegrees / 2))

  const lMeanPrime = (l1 + l2) / 2
  const cMeanPrime = (c1Prime + c2Prime) / 2
  const hueSum = h1Prime + h2Prime
  const hMeanPrime =
    c1Prime * c2Prime === 0
      ? hueSum
      : Math.abs(h1Prime - h2Prime) <= 180
        ? hueSum / 2
        : hueSum < 360
          ? (hueSum + 360) / 2
          : (hueSum - 360) / 2

  const t =
    1 -
    0.17 * Math.cos(radians(hMeanPrime - 30)) +
    0.24 * Math.cos(radians(2 * hMeanPrime)) +
    0.32 * Math.cos(radians(3 * hMeanPrime + 6)) -
    0.2 * Math.cos(radians(4 * hMeanPrime - 63))
  const deltaTheta = 30 * Math.exp(-(((hMeanPrime - 275) / 25) ** 2))
  const cMeanPrime7 = cMeanPrime ** 7
  const rC = 2 * Math.sqrt(cMeanPrime7 / (cMeanPrime7 + 25 ** 7))
  const lOffset = lMeanPrime - 50
  const sL = 1 + (0.015 * lOffset ** 2) / Math.sqrt(20 + lOffset ** 2)
  const sC = 1 + 0.045 * cMeanPrime
  const sH = 1 + 0.015 * cMeanPrime * t
  const rT = -Math.sin(radians(2 * deltaTheta)) * rC
  const lTerm = deltaLPrime / sL
  const cTerm = deltaCPrime / sC
  const hTerm = deltaHPrime / sH

  return Math.sqrt(lTerm ** 2 + cTerm ** 2 + hTerm ** 2 + rT * cTerm * hTerm)
}
