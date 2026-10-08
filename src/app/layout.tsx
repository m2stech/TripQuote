import type { Metadata } from "next";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "SnowQuote",
  description: "Gerador de orçamentos de turismo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
