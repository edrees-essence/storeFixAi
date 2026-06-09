
"use client";

import { useState, useCallback, useEffect } from "react";
import type { AuditResult, AuditIssue, ScoreBand, IssueCategory, Severity } from "@/types/audit";
import { getScoreBand } from "@/types/audit";
import { supabase } from "@/lib/supabase";

const NEGATIVE_EFFECTS: Record<string, string> = {
  "Missing Page Title": "Search engines won't know what your page is about — killing your ranking potential completely.",
  "Missing Meta Description": "No preview text in Google results means lower click-through rates — losing free traffic daily.",
  "Missing H1 Tag": "Google can't identify your main topic — your page gets outranked by weaker competitors.",
  "Multiple H1 Tags": "Confuses search engine crawlers — dilutes your SEO authority across the page.",
  "Images Missing Alt Text": "Invisible to search engines and screen readers — missing image search traffic.",
  "Missing Canonical URL": "Google may index duplicate versions of your page — splitting your ranking power.",
  "Missing Open Graph Tags": "Your links look broken when shared on social media — killing referral traffic.",
  "No Call-to-Action Detected": "Visitors have nowhere to go — they leave without buying.",
  "Missing Viewport Meta Tag": "Your site looks broken on mobile — 60%+ of traffic is mobile.",
  "No Visible Price Display": "Customers can't see prices — they leave to find a competitor.",
  "No Customer Reviews Detected": "No social proof means low trust — customers won't buy.",
  "Slow Page Load Time": "Every extra second costs 7% in conversions — slow sites bleed money.",
  "Moderate Page Load Time": "Slower than competitors means higher bounce rate.",
  "High Time To First Byte (TTFB)": "Slow server response frustrates users before they even see your page.",
  "Excessive JavaScript Files": "Too many scripts block page rendering — site feels sluggish.",
  "Images Missing Explicit Dimensions": "Causes layout shift as page loads — kills conversions.",
  "Poor Mobile Experience Score": "More than half your visitors see a broken site.",
};

const BUSINESS_IMPACT: Record<string, string> = {
  "Missing Page Title": "Fixing this alone can increase organic traffic by 20-30% within 3 months.",
  "Missing Meta Description": "Good meta descriptions improve CTR by up to 5.8% — more clicks, zero ad spend.",
  "Missing H1 Tag": "Proper H1 structure is a top-3 on-page SEO factor — directly impacts ranking.",
  "No Call-to-Action Detected": "A clear CTA can increase conversions by 120%. Highest ROI fix.",
  "Missing Viewport Meta Tag": "Mobile-friendly sites rank higher and convert better.",
  "Slow Page Load Time": "1 second improvement = 7% more conversions.",
  "No Customer Reviews Detected": "Adding reviews increases conversion rates by 270%.",
  "Missing Open Graph Tags": "Proper OG tags can double social media referral traffic.",
  "Images Missing Alt Text": "Alt text drives significant image search traffic — free visitors.",
  "Poor Mobile Experience Score": "Mobile-optimized stores see 40% higher conversion rates.",
  "No Visible Price Display": "Showing prices clearly reduces cart abandonment by 20-35%.",
};

const REVENUE_IMPACT: Record<string, string> = {
  "Missing Page Title": "~15-25% potential organic traffic increase",
  "No Call-to-Action Detected": "~30-120% potential conversion rate increase",
  "Missing Viewport Meta Tag": "~40-60% of mobile visitors currently lost",
  "Slow Page Load Time": "~7% conversion loss per extra second",
  "No Customer Reviews Detected": "~270% conversion increase possible with reviews",
  "Missing Meta Description": "~5-8% CTR improvement possible",
  "Poor Mobile Experience Score": "~40% revenue uplift from mobile optimization",
  "No Visible Price Display": "~20-35% cart abandonment reduction possible",
};

