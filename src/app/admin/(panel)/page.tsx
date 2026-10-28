import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  CircleSlash,
  Clock,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { getDashboardStats, type DashboardRange } from "@/server/admin-stats";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/constants";
import { cn, formatDateTimeShort, formatNumber, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata = { title: "لوحة التحكم" };

type PageProps = { searchParams: Promise<{ range?: string }> };

function parseRange(value?: string): DashboardRange {
  const parsed = Number(value);
  return parsed === 7 || parsed === 90 ? parsed : 30;
}

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const { range: rangeParam } = await searchParams;
  const range = parseRange(rangeParam);
  const stats = await getDashboardStats(range);
  const maxRevenue = Math.max(1, ...stats.chart.map((point) => point.revenue));

  const cards = [
    {
      label: "إجمالي المبيعات المؤكدة",
      value: formatPrice(stats.confirmedSales),
      hint: `${formatNumber(stats.confirmedOrders)} طلب مدفوع/مسلّم`,
      icon: BadgeDollarSign,
      tone: "text-emerald-300 bg-emerald-500/10",
      href: "/admin/orders",
    },
    {
      label: `طلبات آخر ${range} يومًا`,
      value: formatNumber(stats.counts.ordersInRange),
      hint: `إجمالي الطلبات: ${formatNumber(stats.counts.totalOrders)}`,
      icon: ShoppingBag,
      tone: "text-sky-300 bg-sky-500/10",
      href: "/admin/orders",
    },
    {
      label: "بانتظار التأكيد",
      value: formatNumber(stats.counts.newOrders),
      hint: "تحتاج متابعة العميل",
      icon: Clock,
      tone: "text-amber-300 bg-amber-500/10",
      href: "/admin/orders?status=PENDING",
    },
    {
      label: "تحويلات بانتظار المراجعة",
      value: formatNumber(stats.counts.awaitingPayment),
      hint: "إنستاباي — مراجعة يدوية",
      icon: Wallet,
      tone: "text-violet-300 bg-violet-500/10",
      href: "/admin/orders?paymentStatus=UNDER_REVIEW",
    },
    {
      label: "مخزون منخفض",
      value: formatNumber(stats.counts.lowStockCount),
      hint: "قريب من النفاد",
      icon: AlertTriangle,
      tone: "text-orange-300 bg-orange-500/10",
      href: "/admin/inventory?filter=low",
    },
    {
      label: "نفد من المخزون",
      value: formatNumber(stats.counts.outOfStockCount),
      hint: "غير متاح للبيع",
      icon: CircleSlash,
      tone: "text-rose-300 bg-rose-500/10",
      href: "/admin/inventory?filter=out",
    },
    {
      label: "عدد العملاء",
      value: formatNumber(stats.counts.customersCount),
      hint: "حسابات العملاء",
      icon: Users,
      tone: "text-slate-300 bg-slate-500/10",
      href: "/admin/customers",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">لوحة التحكم</h1>
          <p className="mt-1 text-xs text-slate-400">ملخص حقيقي من قاعدة البيانات — الطلبات والمبيعات والمخزون.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/products"
            className="rounded-xl border border-line bg-ink-900/60 px-4 py-2 text-xs font-bold text-slate-300 transition hover:border-accent/40 hover:text-accent"
          >
            إدارة المنتجات
          </Link>
          <Link
            href="/admin/products/new"
            className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-ink-950 transition hover:bg-accent-soft"
          >
            + منتج جديد
          </Link>
          <div className="flex items-center gap-1 rounded-xl border border-line bg-ink-900/60 p-1">
            {([7, 30, 90] as const).map((option) => (
              <Link
                key={option}
                href={`/admin?range=${option}`}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[11px] font-bold transition",
                  range === option ? "bg-accent/15 text-accent" : "text-slate-400 hover:text-white",
                )}
              >
                {option} يوم
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="surface surface-hover p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] text-slate-500">{card.label}</p>
                <p className="mt-1.5 text-xl font-extrabold text-white">{card.value}</p>
                <p className="mt-1 text-[10px] text-slate-500">{card.hint}</p>
              </div>
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", card.tone)}>
                <card.icon className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base">المبيعات اليومية</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">الطلبات غير الملغاة آخر {range} يومًا (توقيت القاهرة)</p>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300">
              <TrendingUp className="h-3.5 w-3.5" />
              إجمالي {formatPrice(stats.chart.reduce((sum, point) => sum + point.revenue, 0))}
            </span>
          </div>

          <div className="mt-6 flex h-52 items-end gap-1 overflow-hidden" dir="ltr">
            {stats.chart.map((point) => (
              <div key={point.day} className="group relative flex h-full flex-1 items-end" title={`${point.label}: ${formatPrice(point.revenue)} · ${point.orders} طلب`}>
                <div
                  className="w-full rounded-t bg-gradient-to-t from-accent/20 to-accent/70 transition group-hover:from-accent/40 group-hover:to-accent"
                  style={{ height: `${Math.max(2, (point.revenue / maxRevenue) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[9px] text-slate-600" dir="ltr">
            <span>{stats.chart[0]?.label}</span>
            <span>{stats.chart[Math.floor(stats.chart.length / 2)]?.label}</span>
            <span>{stats.chart[stats.chart.length - 1]?.label}</span>
          </div>
        </div>

        <div className="surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base">الأكثر مبيعًا</h2>
            <Link href="/admin/products?sort=sales" className="text-[10px] font-bold text-accent hover:underline">
              كل المنتجات
            </Link>
          </div>
          {stats.topProducts.length === 0 ? (
            <p className="mt-6 text-xs text-slate-500">لا توجد مبيعات مسجلة بعد.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {stats.topProducts.map((product, index) => (
                <li key={product.productId} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-[10px] font-black text-slate-400">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-200">{product.name}</p>
                    <p className="text-[10px] text-slate-500">{formatNumber(product.quantity)} قطعة مباعة</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base">أحدث الطلبات</h2>
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-[10px] font-bold text-accent hover:underline">
              كل الطلبات
              <ArrowLeft className="h-3 w-3" />
            </Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="mt-6 text-xs text-slate-500">لا توجد طلبات بعد. ستظهر هنا فور وصول أول طلب.</p>
          ) : (
            <div className="mt-3 divide-y divide-line">
              {stats.recentOrders.map((order) => (
                <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex items-center justify-between gap-3 py-2.5 transition hover:bg-ink-800/40">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-bold text-white" dir="ltr">{order.orderNumber}</p>
                    <p className="truncate text-[10px] text-slate-500">{order.customerName} · {formatDateTimeShort(order.placedAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-bold", ORDER_STATUS_STYLES[order.status])}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                    <span className="text-xs font-bold text-white">{formatPrice(order.total)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">مخزون منخفض</h2>
              <Badge tone="warning">{stats.lowStock.length}</Badge>
            </div>
            {stats.lowStock.length === 0 ? (
              <p className="mt-4 text-[11px] text-slate-500">كل الكميات في المستوى الآمن.</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {stats.lowStock.slice(0, 5).map((item) => (
                  <li key={item.id} className="text-[11px]">
                    <Link href={`/admin/products/${item.id}`} className="line-clamp-1 font-bold text-slate-200 hover:text-accent">
                      {item.name}
                    </Link>
                    <p className="text-slate-500">متاح {item.available} · الحد {item.threshold}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">نفد من المخزون</h2>
              <Badge tone="danger">{stats.outOfStock.length}</Badge>
            </div>
            {stats.outOfStock.length === 0 ? (
              <p className="mt-4 text-[11px] text-slate-500">لا توجد منتجات نافدة.</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {stats.outOfStock.slice(0, 5).map((item) => (
                  <li key={item.id} className="text-[11px]">
                    <Link href={`/admin/products/${item.id}`} className="line-clamp-1 font-bold text-slate-200 hover:text-accent">
                      {item.name}
                    </Link>
                    <p className="text-slate-500" dir="ltr">{item.sku}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="surface flex items-center gap-3 p-5 sm:col-span-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Package className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">إدارة المنتجات والمخزون</p>
              <p className="text-[11px] text-slate-500">أضف منتجًا جديدًا أو عدّل الكميات مع تسجيل السبب.</p>
            </div>
            <Link href="/admin/products/new" className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-ink-950 transition hover:bg-accent-soft">
              منتج جديد
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
