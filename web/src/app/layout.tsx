import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { AuthProvider } from "@/lib/auth";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: {
    default: "Scanno — remember what you liked",
    template: "%s · Scanno",
  },
  description:
    "Scan barcodes, rate products, and never buy the same disappointment twice. Public reviews from real shoppers.",
  applicationName: "Scanno",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Scanno",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#00b4ef",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AnalyticsProvider>
          <AuthProvider>
            <ServiceWorkerRegister />
            <Header />
            <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          </AuthProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
