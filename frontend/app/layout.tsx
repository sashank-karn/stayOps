import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StayOps AI",
  description: "Multi-agent AI system for autonomous PG and co-living operations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
