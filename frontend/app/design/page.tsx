import { DesignShell } from './DesignShell'
import { isChromeScreen, type ChromeScreen } from './chrome-spec'

/**
 * Offside preview of Direction A, "Paper & Pixel", on the real site.
 * /design (landing), /design?screen=world, /design?screen=visit
 */
export default async function DesignPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const raw = (await searchParams).screen
  const screen: ChromeScreen = isChromeScreen(raw) ? raw : 'landing'
  return <DesignShell key={screen} screen={screen} />
}
