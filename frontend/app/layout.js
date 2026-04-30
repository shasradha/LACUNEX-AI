import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata = {
  title: {
    default: "LACUNEX AI - Multi-Provider AI Platform",
    template: "%s | LACUNEX AI",
  },
  description:
    "LACUNEX AI — A fault-tolerant multi-provider AI platform built by Shasradha Karmakar. Zero-cost AI deployment with 28 API keys.",
  applicationName: "LACUNEX AI",
  authors: [{ name: "Shasradha Karmakar", url: "https://shasradha.github.io/" }],
  creator: "Shasradha Karmakar",
  publisher: "Shasradha Karmakar",
  metadataBase: new URL("https://lacunex.vercel.app"),
  alternates: {
    canonical: "/",
  },
  verification: {
    google: "IBngqy4tFs6oNzCORQMJ2QXM7pcFP4qWebEUjVxB-Wk",
  },
  openGraph: {
    title: "LACUNEX AI - Multi-Provider AI Platform",
    description:
      "A fault-tolerant multi-provider AI platform built by Shasradha Karmakar. Zero-cost AI deployment with 28 API keys.",
    url: "https://lacunex.vercel.app",
    siteName: "LACUNEX AI",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/doge-dog.png",
        width: 512,
        height: 512,
        alt: "LACUNEX AI Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LACUNEX AI - Multi-Provider AI Platform",
    description:
      "A fault-tolerant multi-provider AI platform built by Shasradha Karmakar.",
    images: ["/doge-dog.png"],
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
    icon: "/doge-dog.svg",
    shortcut: "/doge-dog.svg",
    apple: "/doge-dog.svg",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "LACUNEX AI",
  image: "https://lacunex.vercel.app/doge-dog.png",
  logo: "https://lacunex.vercel.app/doge-dog.png",
  author: {
    "@type": "Person",
    name: "Shasradha Karmakar",
    url: "https://shasradha.github.io/",
    sameAs: "https://www.wikidata.org/wiki/Q139585406",
  },
  url: "https://lacunex.vercel.app",
  description:
    "A fault-tolerant multi-provider AI platform built by Shasradha Karmakar",
  applicationCategory: "AIApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="canonical" href="https://lacunex.vercel.app" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable}`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
