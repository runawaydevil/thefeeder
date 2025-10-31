"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

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
    <div className="min-h-screen relative overflow-x-hidden overflow-y-auto scanlines flex items-center justify-center px-4">
      <div className="vaporwave-grid" />
      <div className="absolute inset-0 opacity-30" style={{
        background: 'radial-gradient(circle at 50% 0%, hsl(320 100% 50% / 0.4), transparent 50%), radial-gradient(circle at 80% 80%, hsl(270 100% 50% / 0.3), transparent 50%)'
      }} />
      
      <div className="relative z-10 w-full max-w-md space-y-6 md:space-y-8 cyber-card border-2 border-vaporwave-pink/50 p-5 md:p-8 backdrop-blur-md mx-2">
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
            <label htmlFor="email" className="block text-[10px] md:text-xs font-medium mb-1.5 md:mb-2 text-vaporwave-cyan uppercase tracking-wider">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 md:px-4 md:py-3 text-sm bg-background/80 border-2 border-vaporwave-pink/30 rounded-md text-foreground focus:border-vaporwave-pink focus:outline-none focus:ring-2 focus:ring-vaporwave-pink/50 transition-all"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[10px] md:text-xs font-medium mb-1.5 md:mb-2 text-vaporwave-cyan uppercase tracking-wider">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 md:px-4 md:py-3 text-sm bg-background/80 border-2 border-vaporwave-pink/30 rounded-md text-foreground focus:border-vaporwave-pink focus:outline-none focus:ring-2 focus:ring-vaporwave-pink/50 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 md:py-3 px-4 md:px-6 text-xs md:text-sm bg-vaporwave-pink text-primary-foreground rounded-md font-bold uppercase tracking-wider hover:bg-vaporwave-pink/90 hover:shadow-[0_0_15px_hsl(320_100%_65%_/_0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition-all border-2 border-vaporwave-pink"
          >
            {loading ? "SIGNING IN..." : "SIGN IN"}
          </button>
        </form>
      </div>
    </div>
  );
}

