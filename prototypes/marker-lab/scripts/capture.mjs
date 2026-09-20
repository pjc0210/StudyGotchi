import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const baseUrl = process.env.MARKER_LAB_URL ?? 'http://127.0.0.1:5182'
const output = '/tmp/marker-shots'

async function readyPage(page, query) {
  await page.goto(`${baseUrl}/?${query}`, { waitUntil: 'networkidle' })
  await page.locator('html[data-render-ready="true"]').waitFor({ state: 'attached', timeout: 20_000 })
  await page.evaluate(() => document.fonts.ready)
}

async function assertReviewSizes(page) {
  const cells = await page.locator('[data-marker-cell]').evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect()
      return [Number(element.getAttribute('data-marker-cell')), box.width, box.height]
    }),
  )
  const expected = [
    [48, 48, 48],
    [96, 96, 96],
    [512, 512, 512],
  ]
  if (JSON.stringify(cells.sort((a, b) => a[0] - b[0])) !== JSON.stringify(expected)) {
    throw new Error(`Expected 48, 96 and 512 px marker cells, received ${JSON.stringify(cells)}`)
  }
}

await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
})

try {
  await readyPage(page, 'mode=review&marker=ice-town&props=4&creature=0&night=0')
  await assertReviewSizes(page)
  await page.locator('.bouquet-review-grid').screenshot({ path: `${output}/ice-bouquet-day.png` })
  await page.screenshot({ path: `${output}/ice-reference-composite.png`, fullPage: true })

  await readyPage(page, 'mode=review&marker=ice-town&props=4&creature=0&night=1')
  await assertReviewSizes(page)
  await page.locator('.bouquet-review-grid').screenshot({ path: `${output}/ice-bouquet-night.png` })

  await readyPage(page, 'mode=views&marker=ice-town&props=4&creature=0&night=0')
  await page.locator('.size-views').screenshot({ path: `${output}/ice-sizes-day.png` })
} finally {
  await browser.close()
}

console.log(`Captured Ice marker review to ${output}`)
