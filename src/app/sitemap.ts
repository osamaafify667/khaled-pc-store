import type { MetadataRoute } from "next";
import { prisma } from "@/server/db";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const POLICY_SLUGS = ["warranty", "exchange", "returns", "shipping", "privacy", "terms"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/shop"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/prebuilt"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/builder"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/contact"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/track"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const policyPages: MetadataRoute.Sitemap = POLICY_SLUGS.map((slug) => ({
    url: absoluteUrl(`/policies/${slug}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.3,
  }));

  return [
    ...staticPages,
    ...policyPages,
    ...categories.map((category) => ({
      url: absoluteUrl(`/category/${category.slug}`),
      lastModified: category.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: absoluteUrl(`/product/${product.slug}`),
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
