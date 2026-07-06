import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaxiNarx — Toshkentdagi taksilar narxini taqqoslang",
  description:
    "Yandex Go, Yango, MyTaxi, Uzum Taxi va ON Taxi narxlarini bir joyda taqqoslang. Eng arzon variantni 1 soniyada toping.",
  icons: {
    icon: [
      { url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='10' fill='%230F1216'/%3E%3Cpath d='M9 22.5l5-9.5h12l5 9.5v6.5a1.5 1.5 0 01-1.5 1.5h-2A1.5 1.5 0 0126 29v-1H14v1a1.5 1.5 0 01-1.5 1.5h-2A1.5 1.5 0 019 29v-6.5z' fill='%23FFCC00'/%3E%3C/svg%3E" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('taxinarx_theme')||'auto';var d=t==='dark'||(t==='auto'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans" suppressHydrationWarning>{children}</body>
    </html>
  );
}
