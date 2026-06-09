"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      if (error) {
        setError(error.message);
        return;
      }
      if (data.session) {
        window.location.href = "/audit";
      }
    } catch (err) {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #080c14 0%, #0a0d18 50%, #0d1020 100%)" }}>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-mono text-4xl font-black tracking-tight">
            <span style={{ color: "#d4af37" }}>STORE</span>
            <span className="text-white">FIX</span>
          </h1>
          <p className="font-mono text-xs text-white/30 mt-2">Sign in to your account</p>
        </div>

        <div className="rounded-xl border p-6 space-y-4"
          style={{ borderColor: "rgba(212,175,55,0.2)", background: "rgba(212,175,55,0.03)" }}>
          
          {error && (
            <div className="rounded-lg border border-red-700/50 bg-red-950/30 p-3">
              <p className="font-mono text-xs text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="font-mono text-[10px] tracking-widest uppercase"
              style={{ color: "rgba(212,175,55,0.5)" }}>Email</label>
            <input type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="you@example.com"
              className="w-full mt-1 rounded-lg px-4 py-3 font-mono text-sm text-white placeholder-white/20 outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.2)" }} />
          </div>

          <div>
            <label className="font-mono text-[10px] tracking-widest uppercase"
              style={{ color: "rgba(212,175,55,0.5)" }}>Password</label>
            <input type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="••••••••"
              className="w-full mt-1 rounded-lg px-4 py-3 font-mono text-sm text-white placeholder-white/20 outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.2)" }} />
          </div>

          <button onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full py-3.5 rounded-lg font-mono font-black text-sm tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ background: "linear-gradient(135deg, #d4af37, #b8960c)", color: "#080c14", boxShadow: "0 4px 20px rgba(212,175,55,0.3)" }}>
            {loading ? "SIGNING IN…" : "SIGN IN"}
          </button>

          <p className="font-mono text-xs text-white/30 text-center">
            No account?{" "}
            <Link href="/signup" style={{ color: "#d4af37" }}>
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}