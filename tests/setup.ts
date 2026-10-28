import { config as loadEnv } from "dotenv";

loadEnv();

const testUrl = process.env.TEST_DATABASE_URL?.trim();

if (!testUrl) {
  throw new Error("TEST_DATABASE_URL غير موجود. الاختبارات تحتاج قاعدة بيانات منفصلة.");
}

if (testUrl === process.env.DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL يساوي DATABASE_URL. تم إيقاف الاختبارات لحماية بيانات التطوير/الإنتاج.");
}

// يجب ضبط الرابط قبل تحميل PrismaClient في أي ملف اختبار.
process.env.DATABASE_URL = testUrl;
(process.env as Record<string, string | undefined>).NODE_ENV = "test";
process.env.AUTH_MAX_LOGIN_ATTEMPTS = "3";
process.env.AUTH_LOCK_MINUTES = "1";
process.env.AUTH_SESSION_DAYS = "1";
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
