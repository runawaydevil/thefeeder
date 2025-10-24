// View toggle functionality (Cards ↔ List)
(function() {
    'use strict';
    
    console.log('[ViewToggle] Script loaded');
    
    const VIEW_KEY = 'pablo_feeds_view';
    const VIEW_CARDS = 'cards';
    const VIEW_LIST = 'list';
    
    // Get current view from localStorage or default to cards
    let currentView = localStorage.getItem(VIEW_KEY) || VIEW_CARDS;
    console.log('[ViewToggle] Current view:', currentView);
    
    // Icon mapping for feeds
    const feedIcons = {
        'youtube': '📺',
        'github': '💻',
        'reddit': '🔴',
        'dev.to': '💜',
        'hnrss': '🍊',
        'hackernews': '🍊',
        'default': '📰'
    };
    
    // Detect feed icon from feed name
    function getFeedIcon(feedName) {
        const name = feedName.toLowerCase();
        if (name.includes('youtube')) return feedIcons.youtube;
        if (name.includes('github')) return feedIcons.github;
        if (name.includes('reddit')) return feedIcons.reddit;
        if (name.includes('dev.to') || name.includes('devto')) return feedIcons['dev.to'];
        if (name.includes('hacker') || name.includes('hn')) return feedIcons.hnrss;
        return feedIcons.default;
    }
    
    // Add icons to list view cards
    function addIconsToListView() {
        document.querySelectorAll('.list-view .card').forEach(card => {
            const feedName = card.querySelector('.feed')?.textContent?.trim();
            if (feedName && !card.querySelector('.card-icon')) {
                const icon = document.createElement('span');
                icon.className = 'card-icon';
                icon.textContent = getFeedIcon(feedName);
                const titleLink = card.querySelector('h3 a');
                if (titleLink) {
                    titleLink.insertBefore(icon, titleLink.firstChild);
                }
            }
        });
    }
    
    // Apply view
    function applyView(view) {
        console.log('[ViewToggle] Applying view:', view);
        const body = document.body;
        
        if (view === VIEW_LIST) {
            body.classList.add('list-view');
            console.log('[ViewToggle] Added list-view class');
            addIconsToListView();
        } else {
            body.classList.remove('list-view');
            console.log('[ViewToggle] Removed list-view class');
        }
        
        console.log('[ViewToggle] Body classes:', body.classList.toString());
        currentView = view;
        localStorage.setItem(VIEW_KEY, view);
    }
    
    // Create view toggle button
    function createViewToggle() {
        const headerRight = document.querySelector('.header-right');
        console.log('[ViewToggle] Header found:', headerRight ? 'yes' : 'no');
        if (!headerRight) return;
        
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'view-toggle-container';
        
        const cardsBtn = document.createElement('button');
        cardsBtn.className = 'view-toggle';
        cardsBtn.innerHTML = '☐ Cards';
        cardsBtn.setAttribute('aria-label', 'Cards view');
        cardsBtn.dataset.view = VIEW_CARDS;
        
        const listBtn = document.createElement('button');
        listBtn.className = 'view-toggle';
        listBtn.innerHTML = '☰ List';
        listBtn.setAttribute('aria-label', 'List view');
        listBtn.dataset.view = VIEW_LIST;
        
        function updateButtons() {
            const current = localStorage.getItem(VIEW_KEY) || VIEW_CARDS;
            if (current === VIEW_CARDS) {
                cardsBtn.classList.add('active');
                listBtn.classList.remove('active');
            } else {
                listBtn.classList.add('active');
                cardsBtn.classList.remove('active');
            }
        }
        
        updateButtons();
        
        cardsBtn.addEventListener('click', () => {
            applyView(VIEW_CARDS);
            updateButtons();
        });
        
        listBtn.addEventListener('click', () => {
            applyView(VIEW_LIST);
            updateButtons();
        });
        
        buttonsContainer.appendChild(cardsBtn);
        buttonsContainer.appendChild(listBtn);
        headerRight.appendChild(buttonsContainer);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            applyView(currentView);
            createViewToggle();
        });
    } else {
        applyView(currentView);
        createViewToggle();
    }
})();

