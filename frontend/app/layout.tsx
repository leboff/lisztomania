import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Lisztomania — Smart Packing Lists",
  description: "AI-powered packing list app for families and frequent travelers",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lisztomania",
  },
  icons: { apple: "/icon-192.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
