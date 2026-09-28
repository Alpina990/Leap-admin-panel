import type { Metadata } from "next";
import "./globals.css";
import "./pushday.css";
import AppearanceProvider from './theme-provider';

export const metadata: Metadata = {
  title: "LEAP English · Admin Panel",
  description: "Read-only LEAP English administrator overview and learner directory.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased"><AppearanceProvider>{children}</AppearanceProvider></body>
    </html>
  );
}
