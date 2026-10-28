import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/constants";
import { getSettings } from "@/server/settings";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#05070a",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  let settings;
  try {
    settings = await getSettings();
  } catch {
    settings = null;
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const title = settings?.metaTitle || `${settings?.storeNameAr ?? SITE.nameAr} | ${SITE.tagline}`;
  const description =
    settings?.metaDescription ||
    "متجر خالد للكمبيوتر — قطع كمبيوتر أصلية، كروت شاشة، معالجات، وتجميعات PC احترافية مع ضمان. مول البستان، وسط البلد، القاهرة.";

  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s | ${settings?.storeNameEn ?? SITE.nameEn}` },
    description,
    applicationName: SITE.nameEn,
    keywords: ["كمبيوتر", "قطع كمبيوتر", "تجميعات PC", "كارت شاشة", "معالج", "KHALED PC STORE", "القاهرة"],
    openGraph: {
      type: "website",
      locale: "ar_EG",
      siteName: settings?.storeNameEn ?? SITE.nameEn,
      title,
      description,
      url: siteUrl,
    },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
    icons: { icon: "/favicon.svg" },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable} data-scroll-behavior="smooth">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
