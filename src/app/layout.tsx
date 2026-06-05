import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wayrd — Flight monitoring for hotels",
  description:
    "Wayrd monitora i voli dei tuoi ospiti e avvisa ospite e reception su WhatsApp.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
