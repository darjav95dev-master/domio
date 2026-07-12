import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Geist_Mono, Instrument_Serif } from "next/font/google";
import { RootErrorBoundary } from "@/shared/components/root-error-boundary";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  weight: "variable",
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// Instrument Serif — used only on the property detail sections, matching the
// CoviCanarias reference (lighter, editorial serif). Hero and rest of the site
// stay on Fraunces.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Domio",
  description: "Plataforma de comercialización inmobiliaria",
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${inter.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
      style={{ colorScheme: "light" }}
    >
      <body className="min-h-screen antialiased">
        <RootErrorBoundary>
          {children}
        </RootErrorBoundary>
      </body>
    </html>
  );
}
