import type { Metadata } from 'next'
import { Fraunces, Outfit } from 'next/font/google'
import { Providers } from '@/components/Providers'
import { readSession } from '@/lib/session'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
})

export const metadata: Metadata = {
  title: 'StudyGotchi',
  description: 'A living knowledge world for the courses you study.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await readSession()

  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('studygotchi.theme')==='night')document.documentElement.classList.add('night')}catch(e){}",
          }}
        />
      </head>
      <body>
        <Providers initialUser={user}>{children}</Providers>
      </body>
    </html>
  )
}
