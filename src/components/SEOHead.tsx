import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website'
}) => {
  // Get SEO configuration from environment variables with fallbacks
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://your-domain.com';
  const siteTitle = title || import.meta.env.VITE_SITE_TITLE || "Pablo's RSS Magazine - Modern RSS Reader";
  const siteDescription = description || import.meta.env.VITE_SITE_DESCRIPTION || 'A modern, responsive RSS magazine that automatically fetches and displays articles from FreshRSS feeds with intelligent feed diversity management and beautiful magazine-style layout.';
  const siteKeywords = keywords || import.meta.env.VITE_SITE_KEYWORDS || 'RSS, news, articles, magazine, FreshRSS, feed reader, Pablo Murad, modern RSS, responsive design';
  const siteAuthor = import.meta.env.VITE_SITE_AUTHOR || 'Pablo Murad';
  const siteImage = image || import.meta.env.VITE_SITE_IMAGE || `${siteUrl}/og-image.jpg`;
  const twitterHandle = import.meta.env.VITE_TWITTER_HANDLE || '@runawaydevil';
  const facebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID;
  const siteLocale = import.meta.env.VITE_SITE_LOCALE || 'en_US';
  const currentUrl = url || siteUrl;

  useEffect(() => {
    // Update document title
    document.title = siteTitle;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, property?: boolean) => {
      const attribute = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    };

    // Standard SEO meta tags
    updateMetaTag('description', siteDescription);
    updateMetaTag('keywords', siteKeywords);
    updateMetaTag('author', siteAuthor);
    updateMetaTag('robots', 'index, follow');
    updateMetaTag('viewport', 'width=device-width, initial-scale=1.0');

    // Open Graph meta tags (Facebook, LinkedIn, etc.)
    updateMetaTag('og:title', siteTitle, true);
    updateMetaTag('og:description', siteDescription, true);
    updateMetaTag('og:image', siteImage, true);
    updateMetaTag('og:url', currentUrl, true);
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:site_name', import.meta.env.VITE_APP_NAME || "Pablo's RSS Magazine", true);
    updateMetaTag('og:locale', siteLocale, true);

    // Twitter Card meta tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', siteTitle);
    updateMetaTag('twitter:description', siteDescription);
    updateMetaTag('twitter:image', siteImage);
    updateMetaTag('twitter:creator', twitterHandle);
    updateMetaTag('twitter:site', twitterHandle);

    // Facebook App ID (if provided)
    if (facebookAppId) {
      updateMetaTag('fb:app_id', facebookAppId, true);
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', currentUrl);

    // Language attribute
    document.documentElement.setAttribute('lang', siteLocale.split('_')[0]);

  }, [siteTitle, siteDescription, siteKeywords, siteAuthor, siteImage, twitterHandle, facebookAppId, siteLocale, currentUrl, type]);

  // Add structured data (JSON-LD)
  useEffect(() => {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": import.meta.env.VITE_APP_NAME || "Pablo's RSS Magazine",
      "description": siteDescription,
      "url": siteUrl,
      "author": {
        "@type": "Person",
        "name": siteAuthor,
        "url": "https://github.com/runawaydevil"
      },
      "publisher": {
        "@type": "Organization",
        "name": import.meta.env.VITE_APP_NAME || "Pablo's RSS Magazine",
        "logo": {
          "@type": "ImageObject",
          "url": `${siteUrl}/logo.png`
        }
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${siteUrl}/?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    };

    // Remove existing structured data
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

  }, [siteUrl, siteDescription, siteAuthor]);

  // This component doesn't render anything visible
  return null;
};

export default SEOHead;