import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Solar Intelligence Operating System";
const description =
  "A research-grade environment for explaining, simulating, validating and optimising full-year photovoltaic electricity generation.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = forwardedHost || requestHeaders.get("host")?.trim() || "localhost:3000";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const requestProtocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : requestHost.startsWith("localhost") || requestHost.startsWith("127.0.0.1")
      ? "http"
      : "https";
  let origin = "http://localhost:3000";
  try {
    const candidate = new URL(`${requestProtocol}://${requestHost}`);
    if (candidate.protocol === "http:" || candidate.protocol === "https:") origin = candidate.origin;
  } catch { /* retain the safe local metadata fallback */ }
  const metadataBase = new URL(origin);
  const socialImage = new URL("/og.png", metadataBase).toString();

  return {
    metadataBase,
    title: {
      default: title,
      template: "%s · Solar Intelligence OS",
    },
    description,
    applicationName: title,
    manifest: "/site.webmanifest",
    keywords: [
      "solar energy",
      "photovoltaic forecasting",
      "representative year",
      "energy simulation",
      "solar digital twin",
    ],
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      type: "website",
      locale: "en_GB",
      url: origin,
      siteName: title,
      title,
      description,
      images: [{ url: socialImage, width: 1200, height: 630, alt: "Solar Intelligence Operating System annual energy observatory" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#03070a" },
    { media: "(prefers-color-scheme: light)", color: "#e8eee9" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
