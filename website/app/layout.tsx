import type { Metadata } from "next";
import { productionOrigin, site } from "../lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(productionOrigin),
  title: { default: "PlaybookDiff", template: "%s - PlaybookDiff" },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: "PlaybookDiff",
    description: site.description,
    siteName: site.name,
    type: "website",
    url: productionOrigin,
  },
  twitter: {
    card: "summary_large_image",
    title: "PlaybookDiff",
    description: site.description,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
