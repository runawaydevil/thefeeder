import { 
  FaReddit, 
  FaYoutube, 
  FaGithub, 
  FaTwitter, 
  FaInstagram, 
  FaFacebook,
  FaLinkedin,
  FaRss,
  FaGlobe
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { SiDevdotto, SiMedium } from "react-icons/si";

export type FeedPlatform = 
  | "reddit" 
  | "youtube" 
  | "github" 
  | "twitter" 
  | "instagram" 
  | "facebook"
  | "linkedin"
  | "devto"
  | "medium"
  | "rss"
  | "default";

export function detectFeedPlatform(url: string): FeedPlatform {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check for specific platforms by hostname (more precise)
    if (hostname.includes("reddit.com")) return "reddit";
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "youtube";
    if (hostname.includes("github.com")) return "github";
    if (hostname === "twitter.com" || hostname === "www.twitter.com" || hostname === "x.com" || hostname === "www.x.com") return "twitter";
    if (hostname.includes("instagram.com")) return "instagram";
    if (hostname.includes("facebook.com") || hostname.includes("fb.com")) return "facebook";
    if (hostname.includes("linkedin.com")) return "linkedin";
    if (hostname.includes("dev.to")) return "devto";
    if (hostname.includes("medium.com")) return "medium";
    
    // Check for RSS/Atom feeds in the URL path
    const pathname = urlObj.pathname.toLowerCase();
    if (pathname.includes(".rss") || pathname.includes("/feed") || pathname.includes("/atom") || pathname.includes(".atom")) return "rss";
    
    return "default";
  } catch (error) {
    // If URL parsing fails, fallback to simple string matching
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes(".rss") || lowerUrl.includes("/feed") || lowerUrl.includes("/atom")) return "rss";
    return "default";
  }
}

interface FeedIconProps {
  url: string;
  size?: number;
  className?: string;
}

export function FeedIcon({ url, size = 16, className = "" }: FeedIconProps) {
  const platform = detectFeedPlatform(url);
  
  const iconClasses = `inline-block ${className}`;
  const iconSize = size;
  
  switch (platform) {
    case "reddit":
      return <FaReddit className={iconClasses} size={iconSize} style={{ color: "#FF4500" }} />;
    case "youtube":
      return <FaYoutube className={iconClasses} size={iconSize} style={{ color: "#FF0000" }} />;
    case "github":
      return <FaGithub className={iconClasses} size={iconSize} style={{ color: "#181717" }} />;
    case "twitter":
      return <FaXTwitter className={iconClasses} size={iconSize} style={{ color: "#000000" }} />;
    case "instagram":
      return <FaInstagram className={iconClasses} size={iconSize} style={{ color: "#E4405F" }} />;
    case "facebook":
      return <FaFacebook className={iconClasses} size={iconSize} style={{ color: "#1877F2" }} />;
    case "linkedin":
      return <FaLinkedin className={iconClasses} size={iconSize} style={{ color: "#0A66C2" }} />;
    case "devto":
      return <SiDevdotto className={iconClasses} size={iconSize} style={{ color: "#0A0A0A" }} />;
    case "medium":
      return <SiMedium className={iconClasses} size={iconSize} style={{ color: "#000000" }} />;
    case "rss":
      return <FaRss className={iconClasses} size={iconSize} style={{ color: "#FFA500" }} />;
    default:
      return <FaGlobe className={iconClasses} size={iconSize} />;
  }
}


