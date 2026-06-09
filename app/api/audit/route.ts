import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import {
  AuditResult,
  AuditIssue,
  AuditRequest,
  AuditApiResponse,
  SpeedMetrics,
  SEOMetrics,
  ConversionMetrics,
  SEVERITY_DEDUCTIONS,
  Severity,
  IssueCategory,
} from "@/types/audit";

let issueCounter = 0;
function makeIssue(params: Omit<AuditIssue, "id" | "pointsDeducted">): AuditIssue {
  return {
    ...params,
    id: `issue-${++issueCounter}`,
    pointsDeducted: SEVERITY_DEDUCTIONS[params.severity],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

async function runCheerioAnalysis(html: string, url: string): Promise<{
  seo: SEOMetrics;
  conversionPartial: Partial<ConversionMetrics>;
  issues: AuditIssue[];
}> {
  const $: CheerioAPI = cheerio.load(html);
  const issues: AuditIssue[] = [];

  const title = $("title").first().text().trim() || null;
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() || null;
  const h1Tags = $("h1").map((_, el) => $(el).text().trim()).get();
  const canonicalUrl = $('link[rel="canonical"]').attr("href") || null;
  const robotsMeta = $('meta[name="robots"]').attr("content") || null;

  const openGraphTags: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr("property")!;
    const content = $(el).attr("content") || "";
    openGraphTags[prop] = content;
  });

  const allImages = $("img");
  const imagesWithoutAlt = allImages.filter((_, el) =>
    !$(el).attr("alt") || $(el).attr("alt")!.trim() === ""
  ).length;

  const structuredDataPresent = $('script[type="application/ld+json"]').length > 0;

  const seo: SEOMetrics = {
    title,
    titleLength: title?.length ?? 0,
    metaDescription,
    metaDescriptionLength: metaDescription?.length ?? 0,
    h1Tags,
    h1Count: h1Tags.length,
    canonicalUrl,
    robotsMeta,
    openGraphTags,
    structuredDataPresent,
    imagesWithoutAlt,
    totalImages: allImages.length,
  };

  if (!title) {
    issues.push(makeIssue({
      category: "seo", severity: "high",
      title: "Missing Page Title",
      description: "No <title> tag was found on this page.",
      recommendation: "Add a descriptive <title> tag between 50-60 characters.",
    }));
  } else if (title.length < 30 || title.length > 60) {
    issues.push(makeIssue({
      category: "seo", severity: "medium",
      title: "Suboptimal Title Length",
      description: `Title is ${title.length} characters. Optimal range is 50-60.`,
      recommendation: "Adjust title length to 50-60 characters for best CTR.",
      metadata: { titleLength: title.length },
    }));
  }

  if (!metaDescription) {
    issues.push(makeIssue({
      category: "seo", severity: "high",
      title: "Missing Meta Description",
      description: "No meta description tag was found.",
      recommendation: 'Add <meta name="description"> with 150-160 characters.',
    }));
  }

  if (h1Tags.length === 0) {
    issues.push(makeIssue({
      category: "seo", severity: "high",
      title: "Missing H1 Tag",
      description: "No <h1> heading was found on this page.",
      recommendation: "Add a single, keyword-rich <h1> tag.",
    }));
  } else if (h1Tags.length > 1) {
    issues.push(makeIssue({
      category: "seo", severity: "medium",
      title: "Multiple H1 Tags",
      description: `Found ${h1Tags.length} <h1> tags. Best practice is exactly one.`,
      recommendation: "Consolidate to a single <h1> tag.",
      metadata: { h1Count: h1Tags.length },
    }));
  }

  if (imagesWithoutAlt > 0) {
    issues.push(makeIssue({
      category: "seo", severity: "medium",
      title: "Images Missing Alt Text",
      description: `${imagesWithoutAlt} of ${allImages.length} images have no alt attribute.`,
      recommendation: "Add descriptive alt text to all images.",
      metadata: { imagesWithoutAlt, totalImages: allImages.length },
    }));
  }

  if (!canonicalUrl) {
    issues.push(makeIssue({
      category: "seo", severity: "medium",
      title: "Missing Canonical URL",
      description: "No canonical link tag found.",
      recommendation: 'Add <link rel="canonical" href="..."> to prevent duplicate content.',
    }));
  }

  if (Object.keys(openGraphTags).length === 0) {
    issues.push(makeIssue({
      category: "seo", severity: "medium",
      title: "Missing Open Graph Tags",
      description: "No Open Graph meta tags detected.",
      recommendation: "Add og:title, og:description, og:image for social sharing.",
    }));
  }

  const hasViewportMeta = $('meta[name="viewport"]').length > 0;
  const ctaKeywords = ["add to cart", "buy now", "shop now", "get started", "order now", "checkout"];
  const ctaButtonCount = $("button, a").filter((_, el) => {
    const text = $(el).text().toLowerCase();
    return ctaKeywords.some((kw) => text.includes(kw));
  }).length;

  const formCount = $("form").length;
  const hasAddToCart = $('[class*="add-to-cart"], [id*="add-to-cart"]').length > 0;
  const hasPriceDisplay = $('[class*="price"], [id*="price"]').length > 0;
  const hasReviews = $('[class*="review"], [class*="rating"]').length > 0;
  const hasSocialProof = hasReviews || $('[class*="testimonial"]').length > 0;

  const conversionPartial: Partial<ConversionMetrics> = {
    hasViewportMeta, ctaButtonCount, formCount,
    hasAddToCart, hasPriceDisplay, hasReviews, hasSocialProof,
  };

  if (!hasViewportMeta) {
    issues.push(makeIssue({
      category: "conversion", severity: "critical",
      title: "Missing Viewport Meta Tag",
      description: "No <meta name='viewport'> found. Mobile users will see a broken layout.",
      recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
    }));
  }

  if (ctaButtonCount === 0) {
    issues.push(makeIssue({
      category: "conversion", severity: "critical",
      title: "No Call-to-Action Detected",
      description: 'No CTA buttons found like "Add to Cart" or "Buy Now".',
      recommendation: "Add clear, prominent CTA buttons to drive conversions.",
    }));
  }

  if (!hasPriceDisplay) {
    issues.push(makeIssue({
      category: "conversion", severity: "high",
      title: "No Visible Price Display",
      description: "Could not detect price elements on this page.",
      recommendation: "Ensure pricing is clearly visible to reduce friction.",
    }));
  }

  if (!hasReviews) {
    issues.push(makeIssue({
      category: "conversion", severity: "medium",
      title: "No Customer Reviews Detected",
      description: "No review or rating elements were found.",
      recommendation: "Add star ratings and customer reviews for social proof.",
    }));
  }

  return { seo, conversionPartial, issues };
}

