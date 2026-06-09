
// ============================================================
// types/audit.ts — Core TypeScript interfaces for Audit Tool
// ============================================================

export type Severity = "critical" | "high" | "medium" | "info";
export type IssueCategory = "speed" | "seo" | "conversion";

export interface AuditIssue {
  id: string;
  category: IssueCategory;
  severity: Severity;
  title: string;
  description: string;
  recommendation: string;
  pointsDeducted: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface SpeedMetrics {
  loadTimeMs: number;
  ttfbMs: number;
  largeImages: Array<{ src: string; sizeKb: number }>;
  totalPageSizeKb: number;
  scriptCount: number;
  stylesheetCount: number;
}

export interface SEOMetrics {
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  h1Tags: string[];
  h1Count: number;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  openGraphTags: Record<string, string>;
  structuredDataPresent: boolean;
  imagesWithoutAlt: number;
  totalImages: number;
}

export interface ConversionMetrics {
  hasViewportMeta: boolean;
  ctaButtonCount: number;
  formCount: number;
  hasAddToCart: boolean;
  hasPriceDisplay: boolean;
  hasReviews: boolean;
  mobileScore: number | null; // Lighthouse-style 0–100
  hasSocialProof: boolean;
}

export interface AuditResult {
  url: string;
  auditedAt: string; // ISO timestamp
  healthScore: number; // 0–100, starts at 100
  issues: AuditIssue[];
  speed: SpeedMetrics;
  seo: SEOMetrics;
  conversion: ConversionMetrics;
  issuesByCategory: {
    speed: AuditIssue[];
    seo: AuditIssue[];
    conversion: AuditIssue[];
  };
  issuesBySeverity: {
    critical: AuditIssue[];
    high: AuditIssue[];
    medium: AuditIssue[];
    info: AuditIssue[];
  };
  totalDeductions: number;
  summary: string;
}

export interface AuditRequest {
  url: string;
  includePuppeteer?: boolean; // set false to skip headless browser (faster)
}

export interface AuditApiResponse {
  success: boolean;
  data?: AuditResult;
  error?: string;
}

// Score band helpers
export type ScoreBand = "excellent" | "good" | "needs-work" | "critical";

export function getScoreBand(score: number): ScoreBand {
  if (score >= 85) return "excellent";
  if (score >= 65) return "good";
  if (score >= 40) return "needs-work";
  return "critical";
}

export function getScoreBandLabel(band: ScoreBand): string {
  return {
    excellent: "Excellent",
    good: "Good",
    "needs-work": "Needs Work",
    critical: "Critical",
  }[band];
}

// Deduction weights
export const SEVERITY_DEDUCTIONS: Record<Severity, number> = {
  critical: 20,
  high: 10,
  medium: 5,
  info: 0,
};