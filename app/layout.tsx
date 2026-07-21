import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Intel_One_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: "variable",
  axes: ["wdth"],
  display: "swap",
});

const intelOneMono = Intel_One_Mono({
  variable: "--font-intel-one-mono",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
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
    { media: "(prefers-color-scheme: dark)", color: "#070907" },
    { media: "(prefers-color-scheme: light)", color: "#e7e3da" },
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
        className={`${instrumentSans.variable} ${intelOneMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
