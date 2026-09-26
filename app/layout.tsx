import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CovenantFlow | Service agreement changes",
  description: "Record service terms, classify proposed changes with GenLayer validators, and activate updates only with consent from both parties.",
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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
