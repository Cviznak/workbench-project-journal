import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://www.workbenchsoc.com'),
  title: {
    default: 'Workbench — The RPG Operating System for Makers & Creators',
    template: '%s | Workbench',
  },
  description:
    'The RPG Operating System for Makers, Engineers & Creators. Track builds, manage maker inventory, level up craft skills with deterministic RPG progression, and calculate lab formulas with precision.',
  keywords: [
    'maker inventory',
    'gamified project management',
    'RPG productivity',
    '3D print calculator',
    'resin calculator',
    'perfume formulation',
    'deliberate practice',
    'maker community',
    'workbench',
  ],
  authors: [{ name: 'Workbench' }],
  creator: 'Workbench',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.workbenchsoc.com',
    siteName: 'Workbench',
    title: 'Workbench — The RPG Operating System for Makers & Creators',
    description:
      'Gamify your workshop. Track builds, manage maker inventory, level up craft skills with deterministic RPG progression, and calculate lab formulas with precision.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Workbench — The RPG Operating System for Makers & Creators',
    description:
      'The RPG Operating System for Makers, Engineers & Creators. Track builds, manage inventory, and level up your skills.',
    creator: '@workbenchsoc',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Workbench',
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? {
        google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
      }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Workbench",
              applicationCategory: "DesignApplication",
              operatingSystem: "Web, PWA",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              description:
                "The RPG Operating System for Makers, Engineers & Creators. Track builds, manage maker inventory, level up craft skills with deterministic RPG progression, and calculate lab formulas with precision.",
              url: "https://www.workbenchsoc.com",
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('workbench-theme') === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
                var lang = localStorage.getItem('workbench_lang');
                if (lang) {
                  document.documentElement.lang = lang;
                  if (lang === 'he') {
                    document.documentElement.dir = 'rtl';
                  }
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="antialiased selection:bg-blue-500 selection:text-white">
        <LanguageProvider>
          <ServiceWorkerRegister />
          {children}
          <Analytics />
        </LanguageProvider>
      </body>
    </html>
  );
}
