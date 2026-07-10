import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Background Remover",
  description:
    "Remove image backgrounds online instantly. Free, fast, and privacy-first.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://unpkg.com" />
        <script
          src="https://unpkg.com/lucide@latest"
          async
        />
      </head>
      <body className="bg-bg-main text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
