// Source icon resolver for legacy templates
(function() {
  'use strict';
  
  const SOCIAL_MAP = {
    'youtube.com': 'youtube',
    'youtu.be': 'youtube',
    'x.com': 'twitter',
    'twitter.com': 'twitter',
    'instagram.com': 'instagram',
    'facebook.com': 'facebook',
    'fb.com': 'facebook',
    'linkedin.com': 'linkedin',
    'tiktok.com': 'tiktok',
    'reddit.com': 'reddit',
    'medium.com': 'medium',
    'substack.com': 'substack',
    'spotify.com': 'spotify',
    'podcasts.apple.com': 'applepodcasts',
    'github.com': 'github',
    'stackoverflow.com': 'stackoverflow'
  };
  
  function resolve(host) {
    for (const k in SOCIAL_MAP) {
      if (host.endsWith(k)) {
        return ['social', SOCIAL_MAP[k]];
      }
    }
    return ['rss', null];
  }
  
  // RSS icon SVG inline
  const RSS_ICON_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>';
  
  function populateIcons() {
    document.querySelectorAll('.card[data-source-url]').forEach(function(el) {
      try {
        const url = new URL(el.dataset.sourceUrl);
        const host = url.hostname.replace(/^www\./, '');
        const [type, name] = resolve(host);
        const iconEl = el.querySelector('.source-icon');
        
        if (!iconEl) return;
        
        if (type === 'social') {
          iconEl.innerHTML = '<img src="https://cdn.simpleicons.org/' + name + '" width="20" height="20" alt="' + name + '" aria-hidden="true">';
        } else {
          iconEl.innerHTML = RSS_ICON_SVG;
        }
      } catch (e) {
        console.warn('Failed to resolve icon for:', el.dataset.sourceUrl);
      }
    });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', populateIcons);
  } else {
    populateIcons();
  }
})();

