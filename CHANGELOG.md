# CHANGELOG - TheFeeder

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.0.2] - 2025-10-31

### Added
- **Pagination System**: Display up to 600 articles per page with navigation controls
  - Pagination component with Previous/Next buttons
  - Shows current page and total pages
  - Displays article count range (e.g., "Showing 1-600 of 1234 articles")
- **OPML Export**: Admin dashboard can export all active feeds as OPML format
  - New API endpoint `/api/feeds/export/opml`
  - Export button in FeedsManager component
  - Compatible with standard feed readers (Feedly, Inoreader, etc.)
- **Enhanced YouTube Support**: Complete support for all YouTube URL formats
  - Support for `@username` format (e.g., `@channelname`)
  - Support for `/user/USERNAME` format
  - Support for `/c/CHANNELNAME` custom URLs
  - Automatic channel ID extraction from channel pages
  - Channel title detection for better feed names
- **Admin Notifications**: Pending subscriber count badge
  - Real-time counter on "Subscribers" button in admin dashboard
  - Automatic polling every 30 seconds
  - Visual badge with neon cyan styling
  - Updates immediately after subscriber actions

### Changed
- **Email Digest**: Limited to 20 most recent articles (down from 50)
  - Only sends top 20 articles from last 24 hours
  - Reduces email size and improves readability
- **Article Display**: Increased from 20 to 600 articles per page
  - New articles always appear first (most recent)
  - Footer shows real total count from database
  - Pagination automatically appears when total > 600
- **UI Improvements**:
  - Removed distracting neon cyan borders from empty states
  - Improved article title legibility (white text with soft glow)
  - Removed harsh neon pink from article card titles
- **Docker Configuration**:
  - Fixed Prisma seed execution with tsx
  - Improved entrypoint scripts with multiple fallbacks
  - Better error handling and logging

### Fixed
- **Prisma Seed**: Fixed "tsx not found" error in Docker containers
  - Install tsx as production dependency before npm prune
  - Multiple fallback methods for seed execution
  - Absolute path fallback if npx fails
- **Feed Deletion**: Fixed cascade delete for feeds and associated items
  - Added `onDelete: Cascade` to Item model
  - Improved error handling and user feedback
- **TypeScript Compatibility**: Fixed null/undefined type mismatches
  - Proper conversion from Prisma null to undefined
  - Fixed TypeScript errors in server-data.ts

### Technical
- **Dockerfile**: Consolidated to single root Dockerfile
  - Multi-stage builds for web and worker
  - Proper OpenSSL installation for Prisma
  - Improved dependency management
- **Email Configuration**: Mailgun SMTP integration
  - Production-ready email service
  - Secure credentials in .env

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
