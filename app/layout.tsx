import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voltwise — Portuguese Electricity Comparator",
  description: "Compare electricity offers from all Portuguese suppliers using ERSE official data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
