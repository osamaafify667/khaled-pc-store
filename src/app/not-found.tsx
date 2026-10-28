import Link from "next/link";
import { ArrowLeft, Home, SearchX } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getSettings } from "@/server/settings";
import { getCategories } from "@/server/catalog";
import { getCartItemCount } from "@/server/cart";
import { buttonClasses } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NotFound() {
  const settings = await getSettings().catch(() => null);
  if (!settings) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <SearchX className="h-10 w-10 text-accent" />
        <h1 className="text-2xl">الصفحة غير موجودة</h1>
        <Link href="/" className={buttonClasses("primary", "md")}>
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  const [categories, cartCount] = await Promise.all([getCategories(), getCartItemCount()]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        settings={settings}
        categories={categories.map((category) => ({ slug: category.slug, nameAr: category.nameAr }))}
        cartCount={cartCount}
      />
      <main className="container-x flex flex-1 items-center justify-center py-16">
        <div className="max-w-lg text-center">
          <p className="text-7xl font-black text-accent/20">404</p>
          <h1 className="mt-2 text-3xl">لم نجد هذه الصفحة</h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            قد يكون الرابط قديمًا أو تم نقل الصفحة. جرّب البحث في المتجر أو ابدأ من الصفحة الرئيسية.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/" className={buttonClasses("primary", "md")}>
              <Home className="h-4 w-4" />
              الرئيسية
            </Link>
            <Link href="/shop" className={buttonClasses("outline", "md")}>
              تصفح المنتجات
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
      <Footer settings={settings} />
    </div>
  );
}
