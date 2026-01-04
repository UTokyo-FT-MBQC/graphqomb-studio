import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "GraphQOMB Studio",
  description: "Visual editor for MBQC Graph, Flow, and Schedule",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactNode {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
