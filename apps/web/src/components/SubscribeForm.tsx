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
    <div 
      className="p-3 sm:p-4 md:p-5"
      style={{ background: 'var(--color-bg-secondary)' }}
    >
      <h2 
        className="text-xs sm:text-sm md:text-base font-bold mb-1.5 sm:mb-2 uppercase tracking-wider"
        style={{
          color: 'var(--color-accent-secondary)',
          textShadow: 'var(--shadow-glow)'
        }}
      >
        Get Daily Digest
      </h2>
      <p 
        className="text-[10px] sm:text-[11px] md:text-xs mb-3 sm:mb-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Subscribe to receive a daily email digest with the latest articles from all feeds.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3">
        <div>
          <label 
            htmlFor="name" 
            className="block text-[9px] sm:text-[10px] md:text-xs font-medium mb-1 sm:mb-1.5 uppercase tracking-wider"
            style={{ color: 'var(--color-accent-secondary)' }}
          >
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full min-h-[44px] px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-md focus:outline-none focus:ring-2 transition-all"
            placeholder="Your name"
            style={{
              background: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          />
        </div>

        <div>
          <label 
            htmlFor="email" 
            className="block text-[9px] sm:text-[10px] md:text-xs font-medium mb-1 sm:mb-1.5 uppercase tracking-wider"
            style={{ color: 'var(--color-accent-secondary)' }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full min-h-[44px] px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-md focus:outline-none focus:ring-2 transition-all"
            placeholder="your@email.com"
            style={{
              background: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
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
          className="w-full min-h-[44px] py-2.5 sm:py-3 px-4 text-xs sm:text-sm md:text-base rounded-md font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-all border-2 touch-manipulation"
          style={{
            background: 'var(--color-accent-primary)',
            color: 'var(--color-bg-primary)',
            borderColor: 'var(--color-accent-primary)'
          }}
        >
          {loading ? "SUBSCRIBING..." : "SUBSCRIBE"}
        </button>
      </form>
    </div>
  );
}

