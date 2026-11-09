import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { jsonLd } from "@/lib/json-ld";

// Self-hosted via next/font — eliminates external font requests (zero CLS)
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Everest Smart Traders",
  title: {
    default: "Everest Smart Traders — Smart Security & Automation Nepal",
    template: "%s | Everest Smart Traders",
  },
  description:
    "Nepal's trusted supplier and installer of gate automation, smart door locks, hotel lock systems, rolling shutter motors, curtain motors, and video door phone systems. Serving hotels, homes, offices, and commercial properties.",
  keywords: [
    "gate automation Nepal",
    "smart door lock Nepal",
    "hotel lock system Kathmandu",
    "rolling shutter motor Nepal",
    "sliding gate opener Nepal",
    "swing gate opener Nepal",
    "curtain motor Nepal",
    "video door phone Nepal",
    "access control Nepal",
    "smart security Nepal",
    "Everest Smart Traders",
  ],
  authors: [{ name: "Everest Smart Traders" }],
  creator: "Everest Smart Traders",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_NP",
    siteName: "Everest Smart Traders",
    title: "Everest Smart Traders — Smart Security & Automation Nepal",
    description:
      "Nepal's trusted supplier and installer of gate automation, smart door locks, hotel lock systems, and automation solutions.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Everest Smart Traders — Smart Security & Automation Nepal",
    description:
      "Nepal's trusted supplier and installer of gate automation, smart door locks, hotel lock systems, and automation solutions.",
    site: "@everestsmart",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Font variable classNames on <html> (not body) per shadcn/next-font best practice
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: SITE_NAME,
              url: SITE_URL,
              telephone: "+977-9860819528",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Kathmandu",
                addressCountry: "NP",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
