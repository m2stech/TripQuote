import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TripQuote",
  description: "Gerador de orÃ§amentos de turismo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
