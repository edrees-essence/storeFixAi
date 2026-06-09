"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const handleSignup = async () => {
        if (!email || !password || !confirm) return;
        if (password !== confirm) {
            setError("Passwords do not match");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center px-4"
            style={{ background: "radial-gradient(ellipse at 20% 0%, #0f1e35 0%, #0d1117 50%, #0a0d12 100%)" }}>
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <h1 className="font-mono text-3xl font-black text-white tracking-tight">
                        STORE<span className="text-amber-400">FIX</span>
                    </h1>
                    <p className="font-mono text-xs text-white/30 mt-2">Create your free account</p>
                    <div className="mt-3 flex justify-center gap-4">
                        {["3 free audits", "PDF reports", "Full issue breakdown"].map((f) => (
                            <span key={f} className="font-mono text-[10px] text-amber-500/70">✓ {f}</span>
                        ))}
                    </div>
                </div>

                <div className="rounded border border-white/10 bg-white/[0.03] p-6 space-y-4">
                    {error && (
                        <div className="rounded border border-red-700/50 bg-red-950/40 p-3">
                            <p className="font-mono text-xs text-red-400">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="rounded border border-amber-500/50 bg-amber-950/40 p-4">
                            <p className="font-mono text-sm text-amber-400 font-bold">
                                ✓ Account Created!
                            </p>
                            <p className="font-mono text-xs text-white/60 mt-2 leading-relaxed">
                                We sent a confirmation link to{" "}
                                <span className="text-amber-400">{email}</span>.
                                Check your inbox and click the link to activate your account,
                                then come back here to sign in.
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="font-mono text-[10px] tracking-widest text-white/30 uppercase">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full mt-1 bg-white/5 border border-white/15 rounded px-4 py-3 font-mono text-sm text-white placeholder-white/20 outline-none focus:border-amber-500/60 transition-all" />
                    </div>

                    <div>
                        <label className="font-mono text-[10px] tracking-widest text-white/30 uppercase">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            className="w-full mt-1 bg-white/5 border border-white/15 rounded px-4 py-3 font-mono text-sm text-white placeholder-white/20 outline-none focus:border-amber-500/60 transition-all" />
                    </div>

                    <div>
                        <label className="font-mono text-[10px] tracking-widest text-white/30 uppercase">Confirm Password</label>
                        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                            placeholder="••••••••"
                            className="w-full mt-1 bg-white/5 border border-white/15 rounded px-4 py-3 font-mono text-sm text-white placeholder-white/20 outline-none focus:border-amber-500/60 transition-all" />
                    </div>
 
                    <button onClick={handleSignup} disabled={loading || !email || !password || !confirm}
                        className="w-full py-3 rounded bg-amber-500 text-black font-mono font-bold text-sm tracking-wide disabled:opacity-40 hover:bg-amber-400 transition-colors">
                        {loading ? "CREATING ACCOUNT…" : "CREATE FREE ACCOUNT"}
                    </button>

                    <p className="font-mono text-xs text-white/30 text-center">
                        Already have an account?{" "}
                        <Link href="/login" className="text-amber-400 hover:text-amber-300">
                            Sign in
                        </Link>
                    </p>
                </div>

                <div className="mt-6 rounded border border-amber-500/20 bg-amber-950/20 p-4">
                    <p className="font-mono text-[10px] text-amber-500/70 text-center tracking-wide uppercase mb-2">
                        Free Plan Includes
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                            { label: "3 Audits", sub: "per month" },
                            { label: "PDF Export", sub: "full report" },
                            { label: "All Issues", sub: "SEO + Speed" },
                        ].map((item) => (
                            <div key={item.label} className="rounded border border-white/10 p-2">
                                <p className="font-mono text-xs font-bold text-white">{item.label}</p>
                                <p className="font-mono text-[10px] text-white/30">{item.sub}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}