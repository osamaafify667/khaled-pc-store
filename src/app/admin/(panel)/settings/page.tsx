import { getSettings } from "@/server/settings";
import { SettingsForm } from "@/components/admin/catalog-forms";

export const dynamic = "force-dynamic";

export const metadata = { title: "الإعدادات" };

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-white">إعدادات المتجر</h1>
        <p className="mt-1 text-xs text-slate-400">
          بيانات التواصل والشحن والدفع وSEO. أي بيانات غير مكتملة تظهر للعميل كـ«غير مُعد» ولا نختلق بيانات.
        </p>
      </div>
      <div className="max-w-4xl">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