function runSpeedAnalysis(html: string, loadTimeMs: number, ttfbMs: number): {
  speed: SpeedMetrics;
  issues: AuditIssue[];
} {
  const $ = cheerio.load(html);
  const issues: AuditIssue[] = [];
  const scriptCount = $("script[src]").length;
  const stylesheetCount = $('link[rel="stylesheet"]').length;
  const totalPageSizeKb = Math.round(Buffer.byteLength(html, "utf8") / 1024);

  const largeImages: Array<{ src: string; sizeKb: number }> = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    const hasWidth = $(el).attr("width");
    const hasHeight = $(el).attr("height");
    if (!hasWidth || !hasHeight) largeImages.push({ src, sizeKb: 0 });
  });

  const speed: SpeedMetrics = {
    loadTimeMs, ttfbMs,
    largeImages: largeImages.slice(0, 10),
    totalPageSizeKb, scriptCount, stylesheetCount,
  };

  if (loadTimeMs > 3000) {
    issues.push(makeIssue({
      category: "speed", severity: "high",
      title: "Slow Page Load Time",
      description: `Page took ${(loadTimeMs / 1000).toFixed(2)}s to load. Target: under 3s.`,
      recommendation: "Optimize images, enable caching, reduce render-blocking resources.",
      metadata: { loadTimeMs },
    }));
  } else if (loadTimeMs > 1500) {
    issues.push(makeIssue({
      category: "speed", severity: "medium",
      title: "Moderate Page Load Time",
      description: `Page loaded in ${(loadTimeMs / 1000).toFixed(2)}s. Aim for under 1.5s.`,
      recommendation: "Consider lazy loading, CDN usage, and image compression.",
      metadata: { loadTimeMs },
    }));
  }

  if (ttfbMs > 600) {
    issues.push(makeIssue({
      category: "speed", severity: "medium",
      title: "High Time To First Byte (TTFB)",
      description: `TTFB is ${ttfbMs}ms. Target: under 200ms.`,
      recommendation: "Improve server response time or use a CDN.",
      metadata: { ttfbMs },
    }));
  }

  if (scriptCount > 10) {
    issues.push(makeIssue({
      category: "speed", severity: "medium",
      title: "Excessive JavaScript Files",
      description: `Found ${scriptCount} external script tags.`,
      recommendation: "Bundle and minify JavaScript. Remove unused third-party scripts.",
      metadata: { scriptCount },
    }));
  }

  if (largeImages.length > 5) {
    issues.push(makeIssue({
      category: "speed", severity: "high",
      title: "Images Missing Explicit Dimensions",
      description: `${largeImages.length} images have no explicit width/height.`,
      recommendation: "Add width/height attributes to all images.",
      metadata: { imageCount: largeImages.length },
    }));
  }

  return { speed, issues };
}

