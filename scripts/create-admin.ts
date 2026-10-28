/**
 * إنشاء أو تحديث حساب مدير بأمان.
 *
 * الاستخدام:
 *   npm run admin:create -- --email admin@example.com --password "كلمة-مرور-قوية" --name "مدير المتجر"
 *
 * أو عبر متغيرات البيئة ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME.
 * لا توجد كلمة مرور افتراضية، ولن يعمل السكربت بكلمة مرور ضعيفة أو فارغة.
 */
import "dotenv/config";
import { z } from "zod";
import { prisma } from "../src/server/db";
import { hashPassword } from "../src/server/auth";
import { normalizeEgyptianPhone } from "../src/lib/phone";

const WEAK_PASSWORDS = new Set([
  "password",
  "password123",
  "admin123",
  "admin1234",
  "12345678",
  "123456789",
  "qwerty123",
  "changeme",
  "letmein",
  "welcome123",
]);

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

function validatePassword(password: string): string | null {
  if (password.length < 12) return "كلمة المرور يجب أن تتكون من 12 حرفًا على الأقل";
  if (password.length > 200) return "كلمة المرور طويلة جدًا";
  if (WEAK_PASSWORDS.has(password.toLowerCase())) return "كلمة المرور شائعة جدًا وغير آمنة";
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
  if (classes < 3) {
    return "يجب أن تحتوي كلمة المرور على ثلاث فئات على الأقل: حروف صغيرة، حروف كبيرة، أرقام، رموز";
  }
  return null;
}

async function main() {
  const emailRaw = getArg("email") ?? process.env.ADMIN_EMAIL ?? "";
  const password = getArg("password") ?? process.env.ADMIN_PASSWORD ?? "";
  const name = (getArg("name") ?? process.env.ADMIN_NAME ?? "مدير المتجر").trim();
  const phoneRaw = getArg("phone") ?? process.env.ADMIN_PHONE ?? "";

  const emailResult = z.string().trim().toLowerCase().email("البريد الإلكتروني غير صحيح").safeParse(emailRaw);
  if (!emailResult.success) {
    console.error("خطأ: " + (emailResult.error.errors[0]?.message ?? "بريد إلكتروني غير صحيح"));
    console.error("مرّر --email أو اضبط ADMIN_EMAIL في ملف .env");
    process.exitCode = 1;
    return;
  }
  const email = emailResult.data;

  if (!password) {
    console.error("خطأ: كلمة المرور مطلوبة. مرّر --password أو اضبط ADMIN_PASSWORD في ملف .env");
    console.error("لا يوجد أي كلمة مرور افتراضية لأسباب أمنية.");
    process.exitCode = 1;
    return;
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    console.error("خطأ: " + passwordError);
    process.exitCode = 1;
    return;
  }

  if (name.length < 2 || name.length > 80) {
    console.error("خطأ: الاسم يجب أن يكون بين حرفين و80 حرفًا");
    process.exitCode = 1;
    return;
  }

  const phone = phoneRaw ? normalizeEgyptianPhone(phoneRaw) : null;
  if (phone && !/^01[0125]\d{8}$/.test(phone)) {
    console.error("خطأ: رقم الهاتف ليس رقمًا مصريًا صحيحًا (مثال: 01012345678)");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hashPassword(password);
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        name,
        phone,
        role: "ADMIN",
        isActive: true,
      },
    });
    // إنهاء الجلسات القديمة عند تغيير كلمة المرور.
    await prisma.session.deleteMany({ where: { userId: existing.id } });
    console.log(`تم تحديث حساب المدير: ${email}`);
    if (existing.role !== "ADMIN") console.log("تمت ترقية الحساب من عميل إلى مدير.");
  } else {
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone,
        role: "ADMIN",
        isActive: true,
      },
    });
    console.log(`تم إنشاء حساب المدير: ${created.email}`);
  }

  console.log("يمكنك الآن تسجيل الدخول من /login ثم الانتقال إلى /admin");
  console.log("تذكّر حذف ADMIN_PASSWORD من ملف .env بعد إنشاء الحساب، وعدم رفع ملف .env إلى المستودع.");
}

main()
  .catch((error) => {
    console.error("تعذر إنشاء حساب المدير:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
