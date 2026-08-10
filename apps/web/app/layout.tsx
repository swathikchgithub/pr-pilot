import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PR-Pilot — Context & Impact Analysis for AI Coding Agents",
  description:
    "Grounded code context and pre-merge blast-radius analysis for AI coding agents and CI, with a full governance audit trail.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
