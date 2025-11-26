"use client";

import { useState } from 'react';
import { useToast } from "@/src/hooks/useToast";
import { ToastContainer } from "./Toast";

interface FeedAlternativesProps {
  feedId: string;
  currentUrl: string;
  alternatives: string[];
  onUrlReplaced?: () => void;
}

interface TestResult {
  url: string;
  valid: boolean;
  error?: string;
  testing?: boolean;
}

export default function FeedAlternatives({ 
  feedId, 
  currentUrl, 
  alternatives,
  onUrlReplaced 
}: FeedAlternativesProps) {
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [replacing, setReplacing] = useState<string | null>(null);
  const { toasts, removeToast, success, error } = useToast();

  if (!alternatives || alternatives.length === 0) {
    return null;
  }

  const testAlternative = async (url: string) => {
    setTestResults(prev => ({
      ...prev,
      [url]: { url, valid: false, testing: true }
    }));

    try {
      const res = await fetch('/api/feeds/test-alternative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      setTestResults(prev => ({
        ...prev,
        [url]: {
          url,
          valid: data.valid,
          error: data.error,
          testing: false,
        }
      }));
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        [url]: {
          url,
          valid: false,
          error: error.message,
          testing: false,
        }
      }));
    }
  };

  const replaceUrl = async (newUrl: string) => {
    if (!confirm(`Replace current feed URL with:\n${newUrl}\n\nThis will update the feed and retry fetching.`)) {
      return;
    }

    setReplacing(newUrl);

    try {
      const res = await fetch(`/api/feeds/${feedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl }),
      });

      if (res.ok) {
        success('Feed URL updated successfully! The feed will be retried shortly.');
        onUrlReplaced?.();
      } else {
        const data = await res.json();
        error(`Failed to update feed URL: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      error(`Error updating feed URL: ${err.message}`);
    } finally {
      setReplacing(null);
    }
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div 
        className="p-4 rounded border" 
        style={{ 
          background: 'var(--color-bg-secondary)', 
          borderColor: 'var(--color-border)' 
        }}
      >
      <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--color-accent-primary)' }}>
        🔍 Alternative Feed URLs Found
      </h3>
      <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
        We discovered {alternatives.length} potential alternative{alternatives.length > 1 ? 's' : ''} for this feed. 
        Test them to see if they work better.
      </p>

      <div className="space-y-2">
        {alternatives.map((url) => {
          const result = testResults[url];
          const isTesting = result?.testing;
          const isValid = result?.valid;
          const hasError = result && !result.valid && !result.testing;

          return (
            <div 
              key={url}
              className="p-3 rounded border"
              style={{ 
                background: 'var(--color-bg-primary)', 
                borderColor: 'var(--color-border)' 
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div 
                    className="text-xs font-mono break-all mb-2"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {url}
                  </div>
                  
                  {hasError && (
                    <div 
                      className="text-xs p-2 rounded mb-2"
                      style={{ 
                        background: '#fee', 
                        color: '#c00' 
                      }}
                    >
                      ❌ {result.error}
                    </div>
                  )}
                  
                  {isValid && (
                    <div 
                      className="text-xs p-2 rounded mb-2"
                      style={{ 
                        background: '#efe', 
                        color: '#060' 
                      }}
                    >
                      ✅ This alternative works!
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => testAlternative(url)}
                    disabled={isTesting}
                    className="px-3 py-1 text-xs rounded"
                    style={{
                      background: isTesting ? '#ccc' : 'var(--color-accent-primary)',
                      color: '#fff',
                      cursor: isTesting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isTesting ? 'Testing...' : 'Test'}
                  </button>

                  {isValid && (
                    <button
                      onClick={() => replaceUrl(url)}
                      disabled={replacing === url}
                      className="px-3 py-1 text-xs rounded"
                      style={{
                        background: replacing === url ? '#ccc' : '#10b981',
                        color: '#fff',
                        cursor: replacing === url ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {replacing === url ? 'Replacing...' : 'Use This'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
