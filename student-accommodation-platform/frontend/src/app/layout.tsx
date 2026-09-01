import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Student Accommodation Platform",
  description: "Find PGs, flats, and rental rooms near your college.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
