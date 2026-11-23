import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
// Interface fonts: Inter for Latin, Kantumruy Pro for Khmer.
import "@fontsource-variable/inter/wght.css";
import "@fontsource/kantumruy-pro/khmer-400.css";
import "@fontsource/kantumruy-pro/khmer-500.css";
import "@fontsource/kantumruy-pro/khmer-600.css";
import "@fontsource/kantumruy-pro/khmer-700.css";
import "./cv-fonts";
import { printCss, templateCss } from "@thaflow/template-engine";
import { AppProvider } from "@/lib/app-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThaFlow CV",
  description: "Build a professional CV in minutes, in English or Khmer. No account; your CV stays on your device.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
  referrer: "no-referrer",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

// Static hosting cannot set headers, so the policy ships in the document. connect-src stays open to
// https because the optional cloud AI endpoint is chosen by the user; nothing connects unless they enable it.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "worker-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https: http://localhost:* http://127.0.0.1:*",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === "production" && <meta httpEquiv="Content-Security-Policy" content={csp} />}
        <style dangerouslySetInnerHTML={{ __html: templateCss + printCss }} />
      </head>
      <body className="bg-paper font-sans text-ink antialiased">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
