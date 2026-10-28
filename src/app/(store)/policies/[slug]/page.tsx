import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, ShieldCheck } from "lucide-react";
import { getSettings, type Settings } from "@/server/settings";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export const dynamic = "force-dynamic";

const POLICY_LINKS = [
  { slug: "warranty", label: "سياسة الضمان" },
  { slug: "exchange", label: "الاستبدال" },
  { slug: "returns", label: "الاسترجاع" },
  { slug: "shipping", label: "الشحن والتوصيل" },
  { slug: "privacy", label: "الخصوصية" },
  { slug: "terms", label: "الشروط والأحكام" },
];

type PolicyContent = {
  title: string;
  description: string;
  sections: Array<{ heading: string; body: React.ReactNode }>;
};

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const link = POLICY_LINKS.find((item) => item.slug === slug);
  if (!link) return { title: "الصفحة غير موجودة" };
  return {
    title: link.label,
    description: `${link.label} في متجر خالد للكمبيوتر — شروط واضحة ومكتوبة.`,
    alternates: { canonical: `/policies/${slug}` },
  };
}

function buildPolicies(settings: Settings): Record<string, PolicyContent> {
  const storeName = settings.storeNameAr;
  const contact = settings.phone ? `الهاتف: ${settings.phone}` : "عبر صفحة التواصل";

  return {
    warranty: {
      title: "سياسة الضمان",
      description: "جميع القطع المباعة أصلية وبضمان رسمي وفق مدة الضمان الموضحة في صفحة كل منتج.",
      sections: [
        {
          heading: "ما الذي يغطيه الضمان؟",
          body: (
            <p>
              يغطي الضمان عيوب الصناعة في القطعة نفسها لمدة {settings.defaultWarrantyMonths} شهرًا كحد أدنى أو
              المدة المكتوبة في صفحة المنتج/الفاتورة، أيهما أطول. تشمل المدة استبدال القطعة أو إصلاحها وفق
              إمكانية المورد.
            </p>
          ),
        },
        {
          heading: "ما الذي لا يغطيه الضمان؟",
          body: (
            <ul>
              <li>التلف الناتج عن سوء الاستخدام أو التركيب الخاطئ أو انقطاع الكهرباء.</li>
              <li>الكسر أو الحرق أو آثار السوائل أو العبث بالقطعة أو فك الملصقات الأصلية.</li>
              <li>تلف ناتج عن تجميع غير احترافي أو استخدام مزود طاقة غير مناسب.</li>
              <li>الأضرار الناتجة عن البرمجيات أو الفيروسات أو التعديلات غير الرسمية.</li>
            </ul>
          ),
        },
        {
          heading: "إجراءات المطالبة",
          body: (
            <p>
              تواصل معنا عبر صفحة التواصل أو {contact} ومعك رقم الفاتورة أو رقم الطلب. قد نطلب فحص القطعة في
              المحل قبل اعتماد المطالبة. مدة الفحص تعتمد على المورد وقد تصل إلى عدة أيام عمل.
            </p>
          ),
        },
        {
          heading: "القطع المستعملة أو المعاد بيعها",
          body: <p>إن وُجدت قطع مستعملة تُذكر حالتها ومدة ضمانها بوضوح في صفحة المنتج قبل الشراء.</p>,
        },
      ],
    },
    exchange: {
      title: "سياسة الاستبدال",
      description: "شروط استبدال المنتجات خلال المدة المحددة وبحالة أصلية.",
      sections: [
        {
          heading: "مدة الاستبدال",
          body: <p>يمكن طلب استبدال المنتج خلال 14 يومًا من الاستلام، بشرط أن يكون بحالته الأصلية وبكامل ملحقاته وتغليفه.</p>,
        },
        {
          heading: "شروط القبول",
          body: (
            <ul>
              <li>عدم وجود آثار تركيب أو استخدام أو خدوش على القطعة.</li>
              <li>وجود الفاتورة أو إثبات الشراء.</li>
              <li>إمكانية إعادة المنتج للمورد وفق سياسته.</li>
              <li>المنتجات المخصصة أو التي تم فتحها وتجميعها قد لا تكون قابلة للاستبدال.</li>
            </ul>
          ),
        },
        {
          heading: "فرق السعر",
          body: <p>عند استبدال منتج بآخر مختلف، يُسدد الفرق إن كان أعلى، ويُرد الفرق إن كان أقل وفق سياسة الاسترجاع.</p>,
        },
        {
          heading: "كيف تطلب الاستبدال؟",
          body: <p>تواصل معنا خلال المدة المحددة مع رقم الطلب وصورة للمنتج وحالته. سنحدد لك خطوات الإرجاع والاستلام.</p>,
        },
      ],
    },
    returns: {
      title: "سياسة الاسترجاع",
      description: "شروط استرجاع المنتجات واسترداد المبلغ.",
      sections: [
        {
          heading: "مدة الاسترجاع",
          body: <p>يمكن طلب استرجاع المنتج خلال 14 يومًا من الاستلام بشرط حالته الأصلية وعدم استخدامه.</p>,
        },
        {
          heading: "المنتجات غير القابلة للاسترجاع",
          body: (
            <ul>
              <li>القطع التي تم تركيبها أو استخدامها أو فتح برامجها/تعريفاتها.</li>
              <li>المنتجات المخصصة حسب الطلب.</li>
              <li>المنتجات التي تلفت بسبب سوء الاستخدام بعد الاستلام.</li>
              <li>بطاقات الأكواد الرقمية بعد كشف الكود.</li>
            </ul>
          ),
        },
        {
          heading: "طريقة الاسترداد",
          body: (
            <p>
              بعد فحص المنتج وقبوله، يتم رد المبلغ بنفس طريقة الدفع الأصلية. الدفع النقدي يُرد نقدًا في المحل أو
              تحويلًا بنكيًا/إنستاباي حسب ما يتفق عليه. قد تستغرق عملية الاسترداد من 3 إلى 7 أيام عمل.
            </p>
          ),
        },
        {
          heading: "مصاريف الإرجاع",
          body: <p>يتحمل المتجر مصاريف الإرجاع في حال وجود عيب بالمنتج، ويتحمل العميل المصاريف في حالات تغيير الرأي.</p>,
        },
      ],
    },
    shipping: {
      title: "الشحن والتوصيل",
      description: "أسعار ومدد الشحن في محافظات مصر، وخيار الاستلام من المحل.",
      sections: [
        {
          heading: "التوصيل",
          body: (
            <p>
              نوصل لجميع محافظات مصر. تُحسب رسوم الشحن حسب المحافظة وتظهر بوضوح في صفحة إتمام الطلب قبل التأكيد.
              مدة التوصيل تقديرية وتعتمد على شركة الشحن والمحافظة.
            </p>
          ),
        },
        {
          heading: "الاستلام من المحل",
          body: (
            <p>
              يمكنك اختيار الاستلام من {settings.addressLine}
              {settings.workingHours ? ` خلال مواعيد العمل: ${settings.workingHours}` : ""}. يصلك كود استلام
              مع تأكيد الطلب، ويجب إظهاره عند الاستلام.
            </p>
          ),
        },
        {
          heading: "الدفع",
          body: (
            <p>
              الدفع نقدًا عند الاستلام أو عند الاستلام من المحل.
              {settings.instapayEnabled
                ? " كما يمكن الدفع عبر تحويل إنستاباي مع إرسال مرجع التحويل للمراجعة اليدوية قبل اعتماد الدفع."
                : " تحويل إنستاباي غير مُفعّل حاليًا."}
            </p>
          ),
        },
        {
          heading: "تأكيد الطلب",
          body: <p>نتواصل معك هاتفيًا أو عبر واتساب لتأكيد الطلب والعنوان قبل الشحن. الطلبات غير المؤكدة قد تُلغى بعد فترة.</p>,
        },
        {
          heading: "مشكلة في الشحنة",
          body: <p>أبلغنا خلال 48 ساعة من الاستلام مع صور للتغليف والمنتج لحل المشكلة مع شركة الشحن.</p>,
        },
      ],
    },
    privacy: {
      title: "سياسة الخصوصية",
      description: "كيف نجمع بياناتك ونستخدمها ونحميها.",
      sections: [
        {
          heading: "البيانات التي نجمعها",
          body: (
            <ul>
              <li>بيانات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف (إن أدخلته).</li>
              <li>بيانات الطلب: المنتجات، العنوان، ملاحظات التوصيل، وبيانات الدفع اليدوي (مرجع التحويل).</li>
              <li>بيانات تقنية: عنوان IP وسجل الدخول لأغراض الأمان ومنع إساءة الاستخدام.</li>
            </ul>
          ),
        },
        {
          heading: "كيف نستخدم البيانات",
          body: (
            <p>
              لتنفيذ الطلبات، التواصل معك، تتبع الشحنات، حماية الحسابات، ومنع الاحتيال. لا نبيع بياناتك لأطراف
              ثالثة لأغراض تسويقية.
            </p>
          ),
        },
        {
          heading: "الدفع",
          body: <p>لا نحتفظ ببيانات بطاقات بنكية. الدفع نقدًا أو تحويل إنستاباي يدوي مع إثبات التحويل.</p>,
        },
        {
          heading: "الاحتفاظ والحذف",
          body: (
            <p>
              نحتفظ بسجلات الطلبات للمحاسبة والضمان وفق المتطلبات القانونية. يمكنك طلب تحديث بياناتك أو حذف حسابك
              عبر {contact} مع مراعاة السجلات التي يلزم الاحتفاظ بها.
            </p>
          ),
        },
        {
          heading: "الأمان",
          body: <p>نستخدم تخزينًا آمنًا لكلمات المرور وجلسات مشفّرة، ونقيّد الوصول للوحة التحكم على الإداريين فقط.</p>,
        },
      ],
    },
    terms: {
      title: "الشروط والأحكام",
      description: "شروط استخدام موقع المتجر والشراء منه.",
      sections: [
        {
          heading: "استخدام الموقع",
          body: <p>باستخدامك موقع {storeName} فإنك توافق على هذه الشروط. يمنع استخدام الموقع لأي غرض غير قانوني أو محاولة اختراقه.</p>,
        },
        {
          heading: "الأسعار والتوافر",
          body: (
            <p>
              نحرص على تحديث الأسعار والمخزون، لكن قد تحدث أخطاء. يحق للمتجر إلغاء الطلب وإبلاغك في حال وجود خطأ
              واضح في السعر أو نفاد المخزون، مع رد أي مبلغ مدفوع.
            </p>
          ),
        },
        {
          heading: "تأكيد الطلب",
          body: <p>الطلب يصبح مؤكدًا بعد تواصلنا معك. قد نطلب تأكيدًا هاتفيًا للطلبات الكبيرة أو غير المألوفة.</p>,
        },
        {
          heading: "الملكية الفكرية",
          body: <p>جميع الصور والنصوص والشعارات مملوكة للمتجر أو مورديه، ولا يجوز نسخها دون إذن.</p>,
        },
        {
          heading: "المسؤولية",
          body: (
            <p>
              المتجر مسؤول عن سلامة المنتج حتى التسليم. بعد الاستلام تُطبق سياسات الضمان والاستبدال. لا يتحمل
              المتجر مسؤولية سوء التركيب خارج المحل.
            </p>
          ),
        },
        {
          heading: "التواصل",
          body: <p>{contact}. العنوان: {settings.addressLine}.</p>,
        },
      ],
    },
  };
}

