import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventLead AI",
  description: "AI-powered event lead manager"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
