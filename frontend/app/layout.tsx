"use client";

import "./globals.css";
import { Source_Serif_4, Public_Sans, JetBrains_Mono, DM_Serif_Display } from "next/font/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { SplashGate } from "@/components/layout/SplashGate";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-didone",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
  }));

  return (
    <html lang="en" className={`${sourceSerif.variable} ${publicSans.variable} ${jetbrains.variable} ${dmSerif.variable}`}>
      <body>
        <QueryClientProvider client={queryClient}>
          <SplashGate>{children}</SplashGate>
        </QueryClientProvider>
      </body>
    </html>
  );
}
