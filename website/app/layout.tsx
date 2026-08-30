import type { Metadata } from "next";
import { productionOrigin, site } from "../lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: "PlaybookDiff | Same repo. Different agents. Know the difference.",
  description: site.description,
  ...(productionOrigin
    ? {
        metadataBase: new URL(productionOrigin),
        alternates: { canonical: "/" },
      }
    : {}),
  openGraph: {
    title: "PlaybookDiff | Catch agent configuration drift",
    description: site.description,
    siteName: site.name,
    type: "website",
    ...(productionOrigin ? { url: productionOrigin } : {}),
  },
  twitter: {
    card: "summary",
    title: "PlaybookDiff | Catch agent configuration drift",
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
