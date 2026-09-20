import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthApiBridge } from "@/components/AuthApiBridge";
import { StudyGotchiProvider } from "@/lib/store";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: "StudyGotchi",
  description: "A living knowledge world for the courses you study.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full`}>
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
