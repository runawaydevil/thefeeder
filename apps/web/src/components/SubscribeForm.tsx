"use client";

import { useState, FormEvent } from "react";

export default function SubscribeForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: data.message || "Subscription request submitted!" });
        setName("");
        setEmail("");
      } else {
        setMessage({ type: "error", text: data.error || "Something went wrong" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to submit. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-5">
      <h2 className="text-xs sm:text-sm md:text-base font-bold text-vaporwave-cyan neon-glow-cyan mb-1.5 sm:mb-2 uppercase tracking-wider">
        Get Daily Digest
      </h2>
      <p className="text-[10px] sm:text-[11px] md:text-xs text-muted-foreground mb-3 sm:mb-4">
        Subscribe to receive a daily email digest with the latest articles from all feeds.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3">
        <div>
          <label htmlFor="name" className="block text-[9px] sm:text-[10px] md:text-xs font-medium mb-1 sm:mb-1.5 text-vaporwave-cyan uppercase tracking-wider">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-background/80 border-2 border-vaporwave-cyan/30 rounded-md text-foreground focus:border-vaporwave-cyan focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan/50 transition-all"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-[9px] sm:text-[10px] md:text-xs font-medium mb-1 sm:mb-1.5 text-vaporwave-cyan uppercase tracking-wider">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-background/80 border-2 border-vaporwave-cyan/30 rounded-md text-foreground focus:border-vaporwave-cyan focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan/50 transition-all"
            placeholder="your@email.com"
          />
        </div>

        {message && (
          <div
            className={`p-1.5 sm:p-2 rounded text-[10px] sm:text-xs ${
              message.type === "success"
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-1.5 sm:py-2 px-3 sm:px-4 text-[10px] sm:text-xs md:text-sm bg-vaporwave-cyan text-primary-foreground rounded-md font-bold uppercase tracking-wider hover:bg-vaporwave-cyan/90 hover:shadow-[0_0_12px_hsl(180_100%_60%_/_0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all border-2 border-vaporwave-cyan"
        >
          {loading ? "SUBSCRIBING..." : "SUBSCRIBE"}
        </button>
      </form>
    </div>
  );
}

