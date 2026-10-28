import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/server/auth";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { Logo } from "@/components/layout/logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "دخول لوحة التحكم",
  robots: { index: false, follow: false, nocache: true },
};

type PageProps = { searchParams: Promise<{ next?: string }> };

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (user?.role === "ADMIN") redirect(next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="mb-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-2xl">لوحة التحكم</h1>
          <p className="mt-2 text-xs leading-6 text-slate-500">صفحة خاصة بإدارة المتجر. أدخل كلمة المرور للمتابعة.</p>
        </div>

        <AdminLoginForm next={next} />

        <p className="mt-6 text-center text-[10px] leading-5 text-slate-600">
          كل محاولات الدخول تُسجَّل. إذا نسيت كلمة المرور، تواصل مع مسؤول النظام.
        </p>
      </div>
    </div>
  );
}