export default async function PolicyPage({ params }: PageProps) {
  const { slug } = await params;
  const settings = await getSettings();
  const policies = buildPolicies(settings);
  const policy = policies[slug];
  if (!policy) notFound();

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "السياسات", href: "/policies/warranty" }, { label: policy.title }]} />

      <div className="mt-6 grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-40 lg:h-fit">
          <div className="surface p-2">
            {POLICY_LINKS.map((link) => (
              <Link
                key={link.slug}
                href={`/policies/${link.slug}`}
                className={
                  link.slug === slug
                    ? "flex items-center gap-2 rounded-xl bg-accent/15 px-3 py-2.5 text-xs font-bold text-accent"
                    : "flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-400 transition hover:bg-ink-800 hover:text-white"
                }
              >
                {link.slug === slug ? <ShieldCheck className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                {link.label}
              </Link>
            ))}
          </div>
        </aside>

        <article className="min-w-0">
          <div className="max-w-2xl">
            <h1 className="text-3xl">{policy.title}</h1>
            <p className="mt-2 text-sm leading-7 text-slate-400">{policy.description}</p>
          </div>

          <div className="surface mt-6 p-5 sm:p-7">
            <div className="prose-ar">
              {policy.sections.map((section) => (
                <section key={section.heading}>
                  <h2>{section.heading}</h2>
                  {section.body}
                </section>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-line bg-ink-900/60 p-4 text-xs leading-6 text-slate-400">
              آخر تحديث لهذه السياسة: تُراجع دوريًا من إدارة المتجر. لأي استفسار تواصل معنا عبر{" "}
              <Link href="/contact" className="font-bold text-accent hover:underline">
                صفحة التواصل
              </Link>
              .
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
