import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kulima - Smart Farm Management",
  description: "African AgriTech platform for farm management, soil health monitoring, disease detection, and weather tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
