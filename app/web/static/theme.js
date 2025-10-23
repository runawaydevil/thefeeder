// Theme toggle functionality
(function() {
    // Get current theme from localStorage or default to system preference
    const currentTheme = localStorage.getItem('theme') || 'system';
    
    // Apply theme
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
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
            const theme = localStorage.getItem('theme') || 'system';
            if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
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
            const theme = localStorage.getItem('theme') || 'system';
            let newTheme;
            
            if (theme === 'system') {
                newTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark';
            } else if (theme === 'dark') {
                newTheme = 'light';
            } else {
                newTheme = 'dark';
            }
            
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
            updateIcon();
        });
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
            if (localStorage.getItem('theme') === 'system') {
                applyTheme('system');
                updateIcon();
            }
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

