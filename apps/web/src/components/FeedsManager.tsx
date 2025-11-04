"use client";

import { useState, useEffect, type ChangeEvent, type KeyboardEvent, type FormEvent } from "react";
import { FeedIcon } from "@/src/lib/feed-icon";
import { formatDateTime } from "@/src/lib/date-utils";

interface Feed {
  id: string;
  title: string;
  url: string;
  siteUrl?: string;
  refreshIntervalMinutes: number;
  lastFetchedAt?: string;
  isActive: boolean;
  _count?: {
    items: number;
  };
}

export default function FeedsManager() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Feed | null>(null);
  const [showDiscover, setShowDiscover] = useState(false);
  const [discoverUrl, setDiscoverUrl] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoveredFeeds, setDiscoveredFeeds] = useState<Array<{ url: string; title: string; type: string }>>([]);
  const [importingOPML, setImportingOPML] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number; errors?: string[] } | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    siteUrl: "",
    refreshIntervalMinutes: 60,
  });

  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    try {
      const res = await fetch("/api/feeds");
      if (res.ok) {
        const data = await res.json();
        setFeeds(data);
      }
    } catch (error) {
      console.error("Error fetching feeds:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (formData.refreshIntervalMinutes < 10) {
      alert("Refresh interval must be at least 10 minutes");
      return;
    }

    try {
      const url = editing ? `/api/feeds/${editing.id}` : "/api/feeds";
      const method = editing ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchFeeds();
        setShowForm(false);
        setEditing(null);
        setFormData({ title: "", url: "", siteUrl: "", refreshIntervalMinutes: 60 });
      } else {
        const data = await res.json();
        alert(data.error || "Error saving feed");
      }
    } catch (error) {
      console.error("Error saving feed:", error);
      alert("Failed to save feed");
    }
  };

  const handleEdit = (feed: Feed) => {
    setEditing(feed);
    setFormData({
      title: feed.title,
      url: feed.url,
      siteUrl: feed.siteUrl || "",
      refreshIntervalMinutes: feed.refreshIntervalMinutes,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feed? All associated items will also be deleted.")) return;

    try {
      const res = await fetch(`/api/feeds/${id}`, { method: "DELETE" });
      const data = await res.json();
      
      if (res.ok) {
        fetchFeeds();
        // Show success message if provided
        if (data.message) {
          alert(data.message);
        }
      } else {
        // Show specific error message from API
        const errorMessage = data.error || `Error deleting feed: ${res.status} ${res.statusText}`;
        alert(errorMessage);
        console.error("Delete feed error:", { status: res.status, error: data });
      }
    } catch (error) {
      console.error("Error deleting feed:", error);
      alert(`Failed to delete feed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleFetch = async (id: string) => {
    try {
      const res = await fetch(`/api/feeds/${id}/fetch`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(`Fetched ${data.itemsCreated} new items, updated ${data.itemsUpdated} items`);
        fetchFeeds();
      } else {
        const data = await res.json();
        alert(data.error || "Error fetching feed");
      }
    } catch (error) {
      console.error("Error fetching feed:", error);
      alert("Failed to fetch feed");
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

  const handleDiscover = async () => {
    if (!discoverUrl.trim()) {
      alert("Please enter a URL");
      return;
    }

    setDiscovering(true);
    setDiscoveredFeeds([]);

    try {
      const res = await fetch("/api/feeds/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: discoverUrl }),
      });

      const data = await res.json();

      if (res.ok) {
        setDiscoveredFeeds(data.feeds || []);
        if (data.feeds.length === 0) {
          alert("No feeds found for this URL");
        }
      } else {
        alert(data.error || "Error discovering feeds");
      }
    } catch (error) {
      console.error("Error discovering feeds:", error);
      alert("Failed to discover feeds");
    } finally {
      setDiscovering(false);
    }
  };

  const handleUseDiscoveredFeed = (feed: { url: string; title: string }) => {
    setFormData({
      title: feed.title,
      url: feed.url,
      siteUrl: discoverUrl,
      refreshIntervalMinutes: 60,
    });
    setShowDiscover(false);
    setShowForm(true);
    setDiscoveredFeeds([]);
    setDiscoverUrl("");
  };

  const handleExportOPML = async () => {
    try {
      const res = await fetch("/api/feeds/export/opml");
      
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error exporting OPML");
        return;
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = res.headers.get("content-disposition");
      let filename = "thefeeder-feeds.opml";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting OPML:", error);
      alert("Failed to export OPML");
    }
  };

  const handleImportOPML = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes("xml") && !file.name.endsWith(".opml")) {
      alert("Invalid file type. Please upload an OPML (.opml) file");
      return;
    }

    setImportingOPML(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/feeds/import/opml", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setImportResult({
          imported: data.imported,
          skipped: data.skipped,
          total: data.total,
          errors: data.errors,
        });
        // Refresh feeds list
        fetchFeeds();
        // Clear file input
        event.target.value = "";
      } else {
        alert(data.error || "Error importing OPML");
      }
    } catch (error) {
      console.error("Error importing OPML:", error);
      alert("Failed to import OPML");
    } finally {
      setImportingOPML(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="text-base md:text-lg font-bold text-vaporwave-cyan neon-glow-cyan uppercase tracking-wider">Feeds</h2>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <input
            type="file"
            accept=".opml,.xml"
            onChange={handleImportOPML}
            disabled={importingOPML}
            className="hidden"
            id="opml-import-input"
          />
          <label
            htmlFor="opml-import-input"
            className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs md:text-sm rounded-md hover:shadow-[0_0_12px_hsl(270_100%_70%_/_0.5)] transition-all border-2 uppercase tracking-wider font-bold cursor-pointer ${
              importingOPML
                ? "bg-vaporwave-purple/50 text-primary-foreground/50 border-vaporwave-purple/30 cursor-not-allowed"
                : "bg-vaporwave-purple text-primary-foreground border-vaporwave-purple hover:bg-vaporwave-purple/90"
            }`}
          >
            {importingOPML ? "⏳ Importing..." : "📤 Import OPML"}
          </label>
          <button
            onClick={handleExportOPML}
            className="flex-1 sm:flex-initial px-3 py-1.5 text-xs md:text-sm bg-vaporwave-pink text-primary-foreground rounded-md hover:bg-vaporwave-pink/90 hover:shadow-[0_0_12px_hsl(320_100%_65%_/_0.5)] transition-all border-2 border-vaporwave-pink uppercase tracking-wider font-bold"
          >
            📥 Export OPML
          </button>
          <button
            onClick={() => {
              setShowDiscover(!showDiscover);
              setShowForm(false);
              if (showDiscover) {
                setDiscoveredFeeds([]);
                setDiscoverUrl("");
              }
            }}
            className="flex-1 sm:flex-initial px-3 py-1.5 text-xs md:text-sm bg-vaporwave-purple text-primary-foreground rounded-md hover:bg-vaporwave-purple/90 hover:shadow-[0_0_12px_hsl(270_100%_70%_/_0.5)] transition-all border-2 border-vaporwave-purple uppercase tracking-wider font-bold"
          >
            {showDiscover ? "Cancel" : "🔍 Discover"}
          </button>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditing(null);
              setShowDiscover(false);
              setFormData({ title: "", url: "", siteUrl: "", refreshIntervalMinutes: 60 });
            }}
            className="flex-1 sm:flex-initial px-3 py-1.5 text-xs md:text-sm bg-vaporwave-cyan text-primary-foreground rounded-md hover:bg-vaporwave-cyan/90 hover:shadow-[0_0_12px_hsl(180_100%_60%_/_0.5)] transition-all border-2 border-vaporwave-cyan uppercase tracking-wider font-bold"
          >
            {showForm ? "Cancel" : "+ Add Feed"}
          </button>
        </div>
      </div>

      {importResult && (
        <div className="mb-4 cyber-card border-2 border-vaporwave-cyan/50 p-4 space-y-3">
          <h3 className="text-sm font-bold text-vaporwave-cyan uppercase tracking-wider mb-2">Import Result</h3>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              <span className="text-green-400">✓ Imported: {importResult.imported}</span> | 
              <span className="text-yellow-400"> ⊘ Skipped: {importResult.skipped}</span> | 
              <span> Total: {importResult.total}</span>
            </p>
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-400">
                <p className="font-bold mb-1">Errors:</p>
                <ul className="list-disc list-inside space-y-1">
                  {importResult.errors.map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={() => setImportResult(null)}
              className="text-xs text-vaporwave-cyan hover:text-vaporwave-cyan/80 underline"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showDiscover && (
        <div className="mb-4 cyber-card border-2 border-vaporwave-purple/50 p-4 space-y-3">
          <h3 className="text-sm font-bold text-vaporwave-purple uppercase tracking-wider mb-2">Discover Feeds</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Enter a website URL and we'll automatically discover RSS/Atom feeds
          </p>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={discoverUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDiscoverUrl(e.target.value)}
              placeholder="https://example.com or r/programming or youtube.com/channel/..."
              className="flex-1 px-3 py-2 text-xs sm:text-sm bg-background/80 border-2 border-vaporwave-purple/30 rounded-md text-foreground focus:border-vaporwave-purple focus:outline-none focus:ring-2 focus:ring-vaporwave-purple/50 transition-all min-w-0"
              onKeyPress={(e: KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleDiscover()}
            />
            <button
              onClick={handleDiscover}
              disabled={discovering}
              className="px-4 py-2 text-xs md:text-sm bg-vaporwave-purple text-primary-foreground rounded-md hover:bg-vaporwave-purple/90 hover:shadow-[0_0_12px_hsl(270_100%_70%_/_0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all border-2 border-vaporwave-purple uppercase tracking-wider font-bold flex-shrink-0 w-full sm:w-auto"
            >
              {discovering ? "Searching..." : "Discover"}
            </button>
          </div>

          {discoveredFeeds.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold text-vaporwave-cyan uppercase tracking-wider">
                Found {discoveredFeeds.length} feed(s):
              </p>
              <div className="space-y-2">
                {discoveredFeeds.map((feed: { url: string; title: string; type: string }, index: number) => (
                  <div
                    key={index}
                    className="p-3 bg-background/50 border-2 border-vaporwave-cyan/30 rounded-md hover:border-vaporwave-cyan/50 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                        <p className="text-sm font-bold text-primary mb-1 truncate">{feed.title}</p>
                        <p className="text-xs text-muted-foreground break-all mb-2">{feed.url}</p>
                        <span className="text-[10px] text-vaporwave-cyan uppercase tracking-wider">
                          {feed.type.toUpperCase()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleUseDiscoveredFeed(feed)}
                        className="px-3 py-1.5 text-xs bg-vaporwave-cyan text-primary-foreground rounded hover:bg-vaporwave-cyan/90 transition-all border-2 border-vaporwave-cyan uppercase tracking-wider font-bold flex-shrink-0 w-full sm:w-auto"
                      >
                        Use
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 cyber-card border-2 border-vaporwave-purple/50 p-4 space-y-3">
          <div>
            <label className="block text-[10px] md:text-xs font-medium mb-1.5 text-vaporwave-cyan uppercase tracking-wider">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-3 py-2 text-sm bg-background/80 border-2 border-vaporwave-cyan/30 rounded-md text-foreground focus:border-vaporwave-cyan focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] md:text-xs font-medium mb-1.5 text-vaporwave-cyan uppercase tracking-wider">Feed URL</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, url: e.target.value })}
              required
              className="w-full px-3 py-2 text-sm bg-background/80 border-2 border-vaporwave-cyan/30 rounded-md text-foreground focus:border-vaporwave-cyan focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] md:text-xs font-medium mb-1.5 text-vaporwave-cyan uppercase tracking-wider">Site URL (optional)</label>
            <input
              type="url"
              value={formData.siteUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, siteUrl: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-background/80 border-2 border-vaporwave-cyan/30 rounded-md text-foreground focus:border-vaporwave-cyan focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] md:text-xs font-medium mb-1.5 text-vaporwave-cyan uppercase tracking-wider">
              Refresh Interval (minutes, min 10)
            </label>
            <input
              type="number"
              min="10"
              value={formData.refreshIntervalMinutes}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, refreshIntervalMinutes: parseInt(e.target.value) })}
              required
              className="w-full px-3 py-2 text-sm bg-background/80 border-2 border-vaporwave-cyan/30 rounded-md text-foreground focus:border-vaporwave-cyan focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan/50 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs md:text-sm bg-vaporwave-pink text-primary-foreground rounded-md hover:bg-vaporwave-pink/90 hover:shadow-[0_0_15px_hsl(320_100%_65%_/_0.5)] transition-all border-2 border-vaporwave-pink uppercase tracking-wider font-bold"
          >
            {editing ? "Update" : "Create"} Feed
          </button>
        </form>
      )}

      <div className="space-y-4">
        {feeds.map((feed: Feed) => (
          <div
            key={feed.id}
            className={`cyber-card border-2 ${feed.isActive ? 'border-vaporwave-cyan/50' : 'border-vaporwave-purple/30 opacity-70'} p-3 md:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:shadow-[0_0_15px_hsl(180_100%_60%_/_0.3)] transition-all`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <FeedIcon url={feed.url} size={16} className="flex-shrink-0" />
                <h3 className="font-bold text-primary neon-glow-pink text-sm md:text-base">{feed.title}</h3>
                {!feed.isActive && (
                  <span className="text-[10px] bg-vaporwave-purple/20 text-vaporwave-purple border border-vaporwave-purple/50 px-1.5 py-0.5 rounded uppercase tracking-wider">Inactive</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-2 break-all">{feed.url}</p>
              <div className="flex flex-wrap gap-3 text-[10px] md:text-xs text-vaporwave-cyan/70">
                <span className="flex items-center gap-1">
                  <span className="w-1 h-1 bg-vaporwave-cyan rounded-full" />
                  Interval: {feed.refreshIntervalMinutes} min
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1 h-1 bg-vaporwave-pink rounded-full" />
                  Items: {feed._count?.items || 0}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1 h-1 bg-vaporwave-purple rounded-full" />
                  Last: {feed.lastFetchedAt ? formatDateTime(feed.lastFetchedAt) : "Nunca"}
                </span>
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap w-full sm:w-auto">
              <button
                onClick={() => handleFetch(feed.id)}
                className="flex-1 sm:flex-initial px-2 py-1.5 text-[10px] md:text-xs bg-vaporwave-cyan/20 text-vaporwave-cyan border-2 border-vaporwave-cyan/50 rounded hover:bg-vaporwave-cyan/30 hover:shadow-[0_0_8px_hsl(180_100%_60%_/_0.5)] transition-all uppercase tracking-wider font-medium"
              >
                Fetch
              </button>
              <button
                onClick={() => handleEdit(feed)}
                className="flex-1 sm:flex-initial px-2 py-1.5 text-[10px] md:text-xs bg-vaporwave-purple/20 text-vaporwave-purple border-2 border-vaporwave-purple/50 rounded hover:bg-vaporwave-purple/30 hover:shadow-[0_0_8px_hsl(270_100%_70%_/_0.5)] transition-all uppercase tracking-wider font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(feed.id)}
                className="flex-1 sm:flex-initial px-2 py-1.5 text-[10px] md:text-xs bg-destructive/20 text-destructive border-2 border-destructive/50 rounded hover:bg-destructive/30 hover:shadow-[0_0_8px_hsl(0_84%_60%_/_0.5)] transition-all uppercase tracking-wider font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {feeds.length === 0 && (
        <div className="text-center py-8 sm:py-10 md:py-12">
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div className="glow-soft">
              <img src="/logo.png" alt="Logo" className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 opacity-70" />
            </div>
            <div className="p-4 sm:p-5 md:p-6 max-w-md mx-2">
              <p className="text-sm sm:text-base md:text-lg font-bold text-primary neon-glow-pink uppercase tracking-wider mb-1.5 sm:mb-2">
                NO FEEDS YET
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Add your first feed to get started!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

