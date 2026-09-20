import type { Metadata } from 'next'
import { Instrument_Sans, Zen_Maru_Gothic } from 'next/font/google'
import localFont from 'next/font/local'
import './design.css'

const display = Zen_Maru_Gothic({
  weight: ['500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
})

const ui = Instrument_Sans({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ui',
})

/* Departure Mono, SIL OFL, Helena Zhang. Pixel-perfect at multiples of 11px. */
const pixel = localFont({
  src: './fonts/DepartureMono-Regular.woff2',
  weight: '400',
  display: 'swap',
  variable: '--font-pixel',
})

export const metadata: Metadata = {
  title: 'StudyGotchi · Paper & Pixel',
  description: 'Turn in a problem set. Someone moves in.',
}

export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${display.variable} ${ui.variable} ${pixel.variable}`}>{children}</div>
}
