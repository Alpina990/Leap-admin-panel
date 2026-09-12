import type { Metadata } from "next";
import "./globals.css";
import "./leap.css";

export const metadata: Metadata = {
  title: "LEAP English · Learning operations",
  description: "Manage LEAP English learners, courses, payments and learning outcomes.",
  other: {
    "codex-preview": "development",
  },
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
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
