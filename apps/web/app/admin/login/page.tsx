"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/src/components/ThemeToggle";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/admin");
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden overflow-y-auto scanlines flex items-center justify-center px-4" style={{ background: 'var(--color-bg-primary)', transition: 'var(--theme-transition)' }}>
      <div className="vaporwave-grid" />
      <div className="absolute inset-0 opacity-30" style={{
        background: 'var(--gradient-bg-overlay)',
        transition: 'var(--theme-transition)'
      }} />
      
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      
      <div className="relative z-10 w-full max-w-md space-y-6 md:space-y-8 cyber-card border-2 p-5 md:p-8 backdrop-blur-md mx-2" style={{ 
        borderColor: 'var(--color-accent-primary)', 
        transition: 'var(--theme-transition)' 
      }}>
        <div className="text-center space-y-3 md:space-y-4">
          <div className="glow-soft flex justify-center">
            <img src="/logo.png" alt="The Feeder Logo" className="w-14 h-14 md:w-20 md:h-20 opacity-80" />
          </div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-primary neon-glow-pink uppercase tracking-wider">Admin Login</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Sign in to manage feeds and subscribers</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          {error && (
            <div className="border-2 border-destructive/50 bg-destructive/10 text-destructive p-2 md:p-3 rounded text-xs md:text-sm cyber-card">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-[10px] md:text-xs font-medium mb-1.5 md:mb-2 uppercase tracking-wider" style={{ color: 'var(--color-accent-secondary)', transition: 'var(--theme-transition)' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 md:px-4 md:py-3 text-sm bg-background/80 border-2 rounded-md transition-all"
              style={{
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-accent-primary)',
                transition: 'var(--theme-transition)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-accent-primary)';
                e.target.style.boxShadow = '0 0 0 2px var(--color-accent-primary)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--color-accent-primary)';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[10px] md:text-xs font-medium mb-1.5 md:mb-2 uppercase tracking-wider" style={{ color: 'var(--color-accent-secondary)', transition: 'var(--theme-transition)' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 md:px-4 md:py-3 text-sm bg-background/80 border-2 rounded-md transition-all"
              style={{
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-accent-primary)',
                transition: 'var(--theme-transition)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-accent-primary)';
                e.target.style.boxShadow = '0 0 0 2px var(--color-accent-primary)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--color-accent-primary)';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] py-2 px-4 text-xs sm:text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wider font-normal touch-manipulation"
            style={{
              backgroundColor: 'var(--color-accent-primary)',
              color: 'var(--color-bg-primary)',
              borderColor: 'var(--color-accent-primary)',
              transition: 'var(--theme-transition)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {loading ? "SIGNING IN..." : "SIGN IN"}
          </button>
        </form>
      </div>
    </div>
  );
}

