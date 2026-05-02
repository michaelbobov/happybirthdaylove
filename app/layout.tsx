import type { Metadata } from "next";
import {
  Caveat,
  Homemade_Apple,
  Lora,
  Sora,
  Inter,
  Playfair_Display,
  Cormorant_Garamond,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/layout/NavBar";

const caveat = Caveat({ subsets: ["latin"], variable: "--font-display-warm", display: "swap" });
const homemade = Homemade_Apple({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-hand-warm",
  display: "swap",
});
const lora = Lora({ subsets: ["latin"], variable: "--font-body-warm", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-display-playful", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-body-playful", display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display-cinematic",
  display: "swap",
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body-cinematic",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display-minimal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Enveloped — time-locked letters & gifts for the moments that matter",
  description:
    "Build a bundle of beautiful, time-locked envelopes for someone you love. Letters, photos, GIFs, gift cards — each revealed when the moment is right.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontVars = [
    caveat.variable,
    homemade.variable,
    lora.variable,
    sora.variable,
    inter.variable,
    playfair.variable,
    cormorant.variable,
    spaceGrotesk.variable,
  ].join(" ");

  return (
    <html lang="en" className={`${fontVars} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
