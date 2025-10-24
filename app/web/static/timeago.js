// Time ago functionality - shows relative time (há 2 horas, há 3 dias)
(function() {
    'use strict';
    
    // Portuguese translations
    const LOCALE = {
        justNow: 'agora',
        minutesAgo: (n) => n === 1 ? 'há 1 minuto' : `há ${n} minutos`,
        hoursAgo: (n) => n === 1 ? 'há 1 hora' : `há ${n} horas`,
        daysAgo: (n) => n === 1 ? 'há 1 dia' : `há ${n} dias`,
        weeksAgo: (n) => n === 1 ? 'há 1 semana' : `há ${n} semanas`,
        monthsAgo: (n) => n === 1 ? 'há 1 mês' : `há ${n} meses`,
        yearsAgo: (n) => n === 1 ? 'há 1 ano' : `há ${n} anos`
    };
    
    function timeAgo(date) {
        if (!date) return '';
        
        // Parse date string or use Date object
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return '';
        
        const now = new Date();
        const diffMs = now - dateObj;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);
        
        if (diffSecs < 60) return LOCALE.justNow;
        if (diffMins < 60) return LOCALE.minutesAgo(diffMins);
        if (diffHours < 24) return LOCALE.hoursAgo(diffHours);
        if (diffDays < 7) return LOCALE.daysAgo(diffDays);
        if (diffWeeks < 4) return LOCALE.weeksAgo(diffWeeks);
        if (diffMonths < 12) return LOCALE.monthsAgo(diffMonths);
        return LOCALE.yearsAgo(diffYears);
    }
    
    function updateTimeAgoElements() {
        const elements = document.querySelectorAll('[data-timeago]');
        elements.forEach(el => {
            const dateStr = el.getAttribute('data-timeago');
            const tooltip = el.getAttribute('data-full-date');
            const relative = timeAgo(dateStr);
            
            if (relative) {
                el.textContent = relative;
                if (tooltip) {
                    el.setAttribute('title', tooltip);
                }
            }
        });
    }
    
    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateTimeAgoElements);
    } else {
        updateTimeAgoElements();
    }
    
    // Update every minute
    setInterval(updateTimeAgoElements, 60000);
    
    // Expose function globally for manual use
    window.timeAgo = timeAgo;
})();

