import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthApiBridge } from "@/components/AuthApiBridge";
import { StudyGotchiProvider } from "@/lib/store";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], weight: ["500", "700", "800"] });

export const metadata: Metadata = {
  title: "StudyGotchi",
  description: "Your course, as an island. Places are topics. Residents appear when your work meets the course.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ClerkProvider>
          <AuthApiBridge>
            <StudyGotchiProvider>{children}</StudyGotchiProvider>
          </AuthApiBridge>
        </ClerkProvider>
      </body>
    </html>
  );
}