async function exportPDF(result: AuditResult, filename: string, isPro: boolean) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = 20;
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, 297, "F");
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pageWidth, 38, "F");
  pdf.setTextColor(212, 175, 55);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("STOREFIX AUDIT REPORT", 20, 14);
  pdf.setFontSize(8);
  pdf.setTextColor(180, 180, 180);
  pdf.text(`${result.url}`, 20, 22);
  pdf.text(`Audited: ${new Date(result.auditedAt).toLocaleString()}`, 20, 28);
  if (!isPro) {
    pdf.setTextColor(212, 175, 55);
    pdf.text("FREE REPORT — Upgrade to Pro for full fix instructions", 20, 34);
  }
  y = 48;
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(36);
  pdf.setFont("helvetica", "bold");
  pdf.text(`${result.healthScore}/100`, 20, y);
  pdf.setFontSize(12);
  pdf.setTextColor(80, 80, 80);
  pdf.text(result.healthScore >= 85 ? "EXCELLENT" : result.healthScore >= 65 ? "GOOD" : result.healthScore >= 40 ? "NEEDS WORK" : "CRITICAL", 65, y - 4);
  y += 6;
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(result.summary, 20, y);
  y += 10;
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(20, y, pageWidth - 20, y);
  y += 8;
  const colors: Record<string, [number, number, number]> = {
    critical: [220, 38, 38], high: [234, 88, 12], medium: [161, 98, 7], info: [2, 132, 199],
  };
  for (const issue of result.issues.sort((a, b) => b.pointsDeducted - a.pointsDeducted)) {
    if (y > 250) { pdf.addPage(); y = 20; pdf.setFillColor(255, 255, 255); pdf.rect(0, 0, pageWidth, 297, "F"); }
    const [r, g, b] = colors[issue.severity];
    pdf.setFillColor(r, g, b);
    pdf.rect(20, y - 2, 3, isPro ? 18 : 12, "F");
    pdf.setFontSize(7); pdf.setTextColor(r, g, b); pdf.setFont("helvetica", "bold");
    pdf.text(`${issue.severity.toUpperCase()}  -${issue.pointsDeducted}pts  [${issue.category.toUpperCase()}]`, 25, y + 1);
    y += 5;
    pdf.setTextColor(15, 23, 42); pdf.setFontSize(10);
    pdf.text(issue.title, 25, y + 1);
    y += 6;
    pdf.setTextColor(80, 80, 80); pdf.setFontSize(8); pdf.setFont("helvetica", "normal");
    const descLines = pdf.splitTextToSize(issue.description, pageWidth - 50);
    pdf.text(descLines, 25, y);
    y += descLines.length * 4 + 2;
    if (isPro) {
      if (NEGATIVE_EFFECTS[issue.title]) {
        pdf.setTextColor(180, 30, 30); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
        pdf.text("NEGATIVE EFFECT:", 25, y); y += 4;
        pdf.setFont("helvetica", "normal");
        const nl = pdf.splitTextToSize(NEGATIVE_EFFECTS[issue.title], pageWidth - 50);
        pdf.text(nl, 25, y); y += nl.length * 4 + 2;
      }
      if (BUSINESS_IMPACT[issue.title]) {
        pdf.setTextColor(120, 80, 0); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
        pdf.text("BUSINESS IMPACT:", 25, y); y += 4;
        pdf.setFont("helvetica", "normal"); pdf.setTextColor(100, 60, 0);
        const bl = pdf.splitTextToSize(BUSINESS_IMPACT[issue.title], pageWidth - 50);
        pdf.text(bl, 25, y); y += bl.length * 4 + 2;
      }
      if (REVENUE_IMPACT[issue.title]) {
        pdf.setTextColor(20, 120, 60); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
        pdf.text("REVENUE IMPACT:", 25, y); y += 4;
        pdf.setFont("helvetica", "normal");
        const rl = pdf.splitTextToSize(REVENUE_IMPACT[issue.title], pageWidth - 50);
        pdf.text(rl, 25, y); y += rl.length * 4 + 2;
      }
      pdf.setTextColor(20, 100, 40); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
      pdf.text("HOW TO FIX:", 25, y); y += 4;
      pdf.setFont("helvetica", "normal");
      const fl = pdf.splitTextToSize(issue.recommendation, pageWidth - 50);
      pdf.text(fl, 25, y); y += fl.length * 4 + 4;
    } else {
      pdf.setFillColor(240, 240, 240); pdf.rect(25, y, pageWidth - 50, 8, "F");
      pdf.setTextColor(150, 150, 150); pdf.setFontSize(7); pdf.setFont("helvetica", "italic");
      pdf.text("Upgrade to Pro to see fix instructions, business impact & revenue data", 27, y + 5);
      y += 12;
    }
    pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.2);
    pdf.line(20, y, pageWidth - 20, y); y += 5;
  }
  if (!isPro) {
    pdf.addPage();
    pdf.setFillColor(15, 23, 42); pdf.rect(0, 0, pageWidth, 297, "F");
    pdf.setTextColor(212, 175, 55); pdf.setFontSize(22); pdf.setFont("helvetica", "bold");
    pdf.text("Unlock Full Report", 20, 60);
    pdf.setFontSize(12); pdf.setTextColor(255, 255, 255);
    pdf.text("Upgrade to StoreFix Pro to get:", 20, 75);
    ["Step-by-step fix instructions", "Business impact analysis", "Revenue impact data", "Unlimited audits", "White-label PDF reports", "Priority support"].forEach((f, i) => {
      pdf.setTextColor(180, 180, 180); pdf.setFontSize(10);
      pdf.text(`✓ ${f}`, 20, 90 + i * 12);
    });
  }
  pdf.save(filename);
}

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string; border: string; dot: string }> = {
  critical: { label: "CRITICAL", color: "text-red-400", bg: "bg-red-950/30", border: "border-red-700/50", dot: "bg-red-500" },
  high: { label: "HIGH", color: "text-orange-400", bg: "bg-orange-950/30", border: "border-orange-700/50", dot: "bg-orange-500" },
  medium: { label: "MEDIUM", color: "text-amber-400", bg: "bg-amber-950/20", border: "border-amber-700/40", dot: "bg-amber-500" },
  info: { label: "INFO", color: "text-sky-400", bg: "bg-sky-950/20", border: "border-sky-700/40", dot: "bg-sky-500" },
};

