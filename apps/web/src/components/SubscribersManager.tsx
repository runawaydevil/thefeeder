"use client";

import { useState, useEffect } from "react";

/**
 * Format date deterministically to avoid hydration errors
 * Uses UTC to ensure same output on server and client
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

interface Subscriber {
  id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  approvedAt?: string;
}

interface SubscribersManagerProps {
  onSubscriberUpdate?: () => void;
}

export default function SubscribersManager({ onSubscriberUpdate }: SubscribersManagerProps) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      const res = await fetch("/api/subscribers");
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data);
      }
    } catch (error) {
      console.error("Error fetching subscribers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: "pending" | "approved" | "rejected") => {
    try {
      const res = await fetch(`/api/subscribers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        fetchSubscribers();
        onSubscriberUpdate?.(); // Update pending count in parent
      } else {
        const data = await res.json();
        alert(data.error || "Error updating subscriber");
      }
    } catch (error) {
      console.error("Error updating subscriber:", error);
      alert("Failed to update subscriber");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subscriber?")) return;

    try {
      const res = await fetch(`/api/subscribers/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSubscribers();
        onSubscriberUpdate?.(); // Update pending count in parent
      } else {
        alert("Error deleting subscriber");
      }
    } catch (error) {
      console.error("Error deleting subscriber:", error);
      alert("Failed to delete subscriber");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block">
          <div className="cyber-card border-2 border-vaporwave-cyan/50 p-6">
            <p className="text-xs md:text-sm text-vaporwave-cyan neon-glow-cyan uppercase tracking-wider animate-pulse">
              LOADING...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const pendingCount = subscribers.filter((s) => s.status === "pending").length;
  const approvedCount = subscribers.filter((s) => s.status === "approved").length;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base md:text-lg font-bold text-vaporwave-cyan neon-glow-cyan uppercase tracking-wider mb-3">Subscribers</h2>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-1.5 h-1.5 bg-vaporwave-purple rounded-full animate-pulse" />
            Pending: <span className="text-vaporwave-purple font-bold">{pendingCount}</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-1.5 h-1.5 bg-vaporwave-cyan rounded-full animate-pulse" />
            Approved: <span className="text-vaporwave-cyan font-bold">{approvedCount}</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-1.5 h-1.5 bg-vaporwave-pink rounded-full" />
            Total: <span className="text-vaporwave-pink font-bold">{subscribers.length}</span>
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {subscribers.map((subscriber) => (
          <div
            key={subscriber.id}
            className={`cyber-card border-2 ${
              subscriber.status === "approved"
                ? "border-vaporwave-cyan/50"
                : subscriber.status === "pending"
                  ? "border-vaporwave-purple/50"
                  : "border-destructive/50 opacity-70"
            } p-3 md:p-4 hover:shadow-[0_0_15px_hsl(180_100%_60%_/_0.3)] transition-all`}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-bold text-primary neon-glow-pink text-sm md:text-base mb-1">{subscriber.name}</h3>
                <p className="text-xs text-muted-foreground mb-2 break-all">{subscriber.email}</p>
                <div className="flex flex-wrap gap-3 text-[10px] md:text-xs text-vaporwave-cyan/70">
                  <span className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-vaporwave-cyan rounded-full" />
                    Status:{" "}
                    <span
                      className={`font-bold uppercase ${
                        subscriber.status === "approved"
                          ? "text-vaporwave-cyan"
                          : subscriber.status === "pending"
                            ? "text-vaporwave-purple"
                            : "text-destructive"
                      }`}
                    >
                      {subscriber.status}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-vaporwave-pink rounded-full" />
                    Joined: {formatDate(subscriber.createdAt)}
                  </span>
                  {subscriber.approvedAt && (
                    <span className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-vaporwave-purple rounded-full" />
                      Approved: {formatDate(subscriber.approvedAt)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap w-full sm:w-auto">
                {subscriber.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(subscriber.id, "approved")}
                      className="flex-1 sm:flex-initial px-2 py-1.5 text-[10px] md:text-xs bg-vaporwave-cyan/20 text-vaporwave-cyan border-2 border-vaporwave-cyan/50 rounded hover:bg-vaporwave-cyan/30 hover:shadow-[0_0_8px_hsl(180_100%_60%_/_0.5)] transition-all uppercase tracking-wider font-medium"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(subscriber.id, "rejected")}
                      className="flex-1 sm:flex-initial px-2 py-1.5 text-[10px] md:text-xs bg-destructive/20 text-destructive border-2 border-destructive/50 rounded hover:bg-destructive/30 hover:shadow-[0_0_8px_hsl(0_84%_60%_/_0.5)] transition-all uppercase tracking-wider font-medium"
                    >
                      Reject
                    </button>
                  </>
                )}
                {subscriber.status === "approved" && (
                  <button
                    onClick={() => handleUpdateStatus(subscriber.id, "pending")}
                    className="flex-1 sm:flex-initial px-2 py-1.5 text-[10px] md:text-xs bg-vaporwave-purple/20 text-vaporwave-purple border-2 border-vaporwave-purple/50 rounded hover:bg-vaporwave-purple/30 hover:shadow-[0_0_8px_hsl(270_100%_70%_/_0.5)] transition-all uppercase tracking-wider font-medium"
                  >
                    Revoke
                  </button>
                )}
                <button
                  onClick={() => handleDelete(subscriber.id)}
                  className="flex-1 sm:flex-initial px-2 py-1.5 text-[10px] md:text-xs bg-destructive/20 text-destructive border-2 border-destructive/50 rounded hover:bg-destructive/30 hover:shadow-[0_0_8px_hsl(0_84%_60%_/_0.5)] transition-all uppercase tracking-wider font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {subscribers.length === 0 && (
        <div className="text-center py-8 sm:py-10 md:py-12">
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div className="glow-soft">
              <img src="/logo.png" alt="Logo" className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 opacity-70" />
            </div>
            <div className="p-4 sm:p-5 md:p-6 max-w-md mx-2">
              <p className="text-sm sm:text-base md:text-lg font-bold text-primary neon-glow-pink uppercase tracking-wider mb-1.5 sm:mb-2">
                NO SUBSCRIBERS YET
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Subscribers will appear here once they sign up
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


