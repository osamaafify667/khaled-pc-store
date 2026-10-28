import Link from "next/link";
import { Download, Search } from "lucide-react";
import { listAdminOrders } from "@/server/orders";
import { ADMIN_PAGE_SIZE, ORDER_STATUS_LABELS, ORDER_STATUS_STYLES, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_STYLES } from "@/lib/constants";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { cn, formatDateTimeShort, formatNumber, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "الطلبات" };

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; paymentStatus?: string; page?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const status = params.status ?? "";
  const paymentStatus = params.paymentStatus ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const data = await listAdminOrders({
    search: search || undefined,
    status: status || undefined,
    paymentStatus: paymentStatus || undefined,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  });

  const query = new URLSearchParams();
  if (search) query.set("q", search);
  if (status) query.set("status", status);
  if (paymentStatus) query.set("paymentStatus", paymentStatus);
  const exportQuery = query.toString();

  const hrefFor = (target: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(target));
    return `/admin/orders?${next.toString()}`;
  };

  const pendingReview = await listAdminOrders({ paymentStatus: "UNDER_REVIEW", page: 1, pageSize: 1 });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">الطلبات</h1>
          <p className="mt-1 text-xs text-slate-400">
            {formatNumber(data.total)} طلب — {formatNumber(pendingReview.total)} تحويل بانتظار المراجعة.
          </p>
        </div>
        <Link href={`/admin/orders/export${exportQuery ? `?${exportQuery}` : ""}`} className={buttonClasses("outline", "md")}>
          <Download className="h-4 w-4" />
          تصدير CSV
        </Link>
      </div>

      <form action="/admin/orders" className="surface flex flex-wrap items-end gap-3 p-4">
        <div className="w-full sm:min-w-[200px] sm:flex-1">
          <Input name="q" defaultValue={search} placeholder="رقم الطلب، الاسم، أو الهاتف…" aria-label="بحث الطلبات" />
        </div>
        <div className="w-full sm:w-44">
          <Select name="status" defaultValue={status} aria-label="حالة الطلب">
            <option value="">كل الحالات</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <Select name="paymentStatus" defaultValue={paymentStatus} aria-label="حالة الدفع">
            <option value="">كل حالات الدفع</option>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="secondary" className="w-full sm:w-auto">
          <Search className="h-4 w-4" />
          بحث
        </Button>
        {search || status || paymentStatus ? (
          <Link href="/admin/orders" className="text-xs font-bold text-slate-400 hover:text-accent">
            مسح
          </Link>
        ) : null}
      </form>

      <div className="table-wrap">
        <table className="data-table min-w-[900px]">
          <thead>
            <tr>
              <th>الطلب</th>
              <th>العميل</th>
              <th>الإجمالي</th>
              <th>الدفع</th>
              <th>الحالة</th>
              <th>التاريخ</th>
              <th aria-label="فتح" />
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-xs text-slate-500">
                  لا توجد طلبات مطابقة.
                </td>
              </tr>
            ) : (
              data.items.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/admin/orders/${order.id}`} className="font-mono text-[11px] font-bold text-white hover:text-accent" dir="ltr">
                      {order.orderNumber}
                    </Link>
                    <p className="mt-0.5 text-[9px] text-slate-500">{order.items.length} بند</p>
                  </td>
                  <td>
                    <p className="text-xs font-bold text-slate-200">{order.customerName}</p>
                    <p className="text-[10px] text-slate-500" dir="ltr">{order.customerPhone}</p>
                  </td>
                  <td className="text-xs font-bold text-white">{formatPrice(order.total)}</td>
                  <td>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-bold", PAYMENT_STATUS_STYLES[order.paymentStatus])}>
                      {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                    </span>
                  </td>
                  <td>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-bold", ORDER_STATUS_STYLES[order.status])}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="text-[10px] text-slate-500">{formatDateTimeShort(order.placedAt)}</td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      <Link href={`/admin/orders/${order.id}`} className="rounded-lg border border-accent/30 bg-accent/10 px-2 py-1 text-[10px] font-bold text-accent hover:bg-accent/20">
                        فتح
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={data.page} totalPages={data.totalPages} hrefFor={hrefFor} />
    </div>
  );
}
