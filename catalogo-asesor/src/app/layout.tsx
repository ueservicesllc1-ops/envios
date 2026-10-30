import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "../context/ThemeContext";

export const metadata: Metadata = {
  title: "Falconi Perfumes | Catálogo de Asesores",
  description: "Catálogo digital inteligente de perfumes, dupes, pirámide olfativa y control de inventario en tiempo real para asesores de venta.",
  manifest: "/catalogoasesor/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Falconi Asesor",
  },
  icons: {
    icon: [
      { url: "/catalogoasesor/icons/icon.svg", type: "image/svg+xml" },
      { url: "/catalogoasesor/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/catalogoasesor/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/catalogoasesor/icons/icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/catalogoasesor/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0b0f19",
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Falconi Asesor" />
        <link rel="apple-touch-icon" href="/catalogoasesor/icons/icon-180.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/catalogoasesor/icons/icon-180.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/catalogoasesor/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/catalogoasesor/icons/icon-512.png" />
        <link rel="manifest" href="/catalogoasesor/manifest.json" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/catalogoasesor/sw.js', { scope: '/catalogoasesor/' })
                    .then(function(reg) { console.log('Falconi PWA SW registrado:', reg.scope); })
                    .catch(function(err) { console.warn('Falconi PWA SW error:', err); });
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-['Plus_Jakarta_Sans',sans-serif] bg-slate-50 text-slate-900 dark:bg-[#080c14] dark:text-slate-100 selection:bg-amber-500 selection:text-black">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
