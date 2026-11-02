import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Workbench — Gamified Productivity & Project Management",
  description: "Production-ready, globally secure project journal, Jira-style task boards, and XP skill progression engine.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
