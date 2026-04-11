import type { Metadata } from "next";
import { Inter, Playfair_Display, Instrument_Serif, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Undercurrent — The Economy Beneath the Economy",
  description: "A real-time behavioral economic index surfacing how people actually experience the economy across 20 US metros. Powered by Google Trends, BLS, FRED, and Redfin data.",
  openGraph: {
    title: "Undercurrent — The Economy Beneath the Economy",
    description: "Real-time behavioral economic tracking for 20 US metros. See how people actually feel about the economy.",
    type: "website",
    siteName: "Undercurrent",
  },
  twitter: {
    card: "summary_large_image",
    title: "Undercurrent — The Economy Beneath the Economy",
    description: "Real-time behavioral economic tracking for 20 US metros.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${instrumentSerif.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
