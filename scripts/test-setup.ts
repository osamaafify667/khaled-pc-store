/**
 * تهيئة قاعدة بيانات الاختبارات.
 *
 * يحذف كل بيانات قاعدة الاختبار ويعيد تطبيق الترحيلات (migrate reset).
 * لا يعمل أبدًا على DATABASE_URL نفسه، ويرفض أي قاعدة لا يظهر في اسمها "test".
 *
 * الاستخدام:
 *   npm run test:setup
 */
import "dotenv/config";
import { execSync } from "node:child_process";

function fail(message: string): never {
  console.error("خطأ: " + message);
  process.exit(1);
}

const testUrl = process.env.TEST_DATABASE_URL?.trim();
if (!testUrl) fail("TEST_DATABASE_URL غير موجود في ملف .env");

if (testUrl === process.env.DATABASE_URL) {
  fail("TEST_DATABASE_URL لا يمكن أن يساوي DATABASE_URL. لن نلمس قاعدة بيانات التطوير أو الإنتاج.");
}

const dbName = (() => {
  try {
    return new URL(testUrl).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
})();

if (!/test/i.test(dbName) && process.env.ALLOW_DESTRUCTIVE_TEST_DB !== "1") {
  fail(
    `قاعدة الاختبار «${dbName}» لا تحتوي على كلمة test في اسمها. ` +
      "عدّل TEST_DATABASE_URL، أو اضبط ALLOW_DESTRUCTIVE_TEST_DB=1 إذا كنت متأكدًا.",
  );
}

console.log(`إعادة تهيئة قاعدة الاختبار: ${dbName}`);
try {
  execSync("npx prisma migrate reset --force --skip-seed", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testUrl },
  });
  console.log("تمت تهيئة قاعدة الاختبار بنجاح.");
} catch (error) {
  console.error("تعذرت تهيئة قاعدة الاختبار:", error instanceof Error ? error.message : error);
  console.error("تأكد من أن خادم PostgreSQL يعمل وأن قاعدة البيانات موجودة.");
  process.exit(1);
}
