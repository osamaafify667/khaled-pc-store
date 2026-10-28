import { getCartItemCount } from "@/server/cart";
import { getCategories } from "@/server/catalog";
import { getSettings } from "@/server/settings";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories, cartCount] = await Promise.all([getSettings(), getCategories(), getCartItemCount()]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        settings={settings}
        categories={categories.map((category) => ({ slug: category.slug, nameAr: category.nameAr }))}
        cartCount={cartCount}
      />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
      <WhatsAppButton whatsapp={settings.whatsapp} />
    </div>
  );
}
