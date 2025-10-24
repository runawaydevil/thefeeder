// Theme toggle functionality
// Theme preference is stored in browser localStorage (per-user, per-browser)
// Using namespaced key 'pablo_feeds_theme' to avoid conflicts with other apps
(function() {
    // Use a namespaced key to avoid conflicts
    const THEME_KEY = 'pablo_feeds_theme';
    
    // Get current theme from localStorage or default to light (white)
    const currentTheme = localStorage.getItem(THEME_KEY) || 'light';
    
    // Debug logging (can be removed in production)
    console.log('[Theme] Current theme from localStorage:', currentTheme);
    
    // Apply theme
    function applyTheme(theme) {
        console.log('[Theme] Applying theme:', theme);
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            // Remove attribute to use default :root styles (white)
            document.documentElement.removeAttribute('data-theme');
        }
    }
    
    // Initialize theme
    applyTheme(currentTheme);
    
    // Create theme toggle button
    function createThemeToggle() {
        const headerRight = document.querySelector('.header-right');
        if (!headerRight) return;
        
        const toggle = document.createElement('button');
        toggle.className = 'theme-toggle';
        toggle.setAttribute('aria-label', 'Toggle theme');
        
        // Set initial icon based on current theme
        function updateIcon() {
            const theme = localStorage.getItem(THEME_KEY) || 'light';
            if (theme === 'dark') {
                toggle.textContent = '☀️';
                toggle.title = 'Switch to light mode';
            } else {
                toggle.textContent = '🌙';
                toggle.title = 'Switch to dark mode';
            }
        }
        
        updateIcon();
        
        // Toggle theme on click
        toggle.addEventListener('click', function() {
            const theme = localStorage.getItem(THEME_KEY) || 'light';
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            
            console.log('[Theme] User toggled theme from', theme, 'to', newTheme);
            localStorage.setItem(THEME_KEY, newTheme);
            applyTheme(newTheme);
            updateIcon();
        });
        
        headerRight.appendChild(toggle);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createThemeToggle);
    } else {
        createThemeToggle();
    }
})();