function ScoreRing({ score, band }: { score: number; band: ScoreBand }) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const gap = circumference - filled;
  const bandColors: Record<ScoreBand, string> = { excellent: "#22c55e", good: "#3b82f6", "needs-work": "#d4af37", critical: "#ef4444" };
  const color = bandColors[band];
  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      <svg width={200} height={200} viewBox="0 0 200 200" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={100} cy={100} r={radius} fill="none" stroke="rgba(212,175,55,0.08)" strokeWidth={14} />
        <circle cx={100} cy={100} r={radius} fill="none" stroke={color} strokeWidth={14}
          strokeDasharray={`${filled} ${gap}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 12px ${color})`, transition: "stroke-dasharray 1.4s cubic-bezier(0.4,0,0.2,1)" }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono font-black text-5xl leading-none" style={{ color, textShadow: `0 0 30px ${color}80` }}>{score}</span>
        <span className="font-mono text-xs tracking-widest mt-1" style={{ color: "rgba(212,175,55,0.4)" }}>/100</span>
      </div>
    </div>
  );
}

function IssueCard({ issue, isPro }: { issue: AuditIssue; isPro: boolean }) {
  const [open, setOpen] = useState(false);
  const cfg = SEVERITY_CONFIG[issue.severity];
  return (
    <div onClick={() => setOpen(!open)} className={`w-full text-left rounded-lg border ${cfg.border} ${cfg.bg} px-5 py-4 transition-all duration-200 hover:brightness-110 cursor-pointer`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-mono text-[10px] font-black tracking-widest ${cfg.color}`}>{cfg.label}</span>
            <span className="font-mono text-[10px] text-white/30">-{issue.pointsDeducted} pts</span>
            <span className="font-mono text-[10px] text-white/20 uppercase">[{issue.category}]</span>
          </div>
          <p className="text-sm font-semibold mt-1 leading-snug text-white/90">{issue.title}</p>
          {open && (
            <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
              <div className="rounded-md p-3 bg-white/[0.03] border border-white/[0.06]">
                <p className="font-mono text-[10px] tracking-widest text-white/30 mb-1">ISSUE DETECTED</p>
                <p className="text-xs text-white/60 leading-relaxed">{issue.description}</p>
              </div>
              {NEGATIVE_EFFECTS[issue.title] && (
                <div className="rounded-md p-3 bg-red-950/20 border border-red-700/20">
                  <p className="font-mono text-[10px] tracking-widest text-red-400/70 mb-1">NEGATIVE EFFECT IF IGNORED</p>
                  <p className="text-xs text-red-300/80 leading-relaxed">{NEGATIVE_EFFECTS[issue.title]}</p>
                </div>
              )}
              {isPro ? (
                <>
                  {BUSINESS_IMPACT[issue.title] && (
                    <div className="rounded-md p-3 border" style={{ background: "rgba(212,175,55,0.05)", borderColor: "rgba(212,175,55,0.15)" }}>
                      <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: "rgba(212,175,55,0.6)" }}>BUSINESS IMPACT</p>
                      <p className="text-xs leading-relaxed" style={{ color: "rgba(212,175,55,0.75)" }}>{BUSINESS_IMPACT[issue.title]}</p>
                    </div>
                  )}
                  {REVENUE_IMPACT[issue.title] && (
                    <div className="rounded-md p-3 bg-green-950/20 border border-green-700/20">
                      <p className="font-mono text-[10px] tracking-widest text-green-400/60 mb-1">REVENUE IMPACT</p>
                      <p className="text-xs text-green-300/75 leading-relaxed">{REVENUE_IMPACT[issue.title]}</p>
                    </div>
                  )}
                  <div className="rounded-md p-3 bg-green-950/10 border border-green-700/15">
                    <p className="font-mono text-[10px] tracking-widest text-green-400/60 mb-1">HOW TO FIX</p>
                    <p className="text-xs text-green-300/70 leading-relaxed">{issue.recommendation}</p>
                  </div>
                </>
              ) : (
                <div className="rounded-md p-4 border text-center" style={{ borderColor: "rgba(212,175,55,0.3)", background: "rgba(212,175,55,0.05)" }}>
                  <p className="font-mono text-xs font-bold mb-1" style={{ color: "#d4af37" }}>🔒 Pro Feature</p>
                  <p className="font-mono text-[11px] text-white/40 mb-3">Upgrade to see fix instructions, business impact and revenue data</p>
                  <div onClick={(e) => e.stopPropagation()} className="inline-block font-mono text-xs px-4 py-2 rounded font-bold cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #d4af37, #b8960c)", color: "#080c14" }}>
                    UPGRADE TO PRO
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <span className="text-sm flex-shrink-0 text-white/20">{open ? "▲" : "▼"}</span>
      </div>
    </div>
  );
}

const CATEGORY_ICONS: Record<IssueCategory, string> = { speed: "⚡", seo: "🔍", conversion: "🎯" };
const CATEGORY_LABELS: Record<IssueCategory, string> = { speed: "Performance", seo: "SEO", conversion: "Conversion" };

function CategoryTab({ category, issues, active, onClick }: { category: IssueCategory; issues: AuditIssue[]; active: boolean; onClick: () => void }) {
  const critCount = issues.filter((i) => i.severity === "critical").length;
  const highCount = issues.filter((i) => i.severity === "high").length;
  return (
    <button onClick={onClick} className="flex-1 rounded-lg border p-3 text-left transition-all duration-200"
      style={{ borderColor: active ? "rgba(212,175,55,0.6)" : "rgba(255,255,255,0.08)", background: active ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{CATEGORY_ICONS[category]}</span>
        <div>
          <p className="font-mono text-xs font-bold tracking-wide" style={{ color: active ? "#d4af37" : "rgba(255,255,255,0.6)" }}>{CATEGORY_LABELS[category]}</p>
          <p className="font-mono text-[10px] text-white/30">{issues.length} issue{issues.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
      {(critCount > 0 || highCount > 0) && (
        <div className="flex gap-1 mt-2">
          {critCount > 0 && <span className="text-[9px] font-mono bg-red-900/60 text-red-400 px-1.5 py-0.5 rounded">{critCount} CRIT</span>}
          {highCount > 0 && <span className="text-[9px] font-mono bg-orange-900/60 text-orange-400 px-1.5 py-0.5 rounded">{highCount} HIGH</span>}
        </div>
      )}
    </button>
  );
}

function MetricTile({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: warn ? "rgba(249,115,22,0.4)" : "rgba(212,175,55,0.15)", background: warn ? "rgba(249,115,22,0.06)" : "rgba(212,175,55,0.03)" }}>
      <p className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "rgba(212,175,55,0.4)" }}>{label}</p>
      <p className={`font-mono text-xl font-bold mt-0.5 ${warn ? "text-orange-400" : "text-white"}`}>{value}</p>
      {sub && <p className="font-mono text-[10px] text-white/25 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AuditPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<IssueCategory>("seo");
  const [exportingPDF, setExportingPDF] = useState(false);
  const [auditCount, setAuditCount] = useState(0);
  const [userEmail, setUserEmail] = useState("");
  const [isPro] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setUserEmail(user.email || "");
      const { data } = await supabase.from("audit_usage").select("audit_count").eq("user_id", user.id).single();
      setAuditCount(data?.audit_count || 0);
      setAuthChecked(true);
    };
    getUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const runAudit = useCallback(async () => {
    if (!url.trim()) return;
    if (auditCount >= 3) {
      setError("You have used all 3 free audits. Upgrade to Pro for unlimited audits.");
      return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Audit failed");
      setResult(data.data);
      setActiveCategory("seo");
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const newCount = auditCount + 1;
        await supabase.from("audit_usage").upsert({ user_id: user.id, audit_count: newCount, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
        setAuditCount(newCount);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [url, auditCount]);

  const handlePDF = async () => {
    if (!result) return;
    setExportingPDF(true);
    try {
      const domain = new URL(result.url).hostname.replace("www.", "");
      await exportPDF(result, `storefix-audit-${domain}-${Date.now()}.pdf`, isPro);
    } finally {
      setExportingPDF(false);
    }
  };

  if (!authChecked) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #080c14 0%, #0a0d18 40%, #0d1020 100%)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500/40 border-t-amber-500 animate-spin" />
          <p className="font-mono text-xs text-amber-500/50">LOADING...</p>
        </div>
      </main>
    );
  }

  const band = result ? getScoreBand(result.healthScore) : null;
  const bandLabel: Record<ScoreBand, string> = { excellent: "EXCELLENT", good: "GOOD", "needs-work": "NEEDS WORK", critical: "CRITICAL" };
  const bandColors: Record<ScoreBand, string> = { excellent: "text-green-400", good: "text-blue-400", "needs-work": "text-yellow-400", critical: "text-red-400" };
  const auditsLeft = Math.max(0, 3 - auditCount);

  return (
    <main className="min-h-screen text-white" style={{ background: "linear-gradient(135deg, #080c14 0%, #0a0d18 40%, #0d1020 100%)" }}>
      <div className="pointer-events-none fixed inset-0 opacity-[0.015]"
        style={{ backgroundImage: "linear-gradient(rgba(212,175,55,1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,1) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

      <nav className="border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50"
        style={{ borderColor: "rgba(212,175,55,0.15)", background: "rgba(8,12,20,0.95)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-mono font-black text-lg" style={{ color: "#d4af37" }}>STORE<span className="text-white">FIX</span></span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full" style={{ background: i < auditCount ? "rgba(212,175,55,0.3)" : "#d4af37" }} />
            ))}
            <span className="font-mono text-[10px] ml-2" style={{ color: "rgba(212,175,55,0.6)" }}>{auditsLeft} left</span>
          </div>
          <span className="font-mono text-[10px] text-white/30 hidden sm:block">{userEmail}</span>
          <button onClick={handleSignOut} className="font-mono text-[10px] px-3 py-1.5 rounded border transition-all cursor-pointer"
            style={{ borderColor: "rgba(239,68,68,0.5)", color: "rgba(239,68,68,0.9)", background: "rgba(239,68,68,0.08)" }}>
            SIGN OUT
          </button>
        </div>
      </nav>

      <div className="relative max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-mono text-4xl font-black tracking-tight" style={{ color: "#d4af37" }}>STORE AUDIT</h1>
          <p className="font-mono text-xs mt-1" style={{ color: "rgba(212,175,55,0.4)" }}>Deep analysis — SEO, Performance & Conversion intelligence</p>
        </div>

        <div className="flex gap-2 mb-8">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs" style={{ color: "rgba(212,175,55,0.4)" }}>https://</span>
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runAudit()} placeholder="yourstore.com"
              className="w-full rounded-lg pl-20 pr-4 py-3.5 font-mono text-sm text-white placeholder-white/20 outline-none transition-all"
              style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.2)" }} />
          </div>
          <button onClick={runAudit} disabled={loading || !url.trim() || auditsLeft === 0}
            className="px-6 py-3.5 rounded-lg font-mono font-black text-sm tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ background: "linear-gradient(135deg, #d4af37, #b8960c)", color: "#080c14", boxShadow: "0 4px 20px rgba(212,175,55,0.3)" }}>
            {loading ? "SCANNING…" : "AUDIT"}
          </button>
        </div>

        {auditsLeft === 0 && (
          <div className="rounded-lg border p-4 mb-6" style={{ borderColor: "rgba(212,175,55,0.3)", background: "rgba(212,175,55,0.06)" }}>
            <p className="font-mono text-sm font-bold" style={{ color: "#d4af37" }}>Free Audit Limit Reached</p>
            <p className="font-mono text-xs text-white/50 mt-1">Upgrade to Pro for unlimited audits and full fix reports.</p>
            <div className="mt-3 inline-block font-mono text-xs px-4 py-2 rounded font-bold cursor-pointer"
              style={{ background: "linear-gradient(135deg, #d4af37, #b8960c)", color: "#080c14" }}>
              UPGRADE TO PRO →
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center py-16 gap-6">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-2 animate-ping" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
              <div className="absolute inset-3 rounded-full border-2 animate-ping" style={{ borderColor: "rgba(212,175,55,0.4)", animationDelay: "0.3s" }} />
              <div className="absolute inset-6 rounded-full border-2 animate-ping" style={{ borderColor: "rgba(212,175,55,0.6)", animationDelay: "0.6s" }} />
            </div>
            <p className="font-mono text-xs tracking-widest animate-pulse" style={{ color: "rgba(212,175,55,0.6)" }}>DEEP SCANNING STOREFRONT…</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-700/50 bg-red-950/30 p-4 mb-6">
            <p className="font-mono text-xs text-red-400 font-bold">ERROR</p>
            <p className="font-mono text-sm text-white/60 mt-1">{error}</p>
          </div>
        )}

        {result && band && (
          <div className="space-y-4">
            <div className="rounded-xl border p-6" style={{ borderColor: "rgba(212,175,55,0.2)", background: "rgba(212,175,55,0.03)" }}>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ScoreRing score={result.healthScore} band={band} />
                <div className="flex-1 text-center sm:text-left">
                  <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: "rgba(212,175,55,0.4)" }}>OVERALL HEALTH SCORE</p>
                  <p className={`font-mono text-3xl font-black ${bandColors[band]}`}>{bandLabel[band]}</p>
                  <p className="font-mono text-xs text-white/30 mt-1">{result.url}</p>
                  <p className="font-mono text-xs text-white/40 mt-0.5">{result.summary}</p>
                  <p className="font-mono text-[10px] text-white/20 mt-2">{new Date(result.auditedAt).toLocaleString()}</p>
                  <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                    {([
                      { key: "critical", label: "Critical", color: "bg-red-900/50 text-red-400 border border-red-700/30" },
                      { key: "high", label: "High", color: "bg-orange-900/50 text-orange-400 border border-orange-700/30" },
                      { key: "medium", label: "Medium", color: "bg-amber-900/50 text-amber-400 border border-amber-700/30" },
                    ] as const).map(({ key, label, color }) => (
                      <span key={key} className={`font-mono text-[10px] px-2.5 py-1 rounded-full ${color}`}>
                        {result.issuesBySeverity[key].length} {label}
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={handlePDF} disabled={exportingPDF}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg border font-mono text-xs transition-all disabled:opacity-40"
                  style={{ borderColor: "rgba(212,175,55,0.3)", color: "#d4af37", background: "rgba(212,175,55,0.05)" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 9h8M6 1v6M3.5 4.5L6 7l2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {exportingPDF ? "EXPORTING…" : "EXPORT PDF"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MetricTile label="Load Time" value={`${(result.speed.loadTimeMs / 1000).toFixed(2)}s`} sub="Target < 3s" warn={result.speed.loadTimeMs > 3000} />
              <MetricTile label="TTFB" value={`${result.speed.ttfbMs}ms`} sub="Target < 200ms" warn={result.speed.ttfbMs > 600} />
              <MetricTile label="Scripts" value={`${result.speed.scriptCount}`} sub="JS files" warn={result.speed.scriptCount > 10} />
              <MetricTile label="HTML Size" value={`${result.speed.totalPageSizeKb}KB`} sub="Document" warn={result.speed.totalPageSizeKb > 500} />
            </div>

            <div>
              <div className="flex gap-2 mb-3">
                {(["seo", "speed", "conversion"] as IssueCategory[]).map((cat) => (
                  <CategoryTab key={cat} category={cat} issues={result.issuesByCategory[cat]} active={activeCategory === cat} onClick={() => setActiveCategory(cat)} />
                ))}
              </div>
              <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "rgba(212,175,55,0.1)", background: "rgba(212,175,55,0.02)" }}>
                <p className="font-mono text-[10px] tracking-widest px-1 mb-3" style={{ color: "rgba(212,175,55,0.3)" }}>
                  {CATEGORY_LABELS[activeCategory].toUpperCase()} ISSUES ({result.issuesByCategory[activeCategory].length})
                </p>
                {result.issuesByCategory[activeCategory].length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-green-400 font-mono text-sm">✓ No issues found</p>
                    <p className="font-mono text-[11px] text-white/25 mt-1">This category is clean!</p>
                  </div>
                ) : (
                  result.issuesByCategory[activeCategory].sort((a, b) => b.pointsDeducted - a.pointsDeducted).map((issue) => (
                    <IssueCard key={issue.id} issue={issue} isPro={isPro} />
                  ))
                )}
              </div>
            </div>

            {!isPro && (
              <div className="rounded-xl border p-5 text-center" style={{ borderColor: "rgba(212,175,55,0.3)", background: "rgba(212,175,55,0.05)" }}>
                <p className="font-mono text-sm font-black mb-1" style={{ color: "#d4af37" }}>🔒 Unlock Full Intelligence Report</p>
                <p className="font-mono text-xs text-white/40 mb-3">Upgrade to Pro — see exactly how to fix every issue, business impact & revenue data</p>
                <div className="inline-block font-mono text-sm px-6 py-2.5 rounded-lg font-black tracking-wider cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #d4af37, #b8960c)", color: "#080c14", boxShadow: "0 4px 20px rgba(212,175,55,0.3)" }}>
                  UPGRADE TO PRO →
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid rgba(212,175,55,0.1)" }}>
              <p className="font-mono text-[10px] text-white/20">{result.issues.length} total issues</p>
              <p className="font-mono text-[10px] text-red-400/50">-{result.totalDeductions} pts deducted</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}