import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "../context/ThemeContext";

export const metadata: Metadata = {
  title: "Falconi Perfumes | Catálogo de Asesores",
  description: "Catálogo digital inteligente de perfumes, dupes, pirámide olfativa y control de inventario en tiempo real para asesores de venta.",
  manifest: "/catalogoasesor/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Falconi Asesor",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f8fafc",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" />
      </head>
      <body className="min-h-full flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
