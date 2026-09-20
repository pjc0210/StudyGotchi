import { writeFile } from 'node:fs/promises'

const port = Number(process.env.CDP_PORT ?? 9223)
const base = 'http://localhost:5193/'
const allFixtures = [
  ['overview-000.png', '?p=0&station=overview&seed=7&az=0&clouds=0'],
  ['overview-100.png', '?p=100&station=overview&seed=7&az=0&clouds=0'],
  ['arrival-100.png', '?p=100&station=arrival&seed=7&clouds=0'],
  ['district-cliff-village-100.png', '?p=100&station=district&district=cliff-village&seed=7&clouds=0'],
  ['district-archaeology-ridge-100.png', '?p=100&station=district&district=archaeology-ridge&seed=7&clouds=0'],
  ['district-dry-terraces-100.png', '?p=100&station=district&district=dry-terraces&seed=7&clouds=0'],
  ['district-drowned-forum-100.png', '?p=100&station=district&district=drowned-forum&seed=7&clouds=0'],
  ['district-working-quay-100.png', '?p=100&station=district&district=working-quay&seed=7&clouds=0'],
  ['landmark-s1.png', '?p=0&station=landmark&seed=7&clouds=0'],
  ['landmark-s2.png', '?p=50&station=landmark&seed=7&clouds=0'],
  ['landmark-s3.png', '?p=100&station=landmark&seed=7&clouds=0'],
  ['landmark-s3-night.png', '?p=100&station=landmark&seed=7&night=1&clouds=0'],
  ['yaw-m35-dolly-100.png', '?p=100&station=overview&seed=7&az=-35&dolly=1&clouds=0'],
  ['yaw-000-dolly-100.png', '?p=100&station=overview&seed=7&az=0&dolly=1&clouds=0'],
  ['yaw-p35-dolly-100.png', '?p=100&station=overview&seed=7&az=35&dolly=1&clouds=0'],
  ['yaw-m35-dolly-155.png', '?p=100&station=overview&seed=7&az=-35&dolly=1.55&clouds=0'],
  ['yaw-000-dolly-155.png', '?p=100&station=overview&seed=7&az=0&dolly=1.55&clouds=0'],
  ['yaw-p35-dolly-155.png', '?p=100&station=overview&seed=7&az=35&dolly=1.55&clouds=0'],
  ['seed-001.png', '?p=100&station=overview&seed=1&az=0&clouds=0'],
  ['seed-007.png', '?p=100&station=overview&seed=7&az=0&clouds=0'],
  ['seed-099.png', '?p=100&station=overview&seed=99&az=0&clouds=0'],
  ['catastrophe-archaeology.png', '?p=100&station=district&district=archaeology-ridge&seed=7&cat=archaeology-ridge&clouds=0'],
  ['ambient-boat.png', '?p=100&station=overview&seed=7&az=0&boat=1&clouds=0'],
  ['globe-marker-s3-night.png', '?p=100&station=overview&seed=7&marker=1&night=1&clouds=0'],
  ['reference-comparison.png', '?p=100&station=overview&seed=7&az=0&clouds=0&reference=1'],
]
const requested = new Set((process.env.CAPTURE_NAMES ?? '').split(',').filter(Boolean))
const fixtures = requested.size ? allFixtures.filter(([filename]) => requested.has(filename)) : allFixtures

async function target() {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json())
      const page = targets.find((item) => item.type === 'page')
      if (page) return page
    } catch {
      // Chrome may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`No CDP page target on port ${port}`)
}

const page = await target()
const socket = new WebSocket(page.webSocketDebuggerUrl)
const pending = new Map()
let nextId = 1

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (!message.id) return
  const callback = pending.get(message.id)
  if (!callback) return
  pending.delete(message.id)
  if (message.error) callback.reject(new Error(message.error.message))
  else callback.resolve(message.result)
})

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
})

// Warm the WebGL renderer and terrain geometry before the first acceptance capture.
await send('Page.navigate', { url: `${base}?p=100&station=overview&seed=7&az=0&clouds=0` })
await new Promise((resolve) => setTimeout(resolve, 3000))

for (const [filename, query] of fixtures) {
  await send('Page.navigate', { url: `${base}${query}` })
  await new Promise((resolve) => setTimeout(resolve, 2300))
  const result = await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
  await writeFile(new URL(`../screenshots/${filename}`, import.meta.url), Buffer.from(result.data, 'base64'))
  process.stdout.write(`captured ${filename}\n`)
}

socket.close()
