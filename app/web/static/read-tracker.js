// Read article tracking functionality
(function() {
    'use strict';
    
    const STORAGE_KEY = 'pablo_feeds_read_articles';
    const MAX_ARTICLES = 10000; // Prevent localStorage from getting too large
    
    // Get read articles from localStorage
    function getReadArticles() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch (e) {
            console.error('[ReadTracker] Error reading localStorage:', e);
            return new Set();
        }
    }
    
    // Save read articles to localStorage
    function saveReadArticles(readSet) {
        try {
            // Limit size to prevent localStorage issues
            const articles = Array.from(readSet).slice(-MAX_ARTICLES);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
        } catch (e) {
            console.error('[ReadTracker] Error saving to localStorage:', e);
        }
    }
    
    // Mark article as read
    function markAsRead(articleId) {
        const readSet = getReadArticles();
        readSet.add(articleId);
        saveReadArticles(readSet);
        updateVisualState(articleId);
    }
    
    // Check if article is read
    function isRead(articleId) {
        return getReadArticles().has(articleId);
    }
    
    // Update visual state of an article
    function updateVisualState(articleId) {
        const card = document.querySelector(`[data-article-id="${articleId}"]`);
        if (card) {
            card.classList.add('read');
        }
    }
    
    // Initialize read state on page load
    function initializeReadStates() {
        const cards = document.querySelectorAll('[data-article-id]');
        const readSet = getReadArticles();
        
        cards.forEach(card => {
            const articleId = card.getAttribute('data-article-id');
            if (readSet.has(articleId)) {
                card.classList.add('read');
            }
        });
    }
    
    // Track clicks on article links
    function trackClicks() {
        document.addEventListener('click', function(e) {
            const link = e.target.closest('h3 a');
            if (link) {
                const card = link.closest('[data-article-id]');
                if (card) {
                    const articleId = card.getAttribute('data-article-id');
                    markAsRead(articleId);
                }
            }
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initializeReadStates();
            trackClicks();
        });
    } else {
        initializeReadStates();
        trackClicks();
    }
    
    // Expose API globally
    window.readTracker = {
        markAsRead: markAsRead,
        isRead: isRead,
        getReadArticles: getReadArticles
    };
})();

