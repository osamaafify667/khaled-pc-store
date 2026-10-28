import Link from "next/link";
import { LogOut, Store } from "lucide-react";
import { requireAdmin } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { logoutAction } from "@/actions/auth";
import { AdminNav, AdminTopLinks } from "@/components/admin/admin-nav";
import { Logo } from "@/components/layout/logo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { default: "لوحة التحكم", template: "%s | لوحة تحكم خالد للكمبيوتر" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [admin, settings] = await Promise.all([requireAdmin(), getSettings()]);

  return (
    <div className="min-h-screen bg-ink-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-60 shrink-0 border-l border-line bg-ink-900/50 lg:block">
          <div className="sticky top-0 flex h-screen flex-col p-4">
            <div className="px-2 py-2">
              <Logo />
              <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">لوحة التحكم</p>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto no-scrollbar">
              <AdminNav />
            </div>
            <div className="mt-3 border-t border-line pt-3">
              <div className="px-2 text-[11px] text-slate-500">
                <p className="font-bold text-slate-300">{admin.name}</p>
                <p className="truncate">{admin.email}</p>
              </div>
              <form action={logoutAction} className="mt-2">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                >
                  <LogOut className="h-4 w-4" />
                  تسجيل الخروج
                </button>
              </form>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-line bg-ink-950/90 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="lg:hidden">
                  <Logo compact />
                </div>
                <div className="hidden min-w-0 sm:block">
                  <p className="truncate text-xs font-bold text-slate-300">{settings.storeNameAr}</p>
                  <p className="text-[10px] text-slate-500">إدارة المتجر والطلبات والمخزون</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/admin/orders?status=PENDING"
                  className="hidden rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[10px] font-bold text-amber-300 transition hover:bg-amber-500/20 sm:block"
                >
                  طلبات بانتظار التأكيد
                </Link>
                <AdminTopLinks />
                <form action={logoutAction} className="lg:hidden">
                  <button
                    type="submit"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-slate-400"
                    aria-label="تسجيل الخروج"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
            <div className="border-t border-line px-4 py-2 lg:hidden">
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                <AdminNav />
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">{children}</main>

          <footer className="border-t border-line px-4 py-4 text-center text-[10px] text-slate-600 sm:px-6">
            <Store className="ml-1 inline h-3 w-3" />
            لوحة تحكم {settings.storeNameEn} — جميع الإجراءات الحساسة تُسجَّل في سجل النشاط.
          </footer>
        </div>
      </div>
    </div>
  );
}
