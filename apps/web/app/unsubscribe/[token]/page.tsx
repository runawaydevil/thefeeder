"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function UnsubscribePage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = async () => {
      try {
        const token = params.token as string;
        
        const response = await fetch(`/api/unsubscribe/${token}`, {
          method: "POST",
        });

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "You have been successfully unsubscribed.");
          // Redirect to success page after 2 seconds
          setTimeout(() => {
            router.push(`/unsubscribe/${token}/success`);
          }, 2000);
        } else {
          setStatus("error");
          setMessage(data.error || "Failed to unsubscribe. Please try again.");
        }
      } catch (error) {
        setStatus("error");
        setMessage("An error occurred. Please try again later.");
      }
    };

    unsubscribe();
  }, [params.token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-primary)' }}>
      <div className="max-w-md w-full mx-4">
        <div 
          className="p-8 rounded-lg border-2"
          style={{
            background: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <div className="text-center">
            <img src="/logo.png" alt="TheFeeder Logo" className="w-16 h-16 mx-auto mb-4" />
            
            <h1 
              className="text-2xl font-bold mb-4"
              style={{ 
                color: 'var(--color-accent-primary)',
                fontFamily: 'var(--font-heading)'
              }}
            >
              THE FEEDER
            </h1>

            {status === "loading" && (
              <div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-accent-primary)' }} />
                <p style={{ color: 'var(--color-text-primary)' }}>
                  Unsubscribing...
                </p>
              </div>
            )}

            {status === "success" && (
              <div>
                <div className="text-4xl mb-4">✓</div>
                <p className="text-lg font-bold mb-2" style={{ color: 'var(--color-accent-secondary)' }}>
                  Success!
                </p>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  {message}
                </p>
              </div>
            )}

            {status === "error" && (
              <div>
                <div className="text-4xl mb-4">✗</div>
                <p className="text-lg font-bold mb-2" style={{ color: 'var(--color-accent-primary)' }}>
                  Error
                </p>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  {message}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
