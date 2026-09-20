import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, Zen_Maru_Gothic } from "next/font/google";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import { IdentityProvider } from "@/components/IdentityProvider";
import { AudioProvider } from "@/components/audio/AudioProvider";
import { SpaceThemeBootScript } from "@/components/theme/SpaceThemeBootScript";
import { StudyGotchiProvider } from "@/lib/store";
import "./globals.css";
import "./product.css";

/* Paper & Pixel type: a rounded display face, a humanist UI face, and a pixel mono
   that is crisp at multiples of 11px (Departure Mono, SIL OFL, Helena Zhang). */
const display = Zen_Maru_Gothic({
  weight: ["500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});
const ui = Instrument_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ui",
});
const pixel = localFont({
  src: "./design/fonts/DepartureMono-Regular.woff2",
  weight: "400",
  display: "swap",
  variable: "--font-pixel",
});
/* The /design lab's editorial type treatment still reads this variable. */
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: "StudyGotchi",
  description:
    "Drop in the lecture notes and problem sets you already have. Each course becomes a small world, and every landmark can name the page it came from.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${ui.variable} ${pixel.variable} ${fraunces.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <SpaceThemeBootScript />
      </head>
      <body className="min-h-full">
        <ClerkProvider>
          <IdentityProvider>
            <StudyGotchiProvider>
              <AudioProvider>{children}</AudioProvider>
            </StudyGotchiProvider>
          </IdentityProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
