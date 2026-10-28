"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-x flex min-h-[70vh] items-center justify-center py-16">
      <div className="max-w-lg text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300">
          <TriangleAlert className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-3xl">حدث خطأ غير متوقع</h1>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          نعتذر عن ذلك. يمكنك إعادة المحاولة، وإذا استمرت المشكلة تواصل معنا مع ذكر الوقت ورقم الطلب إن وُجد.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className={buttonClasses("primary", "md")}>
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </button>
          <Link href="/" className={buttonClasses("outline", "md")}>
            العودة للرئيسية
          </Link>
          <Link href="/contact" className={buttonClasses("ghost", "md")}>
            تواصل معنا
          </Link>
        </div>
      </div>
    </div>
  );
}
