"use client";

import { useState, useEffect } from "react";

interface VoteButtonsProps {
  itemId: string;
  initialLikes: number;
  initialDislikes: number;
  initialUserVote?: "like" | "dislike" | null;
}

type UserVote = "like" | "dislike" | null;

interface VoteState {
  likes: number;
  dislikes: number;
  userVote: UserVote;
  isLoading: boolean;
}

const STORAGE_KEY = "thefeeder_votes";

// Utility functions for localStorage
function getStoredVotes(): Record<string, UserVote> {
  if (typeof window === "undefined") return {};
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Error reading votes from localStorage:", error);
    return {};
  }
}

function setStoredVote(itemId: string, vote: UserVote) {
  if (typeof window === "undefined") return;
  
  try {
    const votes = getStoredVotes();
    
    if (vote === null) {
      delete votes[itemId];
    } else {
      votes[itemId] = vote;
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
  } catch (error) {
    console.error("Error saving vote to localStorage:", error);
  }
}

export default function VoteButtons({
  itemId,
  initialLikes,
  initialDislikes,
  initialUserVote = null,
}: VoteButtonsProps) {
  const [state, setState] = useState<VoteState>({
    likes: initialLikes,
    dislikes: initialDislikes,
    userVote: initialUserVote,
    isLoading: false,
  });

  // Load user's previous vote from server (initialUserVote) or localStorage on mount
  useEffect(() => {
    // Prefer server-side vote data over localStorage
    if (initialUserVote !== null) {
      setState((prev) => ({
        ...prev,
        userVote: initialUserVote,
      }));
      // Sync localStorage with server state
      setStoredVote(itemId, initialUserVote);
    } else {
      // Fallback to localStorage if no server data
      const votes = getStoredVotes();
      const userVote = votes[itemId] || null;
      
      setState((prev) => ({
        ...prev,
        userVote,
      }));
    }
  }, [itemId, initialUserVote]);

  // Debounce helper
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const handleVote = async (newVote: "like" | "dislike") => {
    // Clear any pending debounce
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Debounce to prevent rapid clicks
    const timer = setTimeout(async () => {
      const { userVote, likes, dislikes } = state;

      // Determine the action to send to API
      let action: string;
      let optimisticLikes = likes;
      let optimisticDislikes = dislikes;
      let optimisticUserVote: UserVote = newVote;

      if (userVote === newVote) {
        // User is removing their vote
        action = newVote === "like" ? "remove_like" : "remove_dislike";
        optimisticUserVote = null;
        
        if (newVote === "like") {
          optimisticLikes = Math.max(0, likes - 1);
        } else {
          optimisticDislikes = Math.max(0, dislikes - 1);
        }
      } else if (userVote === null) {
        // User is adding a new vote
        action = newVote;
        
        if (newVote === "like") {
          optimisticLikes = likes + 1;
        } else {
          optimisticDislikes = dislikes + 1;
        }
      } else {
        // User is switching from one vote to another
        // This requires two actions: remove old, add new
        action = newVote; // We'll handle the switch in the API call
        
        if (userVote === "like") {
          optimisticLikes = Math.max(0, likes - 1);
          optimisticDislikes = dislikes + 1;
        } else {
          optimisticDislikes = Math.max(0, dislikes - 1);
          optimisticLikes = likes + 1;
        }
      }

      // Optimistic update
      setState({
        likes: optimisticLikes,
        dislikes: optimisticDislikes,
        userVote: optimisticUserVote,
        isLoading: true,
      });

      try {
        // If switching votes, we need to make two API calls
        if (userVote !== null && userVote !== newVote && optimisticUserVote !== null) {
          // First, remove the old vote
          const removeAction = userVote === "like" ? "remove_like" : "remove_dislike";
          await fetch(`/api/items/${itemId}/vote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: removeAction }),
          });

          // Then, add the new vote
          const response = await fetch(`/api/items/${itemId}/vote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: newVote }),
          });

          if (!response.ok) {
            throw new Error("Failed to vote");
          }

          const data = await response.json();

          setState({
            likes: data.likes,
            dislikes: data.dislikes,
            userVote: data.userVote ?? optimisticUserVote,
            isLoading: false,
          });

          setStoredVote(itemId, data.userVote ?? optimisticUserVote);
        } else {
          // Single action
          const response = await fetch(`/api/items/${itemId}/vote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            
            if (response.status === 429) {
              alert("Too many actions. Please wait a moment.");
            } else {
              alert("Failed to register vote. Please try again.");
            }
            
            throw new Error(errorData.error || "Failed to vote");
          }

          const data = await response.json();

          setState({
            likes: data.likes,
            dislikes: data.dislikes,
            userVote: data.userVote ?? optimisticUserVote,
            isLoading: false,
          });

          setStoredVote(itemId, data.userVote ?? optimisticUserVote);
        }
      } catch (error) {
        console.error("Error voting:", error);
        
        // Revert optimistic update
        setState({
          likes,
          dislikes,
          userVote,
          isLoading: false,
        });
      }
    }, 300); // 300ms debounce

    setDebounceTimer(timer);
  };

  const { likes, dislikes, userVote, isLoading } = state;

  const buttonStyle = (isActive: boolean) => ({
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
    padding: "0.25rem 0.5rem",
    borderRadius: "0.375rem",
    fontSize: "0.75rem",
    fontWeight: "500",
    cursor: isLoading ? "not-allowed" : "pointer",
    transition: "all 0.2s ease",
    minWidth: "44px",
    minHeight: "44px",
    background: isActive 
      ? "var(--color-accent-primary)" 
      : "var(--gradient-card)",
    border: `2px solid ${isActive ? "var(--color-accent-primary)" : "var(--color-border)"}`,
    color: isActive ? "#FFFFFF" : "var(--color-text-primary)",
    boxShadow: isActive 
      ? "0 0 20px var(--color-accent-primary)" 
      : "var(--shadow-card)",
    opacity: isLoading ? 0.6 : 1,
  });

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* Like Button */}
      <button
        onClick={() => handleVote("like")}
        disabled={isLoading}
        className={`vote-button ${userVote === "like" ? "active" : ""} ${isLoading ? "loading" : ""}`}
        aria-label={`Like article (${likes} likes)`}
        aria-pressed={userVote === "like"}
        style={buttonStyle(userVote === "like")}
      >
        <span aria-hidden="true">👍</span>
        <span className="text-xs">{likes}</span>
      </button>

      {/* Dislike Button */}
      <button
        onClick={() => handleVote("dislike")}
        disabled={isLoading}
        className={`vote-button ${userVote === "dislike" ? "active" : ""} ${isLoading ? "loading" : ""}`}
        aria-label={`Dislike article (${dislikes} dislikes)`}
        aria-pressed={userVote === "dislike"}
        style={buttonStyle(userVote === "dislike")}
      >
        <span aria-hidden="true">👎</span>
        <span className="text-xs">{dislikes}</span>
      </button>
    </div>
  );
}
