import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lisztomania — Smart Packing Lists",
  description: "AI-powered packing list app for families and frequent travelers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased">{children}</body>
    </html>
  );
}
