import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomToken } from "@/lib/utils";

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const MAX_BYTES = 5 * 1024 * 1024;

/** التحقق من التوقيع الحقيقي للملف وليس Content-Type فقط. */
function sniffImageExtension(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  if (buffer.subarray(4, 12).toString("ascii").startsWith("ftypavif")) return "avif";
  return null;
}

function isS3Configured(): boolean {
  return (
    process.env.STORAGE_DRIVER === "s3" &&
    Boolean(process.env.S3_BUCKET) &&
    Boolean(process.env.S3_REGION) &&
    Boolean(process.env.S3_ACCESS_KEY_ID) &&
    Boolean(process.env.S3_SECRET_ACCESS_KEY)
  );
}

async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  const base = (process.env.S3_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  if (base) return `${base}/${key}`;
  if (process.env.S3_ENDPOINT) {
    return `${process.env.S3_ENDPOINT.replace(/\/$/, "")}/${process.env.S3_BUCKET}/${key}`;
  }
  return `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
}

export async function saveImage(file: File, folder = "products"): Promise<{ url: string; key: string }> {
  if (!file || file.size === 0) throw new StorageError("الملف فارغ");
  if (file.size > MAX_BYTES) throw new StorageError("حجم الصورة يجب ألا يتجاوز 5 ميجابايت");

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageExtension(buffer);
  const declared = ALLOWED_TYPES[file.type];
  if (!sniffed || !declared || sniffed !== declared) {
    throw new StorageError("صيغة الصورة غير مدعومة. المسموح: JPG أو PNG أو WebP أو AVIF");
  }

  const filename = `${randomToken(16)}.${sniffed}`;
  const key = `${folder}/${filename}`;

  if (isS3Configured()) {
    const url = await uploadToS3(buffer, key, file.type);
    return { url, key };
  }

  const cleanFolder = folder.replace(/[^a-z0-9-]/gi, "");
  const directory = path.join(process.cwd(), "public", "uploads", cleanFolder);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), buffer);
  return { url: `/uploads/${cleanFolder}/${filename}`, key };
}

/** حذف صورة محلية فقط — صور S3 تُدار من دورة حياة الـ bucket. */
export async function deleteLocalImage(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return;
  const relative = url.replace(/^\/uploads\//, "").replace(/\.\./g, "");
  const filePath = path.join(process.cwd(), "public", "uploads", relative);
  try {
    await unlink(filePath);
  } catch {
    // الملف قد يكون محذوفًا مسبقًا
  }
}

export { MAX_BYTES, ALLOWED_TYPES, sniffImageExtension };
