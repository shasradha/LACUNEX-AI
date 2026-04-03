import { Inter, Space_Grotesk } from "next/font/google";

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
};

export const metadata = {
  title: {
    default: "LACUNEX AI",
    template: "%s | LACUNEX AI",
  },
  description:
    "LACUNEX AI — An AI that fills the gaps humans can't reach. Secure chat, deep reasoning, and image workflows.",
  applicationName: "LACUNEX AI",
  icons: {
    icon: "/doge-dog.svg",
    shortcut: "/doge-dog.svg",
    apple: "/doge-dog.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable}`}>
        {children}
      </body>
    </html>
  );
}
