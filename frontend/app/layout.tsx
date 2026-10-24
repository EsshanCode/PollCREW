import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "PollCREW · People make elections work",
  description: "A nonpartisan, synthetic election staffing demonstration.",
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
