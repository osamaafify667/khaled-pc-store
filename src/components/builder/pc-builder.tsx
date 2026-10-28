"use client";

import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Box,
  Check,
  CheckCircle2,
  ChevronLeft,
  CircuitBoard,
  Copy,
  Cpu,
  Fan,
  HardDrive,
  Loader2,
  MemoryStick,
  MessageCircle,
  Monitor,
  MonitorPlay,
  PlugZap,
  RotateCcw,
  Search,
  Share2,
  ShoppingCart,
  Sparkles,
  Trash2,
  TriangleAlert,
  Wrench,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { addBuildToCartAction, type CartActionState } from "@/actions/cart";
import { saveBuildAction, type BuildActionState } from "@/actions/build";
import { BUILDER_SLOTS, SLOT_CATEGORY_SLUGS, SLOT_LABELS } from "@/lib/constants";
import { toWhatsAppNumber } from "@/lib/phone";
import { compatibilityScore, evaluateBuild, selectionFromComponents, summarizeStatus } from "@/server/compatibility";
import type {
  BuildComponent,
  BuildSelection,
  CompatibilityResult,
  CompatibilityStatus,
  RuleOverrides,
} from "@/server/compatibility";
import { Button, buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice } from "@/lib/utils";

export type BuilderItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  brand: string | null;
  categorySlug: string;
  available: number;
  specs: Record<string, string | number | boolean>;
  specList: Array<{ label: string; value: string; unit: string | null }>;
};

const SLOT_ICONS: Record<string, LucideIcon> = {
  CPU: Cpu,
  MOTHERBOARD: CircuitBoard,
  RAM: MemoryStick,
  GPU: MonitorPlay,
  STORAGE: HardDrive,
  PSU: PlugZap,
  CASE: Box,
  COOLER: Fan,
  MONITOR: Monitor,
};

const STORAGE_KEY = "kps.builder.v1";

const statusStyles = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  danger: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  neutral: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

const scoreStyles = {
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-rose-400",
  neutral: "bg-slate-400",
};

const STATUS_RANK: Record<CompatibilityStatus, number> = {
  COMPATIBLE: 0,
  WARNING: 1,
  INSUFFICIENT_DATA: 2,
  INCOMPATIBLE: 3,
};

