import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kombat Taekwondo Identity",
  description:
    "Plataforma de identidad digital para practicantes de Kombat Taekwondo Chile",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="dark" className={inter.variable}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
