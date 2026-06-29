import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "БензОК — наличие топлива на АЗС",
  description: "Актуальная информация о наличии топлива на заправках рядом с вами",
  icons: {
    icon: "/benzok-logo.png",
    apple: "/benzok-logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "БензОК",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ background: "#0a0a0a" }}
    >
      <head>
        {/* Устанавливаем фон до первого рендера — предотвращает белые зазоры */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('theme') || 'dark';
            var bg = t === 'dark' ? '#0a0a0a' : '#ffffff';
            document.documentElement.style.background = bg;
          } catch(e) {}
        `}} />
      </head>
      <body className="min-h-full flex flex-col" style={{ background: "#0a0a0a" }}>{children}</body>
    </html>
  );
}