export function PcBuilder({
  products,
  overrides,
  initialItems,
  initialName,
  initialBuildId,
  shared = false,
  whatsapp,
  storeName,
}: {
  products: BuilderItem[];
  overrides: RuleOverrides;
  initialItems?: Array<{ slot: string; productId: string }>;
  initialName?: string;
  initialBuildId?: string;
  shared?: boolean;
  whatsapp: string | null;
  storeName: string;
}) {
  const byId = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const item of initialItems ?? []) map[item.slot] = item.productId;
    return map;
  });
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [hydrated, setHydrated] = useState(Boolean(initialItems));
  const [savedName, setSavedName] = useState(initialName ?? "");
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // تحميل التجميعة المحفوظة في المتصفح يتم بعد الترطيب (hydration) لتجنب
  // اختلاف HTML بين السيرفر والعميل. هذا استخدام مشروع لـ effect.
  /* eslint-disable react-hooks/set-state-in-effect -- قراءة localStorage بعد الترطيب */
  useEffect(() => {
    if (initialItems) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { selected?: Record<string, string>; name?: string };
        if (parsed.selected) {
          const valid: Record<string, string> = {};
          for (const [slot, productId] of Object.entries(parsed.selected)) {
            if (byId.has(productId)) valid[slot] = productId;
          }
          setSelected(valid);
        }
        if (parsed.name) setSavedName(parsed.name);
      }
    } catch {
      // Ignore malformed local data.
    }
    setHydrated(true);
  }, [byId, initialItems]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated || initialItems) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ selected, name: savedName }));
    } catch {
      // Storage may be unavailable in private mode.
    }
  }, [hydrated, initialItems, selected, savedName]);

  const components = useMemo(() => {
    const list: Array<{ slot: string; product: BuilderItem; component: BuildComponent }> = [];
    for (const slot of BUILDER_SLOTS) {
      const product = byId.get(selected[slot] ?? "");
      if (!product) continue;
      list.push({
        slot,
        product,
        component: {
          slot: slot as BuildComponent["slot"],
          productId: product.id,
          name: product.name,
          price: product.price,
          specs: product.specs,
          available: product.available > 0,
        },
      });
    }
    return list;
  }, [byId, selected]);

  const selection = useMemo<BuildSelection>(() => {
    const result = selectionFromComponents(components.map((entry) => entry.component));
    return result;
  }, [components]);

  const report: CompatibilityResult = useMemo(() => evaluateBuild(selection, overrides), [selection, overrides]);
  const status = summarizeStatus(report.status);
  const score = compatibilityScore(report);
  const selectedCount = components.length;
  const displayStatus =
    selectedCount === 0 ? { label: "بانتظار اختيار القطع", tone: "neutral" as const } : status;
  const requiredCount = report.missingSlots.length + selectedCount;
  const allAvailable = components.every((entry) => entry.product.available > 0);

  /** يعيد تقرير التوافق بعد استبدال خانة واحدة بمنتج آخر — يُستخدم للبدائل والتوصيات. */
  const buildWith = useCallback(
    (slot: string, productId: string): CompatibilityResult | null => {
      const product = byId.get(productId);
      if (!product) return null;
      const next: BuildComponent[] = components
        .filter((entry) => entry.slot !== slot)
        .map((entry) => entry.component);
      next.push({
        slot: slot as BuildComponent["slot"],
        productId: product.id,
        name: product.name,
        price: product.price,
        specs: product.specs,
        available: product.available > 0,
      });
      return evaluateBuild(selectionFromComponents(next), overrides);
    },
    [byId, components, overrides],
  );

  const alternatives = useMemo(() => {
    const unavailable = components.filter((entry) => entry.product.available <= 0);
    return unavailable
      .map((entry) => {
        const slug = SLOT_CATEGORY_SLUGS[entry.slot];
        const candidates = products
          .filter((product) => product.available > 0 && product.id !== entry.product.id)
          .filter((product) => !slug || product.categorySlug === slug)
          .map((product) => {
            const candidateReport = buildWith(entry.slot, product.id);
            return {
              product,
              status: candidateReport?.status ?? ("INSUFFICIENT_DATA" as CompatibilityStatus),
              score: candidateReport ? compatibilityScore(candidateReport) : 0,
            };
          })
          .sort(
            (a, b) =>
              STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
              b.score - a.score ||
              a.product.price - b.product.price,
          )
          .slice(0, 3);
        return { slot: entry.slot, current: entry.product, candidates };
      })
      .filter((group) => group.candidates.length > 0);
  }, [buildWith, components, products]);

  const pickerScores = useMemo(() => {
    const map = new Map<string, { status: CompatibilityStatus; score: number }>();
    if (!activeSlot) return map;
    const slug = SLOT_CATEGORY_SLUGS[activeSlot];
    for (const product of products) {
      if (slug && product.categorySlug !== slug) continue;
      const candidateReport = buildWith(activeSlot, product.id);
      if (candidateReport) {
        map.set(product.id, { status: candidateReport.status, score: compatibilityScore(candidateReport) });
      }
    }
    return map;
  }, [activeSlot, buildWith, products]);

  const pickerProducts = useMemo(() => {
    if (!activeSlot) return [];
    const slug = SLOT_CATEGORY_SLUGS[activeSlot];
    const search = pickerSearch.trim().toLowerCase();
    return products
      .filter((product) => !slug || product.categorySlug === slug)
      .filter((product) =>
        search
          ? `${product.name} ${product.brand ?? ""}`.toLowerCase().includes(search)
          : true,
      )
      .sort((a, b) => {
        if ((a.available > 0) !== (b.available > 0)) return a.available > 0 ? -1 : 1;
        const rankA = pickerScores.get(a.id)?.status;
        const rankB = pickerScores.get(b.id)?.status;
        if (rankA && rankB && rankA !== rankB) return STATUS_RANK[rankA] - STATUS_RANK[rankB];
        return a.price - b.price;
      });
  }, [activeSlot, pickerSearch, pickerScores, products]);

  const whatsappHref = useMemo(() => {
    if (!whatsapp || components.length === 0) return null;
    const lines = components.map(
      (entry) => `• ${SLOT_LABELS[entry.slot]}: ${entry.product.name} — ${formatPrice(entry.product.price)}`,
    );
    const parts = [
      `مرحبًا ${storeName}،`,
      "أرغب في تجميعة بهذه القطع:",
      ...lines,
      "",
      `الإجمالي: ${formatPrice(report.total)}`,
      `التوافق: ${status.label} (${score}%)`,
    ];
    if (report.missingSlots.length > 0) {
      parts.push(`خانات ناقصة: ${report.missingSlots.map((slot) => SLOT_LABELS[slot]).join("، ")}`);
    }
    return `https://wa.me/${toWhatsAppNumber(whatsapp)}?text=${encodeURIComponent(parts.join("\n"))}`;
  }, [components, report.missingSlots, report.total, score, status.label, storeName, whatsapp]);

  const [cartState, cartAction, cartPending] = useActionState<CartActionState, FormData>(addBuildToCartAction, {});
  const [saveState, saveAction, savePending] = useActionState<BuildActionState, FormData>(saveBuildAction, {});

  const itemsPayload = JSON.stringify(
    components.map((entry) => ({
      productId: entry.product.id,
      slot: entry.slot,
      quantity: 1,
    })),
  );

  const shareUrl =
    saveState.url && typeof window !== "undefined" ? `${window.location.origin}${saveState.url}` : null;

  const copyShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setSaveError("تعذر نسخ الرابط. انسخه يدويًا.");
    }
  };

  const selectProduct = (slot: string, productId: string) => {
    setSelected((current) => ({ ...current, [slot]: productId }));
    setActiveSlot(null);
    setPickerSearch("");
  };

  const removeSlot = (slot: string) => {
    setSelected((current) => {
      const next = { ...current };
      delete next[slot];
      return next;
    });
  };

  const reset = () => {
    setSelected({});
    setSavedName("");
    setSaveError(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {shared ? (
          <div className="flex items-center justify-between rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-xs text-accent-soft">
            <span>أنت تشاهد تجميعة محفوظة ومشاركة.</span>
            <Link href="/builder" className="font-bold hover:underline">
              كوّن تجميعتك الخاصة
            </Link>
          </div>
        ) : null}

        {BUILDER_SLOTS.map((slot) => {
          const entry = components.find((item) => item.slot === slot);
          const Icon = SLOT_ICONS[slot] ?? Wrench;
          return (
            <div
              key={slot}
              className={cn(
                "surface flex flex-wrap items-center gap-3 p-3 transition sm:flex-nowrap sm:p-4",
                entry ? "border-accent/15" : "border-dashed",
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
                  entry ? "border-accent/25 bg-accent/10 text-accent" : "border-line bg-ink-900 text-slate-500",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{SLOT_LABELS[slot]}</p>
                {entry ? (
                  <>
                    <p className="mt-0.5 line-clamp-1 text-sm font-bold text-white">{entry.product.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {formatPrice(entry.product.price)}
                      {entry.product.brand ? ` · ${entry.product.brand}` : ""}
                      {entry.product.available <= 0 ? (
                        <span className="font-bold text-rose-300"> · غير متوفر حاليًا</span>
                      ) : null}
                    </p>
                  </>
                ) : (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {slot === "GPU" ? "اختياري إذا كان المعالج برسوميات مدمجة" : "لم يتم اختيار قطعة"}
                  </p>
                )}
              </div>

              <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                <Button variant={entry ? "outline" : "secondary"} size="sm" onClick={() => setActiveSlot(slot)}>
                  {entry ? "تغيير" : "اختيار"}
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {entry ? (
                  <button
                    type="button"
                    onClick={() => removeSlot(slot)}
                    aria-label={`إزالة ${SLOT_LABELS[slot]}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-slate-500 transition hover:border-rose-500/40 hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}

        <p className="px-1 text-[11px] leading-6 text-slate-500">
          القطع غير المتوفرة تُعلَّم بوضوح، وعند اختيارها يعرض النظام بدائل متاحة من نفس الفئة بعد إعادة فحص التوافق.
          عند نقص أي مواصفة فنية في منتج، يعرض الفحص «بيانات غير كافية» بدلًا من الادعاء بالتوافق. كل الأسعار
          تُعاد حسابها على السيرفر عند إتمام الطلب.
        </p>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-40 lg:self-start">
        <div className="surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base">ملخص التجميعة</h2>
            <span className="text-[11px] text-slate-500">
              {selectedCount} / {Math.max(requiredCount, selectedCount)} قطعة
            </span>
          </div>

          <div className="mt-4 space-y-2 border-b border-line pb-4">
            {components.length === 0 ? (
              <p className="text-xs text-slate-500">لم تختر أي قطعة بعد. ابدأ بالمعالج.</p>
            ) : (
              components.map((entry) => (
                <div key={entry.slot} className="flex items-start justify-between gap-2 text-xs">
                  <span className="line-clamp-1 text-slate-400">{SLOT_LABELS[entry.slot]}</span>
                  <span className="shrink-0 font-semibold text-slate-200">{formatPrice(entry.product.price)}</span>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-sm text-slate-400">الإجمالي</span>
            <span className="text-2xl font-extrabold text-white">{formatPrice(report.total)}</span>
          </div>

          <div className={cn("mt-4 rounded-xl border p-3", statusStyles[displayStatus.tone])}>
            <p className="flex items-center gap-2 text-xs font-bold">
              {displayStatus.tone === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : displayStatus.tone === "danger" ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <TriangleAlert className="h-4 w-4" />
              )}
              {displayStatus.label}
            </p>
            {report.missingSlots.length > 0 ? (
              <p className="mt-1 text-[11px] leading-5 opacity-90">
                ناقص: {report.missingSlots.map((slot) => SLOT_LABELS[slot]).join("، ")}
              </p>
            ) : null}
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">نسبة التوافق والاكتمال</span>
              <span className="font-extrabold text-white">{score}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-800">
              <div
                className={cn("h-full rounded-full transition-all duration-500", scoreStyles[displayStatus.tone])}
                style={{ width: `${score}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] leading-5 text-slate-500">
              {selectedCount === 0
                ? "اختر أول قطعة لبدء فحص التوافق."
                : `النسبة للعرض فقط. حالة «${status.label}» أعلاه هي القرار الفني النهائي من محرك التوافق.`}
            </p>
          </div>

          {report.issues.length > 0 ? (
            <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pl-1 text-[11px] leading-5">
              {report.issues.map((issue, index) => (
                <li
                  key={`${issue.ruleKey}-${index}`}
                  className={cn(
                    "rounded-lg border px-2.5 py-2",
                    issue.severity === "ERROR"
                      ? "border-rose-500/25 bg-rose-500/5 text-rose-200"
                      : issue.severity === "WARNING"
                        ? "border-amber-500/25 bg-amber-500/5 text-amber-200"
                        : "border-slate-500/25 bg-slate-500/5 text-slate-300",
                  )}
                >
                  {issue.message}
                  {issue.hint ? <span className="mt-1 block text-[10px] opacity-70">{issue.hint}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}

          {alternatives.length > 0 ? (
            <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-200">
                <Sparkles className="h-3.5 w-3.5" />
                بدائل متاحة من المتجر
              </p>
              <p className="mt-1 text-[10px] leading-5 text-slate-400">
                قطع اخترتها وغير متوفرة حاليًا. هذه أفضل البدائل المتاحة بعد إعادة فحص التوافق.
              </p>
              {alternatives.map((group) => (
                <div key={group.slot} className="mt-2.5">
                  <p className="text-[10px] font-bold text-slate-300">
                    {SLOT_LABELS[group.slot]}: <span className="font-normal text-slate-500">{group.current.name}</span>
                  </p>
                  <ul className="mt-1 space-y-1">
                    {group.candidates.map((candidate) => {
                      const candidateStatus = summarizeStatus(candidate.status);
                      return (
                        <li key={candidate.product.id}>
                          <button
                            type="button"
                            onClick={() => selectProduct(group.slot, candidate.product.id)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-ink-900 px-2 py-1.5 text-right transition hover:border-accent/40"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[10px] font-bold text-slate-200">
                                {candidate.product.name}
                              </span>
                              <span className="text-[9px] text-slate-500">
                                {formatPrice(candidate.product.price)} · متاح {candidate.product.available}
                              </span>
                            </span>
                            <Badge tone={candidateStatus.tone}>{candidateStatus.label}</Badge>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}

          <form action={cartAction} className="mt-4">
            <input type="hidden" name="items" value={itemsPayload} />
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={cartPending || components.length === 0 || !allAvailable}
            >
              {cartPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              أضف التجميعة كاملة للسلة
            </Button>
          </form>

          {!allAvailable ? (
            <p className="mt-2 text-[11px] text-rose-300">بعض القطع غير متوفرة. استبدلها قبل الإضافة.</p>
          ) : null}
          {cartState.message ? (
            <p className={cn("mt-2 text-[11px]", cartState.ok ? "text-emerald-300" : "text-rose-300")}>
              {cartState.message}
              {cartState.ok ? (
                <Link href="/cart" className="mr-2 font-bold underline">
                  عرض السلة
                </Link>
              ) : null}
            </p>
          ) : null}

          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("success", "md", "mt-2 w-full")}
            >
              <MessageCircle className="h-4 w-4" />
              أرسل التجميعة على واتساب
            </a>
          ) : null}

          <div className="mt-4 border-t border-line pt-4">
            <form action={saveAction} className="space-y-2">
              <input type="hidden" name="items" value={itemsPayload} />
              {initialBuildId ? <input type="hidden" name="buildId" value={initialBuildId} /> : null}
              <input
                type="text"
                name="name"
                value={savedName}
                onChange={(event) => setSavedName(event.target.value)}
                placeholder="اسم التجميعة (مثال: تجميعة الألعاب)"
                className="field h-10 text-xs"
                aria-label="اسم التجميعة"
                required
                minLength={2}
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={savePending || components.length === 0}
                >
                  {savePending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
                  احفظ وشارك
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={reset} aria-label="إعادة ضبط التجميعة">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </form>

            {saveState.error ? <p className="mt-2 text-[11px] text-rose-300">{saveState.error}</p> : null}
            {saveState.message ? <p className="mt-2 text-[11px] text-emerald-300">{saveState.message}</p> : null}
            {shareUrl ? (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-ink-900 p-2">
                <input readOnly value={shareUrl} className="min-w-0 flex-1 bg-transparent text-[10px] text-slate-300" dir="ltr" />
                <button
                  type="button"
                  onClick={copyShare}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line text-slate-300 hover:text-accent"
                  aria-label="نسخ رابط المشاركة"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            ) : null}
            {saveError ? <p className="mt-2 text-[11px] text-rose-300">{saveError}</p> : null}
          <div className="mt-2 text-[10px] leading-5 text-slate-500">يمكنك حفظ التجميعة ومشاركتها بدون حساب أو تسجيل دخول.</div>
          </div>
        </div>

        <div className="surface p-4 text-[11px] leading-6 text-slate-400">
          <p className="mb-2 flex items-center gap-1.5 font-bold text-slate-200">
            <Wrench className="h-3.5 w-3.5 text-accent" />
            كيف يعمل الفحص؟
          </p>
          نطابق المقبس والشرائح، نوع الرامات وعدد الوحدات، مقاس اللوحة والكيسة، أطوال الكارت والمشتت، منافذ
          التخزين، قدرة الباور والموصلات. عند نقص بيانات أي قطعة نظهر تحذيرًا واضحًا.
        </div>
      </aside>

      {activeSlot ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="flex h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-line bg-ink-900 sm:h-[80vh] sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-accent">اختر القطعة</p>
                <h2 className="text-lg">{SLOT_LABELS[activeSlot]}</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveSlot(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-slate-400 hover:text-white"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-line p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  value={pickerSearch}
                  onChange={(event) => setPickerSearch(event.target.value)}
                  placeholder="ابحث بالاسم أو الشركة…"
                  className="field pr-10"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {pickerProducts.length === 0 ? (
                <div className="py-14 text-center text-sm text-slate-400">
                  <p>لا توجد قطع منشورة في هذه الخانة بعد.</p>
                  <Link href="/contact" className="mt-2 inline-block text-xs font-bold text-accent hover:underline">
                    اطلب القطعة من الفريق
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {pickerProducts.map((product) => {
                    const isSelected = selected[activeSlot] === product.id;
                    const disabled = product.available <= 0;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => selectProduct(activeSlot, product.id)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl border p-3 text-right transition",
                          isSelected
                            ? "border-accent/50 bg-accent/10"
                            : "border-line bg-ink-850/60 hover:border-accent/30 hover:bg-ink-800",
                          disabled && "border-rose-500/25 opacity-80 hover:border-amber-500/40",
                        )}
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-accent">
                          {(() => {
                            const Icon = SLOT_ICONS[activeSlot] ?? Wrench;
                            return <Icon className="h-4 w-4" />;
                          })()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-white">{product.name}</span>
                            {product.brand ? <span className="text-[10px] text-slate-500">{product.brand}</span> : null}
                            {isSelected ? <Badge tone="accent">مختار</Badge> : null}
                            {(() => {
                              const candidateScore = pickerScores.get(product.id);
                              if (!candidateScore) return null;
                              const candidateStatus = summarizeStatus(candidateScore.status);
                              return (
                                <Badge tone={candidateStatus.tone}>{candidateStatus.label}</Badge>
                              );
                            })()}
                            {disabled ? <Badge tone="danger">غير متوفر</Badge> : null}
                          </span>
                          <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
                            {product.specList.slice(0, 3).map((spec) => (
                              <span key={`${spec.label}-${spec.value}`}>
                                {spec.label}: {spec.value}
                                {spec.unit ? ` ${spec.unit}` : ""}
                              </span>
                            ))}
                          </span>
                          {disabled ? (
                            <span className="mt-1 block text-[10px] font-bold text-amber-300">
                              اختر القطعة لعرض البدائل المتاحة من المتجر
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 text-left">
                          <span className="block text-sm font-extrabold text-white">{formatPrice(product.price)}</span>
                          <span
                            className={cn(
                              "mt-1 block text-[10px]",
                              product.available <= 0
                                ? "text-rose-300"
                                : product.available > 3
                                  ? "text-emerald-400"
                                  : "text-amber-400",
                            )}
                          >
                            {product.available > 0 ? `متاح ${product.available}` : "غير متوفر"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-line p-3">
              <Link href="/shop" className={buttonClasses("ghost", "sm", "w-full")}>
                تصفح كل المتجر
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
