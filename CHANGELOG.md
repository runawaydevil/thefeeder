# CHANGELOG - Pablo Feeds

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.0.2] - 2025-01-15

### Added
- **List View Toggle**: Switch between Cards and compact List view with feed icons
- **Feed Icons**: Automatic icon detection for popular feeds (YouTube 📺, GitHub 💻, Reddit 🔴, Dev.to 💜, Hacker News 🍊)
- **Improved Link Colors**: Better color scheme for links throughout the application
- **View Persistence**: List view preference saved in localStorage

### Changed
- Updated link colors from default blue to slate blue (#2c5282) for better aesthetics
- Dark mode links use light blue (#5dade2) for better contrast
- Footer links match new color scheme

### Files Modified
- `app/__init__.py` - Version updated to 0.0.2
- `app/web/templates/base.html` - Added view-toggle.js script
- `app/web/static/styles.css` - Updated link colors and added list view styles
- `app/web/static/view-toggle.js` - New file for view toggle functionality
- `README.md` - Updated version and features
- `CHANGELOG.md` - Reformatted changelog

---

## [0.0.1] - 2025-01-10

### Added
- **UX Improvements (Phase 1 & 2):**
    - Enhanced visual pagination with interactive buttons, hover effects, and page indicators
    - Full-text search functionality across article titles, summaries, and authors
    - Customizable sorting options: "Most recent", "Oldest", "Title (A-Z)", "By feed"
    - Relative time display ("X minutes ago") for article publication dates
    - Article read tracking using browser `localStorage` with visual indicators (checkmark, opacity)
    - Contextual empty states with helpful messages and suggested actions
    - Improved image handling with lazy loading, error placeholders, and a default camera emoji
    - Comprehensive accessibility (WCAG AA) features: skip link, ARIA roles, improved focus states, language attribute
    - Visual status indicators (badges) for feed health (success, error, warning, pending) with tooltips
- **CI/CD:**
    - GitHub Actions workflow (`.github/workflows/build.yml`) for automated linting and build checks
    - GitHub Actions workflow (`.github/workflows/docker-publish.yml`) for automated Docker image building and publishing to Docker Hub and GitHub Container Registry
- **Security:**
    - Input validation and sanitization for query parameters (`feed_id`, `search`, `sort`)
    - Implementation of HTTP security headers via middleware (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`)
    - Enhanced validation for admin endpoints (`/admin/refresh`)
    - `SECURITY.md` document detailing security measures
    - `PRODUCTION.md` document with production deployment guidelines
- **Project Management:**
    - `VERSION.md` to centralize version information
    - `RELEASE.md` with a step-by-step guide for creating new releases
    - `.gitconfig.example` for configuring multiple Git remotes
    - `app/__init__.py` to define `__version__`
- **Internationalization:**
    - Default language set to English
    - All user-facing texts in templates and JavaScript translated to English
- **Docker:**
    - Added `curl` to `Dockerfile` for robust health checks
- **Limits:**
    - Maximum 150 feeds supported
    - Maximum 1500 articles stored with automatic cleanup of oldest items
    - View toggle functionality

### Changed
- `README.md`: Updated with version, repository links (GitHub and Forgejo), and detailed UX features
- `app/web/server.py`: Integrated `__version__` and added security middleware, input validation, and search/sort logic
- `app/core/storage.py`: Modified `get_items` and `get_items_count` to support search and sorting. Added `get_feed_status_dict`. Added automatic cleanup of oldest articles
- `app/core/config.py`: Updated `MAX_FEEDS` to 150, added `MAX_ITEMS` for article limits
- `app/web/static/styles.css`: Updated CSS for pagination, search input, read articles, empty states, image handling, accessibility, feed status badges, mobile responsiveness
- `app/web/templates/index.html`: Updated for search, sort, pagination, timeago, read tracking, empty states, image handling, and feed status
- `app/web/templates/base.html`: Updated for accessibility (lang, ARIA roles) and script inclusions
- `app/web/static/theme.js`: Modified to default to 'light' theme and removed system preference detection
- `Dockerfile`: Added `curl` to system dependencies
- `.gitignore`: Added new documentation files and temporary files

### Removed
- `@media (prefers-color-scheme: dark)` rule from `styles.css` to enforce light theme by default
- System theme preference detection from `theme.js`
- Skip link from interface (accessibility link removed per user request)
- Unused imports across several Python files (`app/core/fetcher.py`, `app/core/parser.py`, `app/core/scheduler.py`, `app/core/storage.py`, `app/main.py`, `app/web/server.py`)
