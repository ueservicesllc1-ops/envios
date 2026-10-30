import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Falconi POS | Punto de Venta Táctil",
  description: "Terminal inteligente de Punto de Venta para iPad Pro y tablets con escaneo rápido, caja y facturación.",
  manifest: "/puntodeventa/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Falconi POS",
  },
  icons: {
    icon: [
      { url: "/puntodeventa/icons/icon.svg", type: "image/svg+xml" },
      { url: "/puntodeventa/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/puntodeventa/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/puntodeventa/icons/icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/puntodeventa/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#050a14",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full antialiased dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Falconi POS" />
        <link rel="apple-touch-icon" href="/puntodeventa/icons/icon-180.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/puntodeventa/icons/icon-180.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/puntodeventa/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/puntodeventa/icons/icon-512.png" />
        <link rel="manifest" href="/puntodeventa/manifest.json" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/puntodeventa/sw.js', { scope: '/puntodeventa/' })
                    .then(function(reg) { console.log('Falconi POS SW registrado:', reg.scope); })
                    .catch(function(err) { console.warn('Falconi POS SW error:', err); });
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-['Plus_Jakarta_Sans',sans-serif] bg-[#070b12] text-slate-100 selection:bg-emerald-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
