import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VpMobil26",
  description: "Vertretungsplan mit Push-Benachrichtigungen",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "VpMobil26", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4f46e5" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

// Setzt den Dark-Mode vor dem ersten Paint anhand von vp:settings oder System-Einstellung
const themeScript = `try{var r=localStorage.getItem('vp:settings');var s=r?JSON.parse(r):null;var id=s&&s.activeThemeId?s.activeThemeId:'system';var sys=matchMedia('(prefers-color-scheme: dark)').matches;var d=id==='dark'||id==='ocean'||(id==='system'&&sys);document.documentElement.classList.toggle('dark',d)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
