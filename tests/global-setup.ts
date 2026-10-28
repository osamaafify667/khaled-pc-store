import { execSync } from "node:child_process";
import { config as loadEnv } from "dotenv";

/**
 * يُشغَّل مرة واحدة قبل كل جلسة اختبار.
 * يعيد قاعدة الاختبار إلى حالة نظيفة ويطبّق كل الترحيلات.
 */
export default function globalSetup() {
  loadEnv();

  const testUrl = process.env.TEST_DATABASE_URL?.trim();
  if (!testUrl) {
    throw new Error("TEST_DATABASE_URL غير موجود. انسخ .env.example إلى .env واضبط قاعدة الاختبار.");
  }
  if (testUrl === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL يساوي DATABASE_URL. تم إيقاف الاختبارات لحماية بيانات التطوير/الإنتاج.");
  }

  const dbName = (() => {
    try {
      return new URL(testUrl).pathname.replace(/^\//, "");
    } catch {
      return "";
    }
  })();

  if (!/test/i.test(dbName) && process.env.ALLOW_DESTRUCTIVE_TEST_DB !== "1") {
    throw new Error(
      `قاعدة الاختبار «${dbName}» لا تحتوي على كلمة test. عدّل TEST_DATABASE_URL أو اضبط ALLOW_DESTRUCTIVE_TEST_DB=1.`,
    );
  }

  execSync("npx prisma migrate reset --force --skip-seed", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: testUrl },
  });
}
