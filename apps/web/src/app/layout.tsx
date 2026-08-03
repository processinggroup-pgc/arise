import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "ARISE Studio",
  description: "Governed build agent foundation for multi-tenant delivery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