async function runFetchAnalysis(url: string): Promise<{
  loadTimeMs: number; ttfbMs: number; html: string;
}> {
  const start = Date.now();
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; StoreAuditBot/1.0)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = await res.text();
  const loadTimeMs = Date.now() - start;
  return { loadTimeMs, ttfbMs: 0, html };
}

function calculateScore(issues: AuditIssue[]): { score: number; totalDeductions: number } {
  const totalDeductions = issues.reduce((sum, issue) => sum + issue.pointsDeducted, 0);
  return { score: clamp(100 - totalDeductions, 0, 100), totalDeductions };
}

export async function POST(req: NextRequest): Promise<NextResponse<AuditApiResponse>> {
  issueCounter = 0;
  let body: AuditRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ success: false, error: "url is required." }, { status: 400 });
  }

  let normalizedUrl = url.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;

  try {
    new URL(normalizedUrl);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid URL provided." }, { status: 400 });
  }

  try {
    const { html, loadTimeMs, ttfbMs } = await runFetchAnalysis(normalizedUrl);
    const { seo, conversionPartial, issues: cheerioIssues } = await runCheerioAnalysis(html, normalizedUrl);
    const { speed, issues: speedIssues } = runSpeedAnalysis(html, loadTimeMs, ttfbMs);

    const conversion: ConversionMetrics = {
      hasViewportMeta: conversionPartial.hasViewportMeta ?? false,
      ctaButtonCount: conversionPartial.ctaButtonCount ?? 0,
      formCount: conversionPartial.formCount ?? 0,
      hasAddToCart: conversionPartial.hasAddToCart ?? false,
      hasPriceDisplay: conversionPartial.hasPriceDisplay ?? false,
      hasReviews: conversionPartial.hasReviews ?? false,
      hasSocialProof: conversionPartial.hasSocialProof ?? false,
      mobileScore: null,
    };

    const allIssues = [...cheerioIssues, ...speedIssues];
    const { score, totalDeductions } = calculateScore(allIssues);

    const groupBy = <T extends AuditIssue>(arr: T[], key: keyof T): Record<string, T[]> =>
      arr.reduce((acc, item) => {
        const k = String(item[key]);
        acc[k] = [...(acc[k] || []), item];
        return acc;
      }, {} as Record<string, T[]>);

    const byCategory = groupBy(allIssues, "category");
    const bySeverity = groupBy(allIssues, "severity");

    const result: AuditResult = {
      url: normalizedUrl,
      auditedAt: new Date().toISOString(),
      healthScore: score,
      issues: allIssues,
      speed, seo, conversion,
      issuesByCategory: {
        speed: byCategory["speed"] || [],
        seo: byCategory["seo"] || [],
        conversion: byCategory["conversion"] || [],
      },
      issuesBySeverity: {
        critical: bySeverity["critical"] || [],
        high: bySeverity["high"] || [],
        medium: bySeverity["medium"] || [],
        info: bySeverity["info"] || [],
      },
      totalDeductions,
      summary: `Found ${allIssues.length} issues (${bySeverity["critical"]?.length ?? 0} critical, ${bySeverity["high"]?.length ?? 0} high, ${bySeverity["medium"]?.length ?? 0} medium).`,
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: `Audit failed: ${message}` }, { status: 500 });
  }
}